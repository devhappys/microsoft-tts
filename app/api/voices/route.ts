import { EdgeTTSService } from "@/service/edge-tts-service"
import { applyRateLimit, voicesRateLimiter } from "../utils/rate-limiter"
import { logger } from "../utils/logger"

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// ============ Utility Functions ============

function verifyBearerToken(request: Request): { authorized: boolean; error?: string } {
    const requiredToken = process.env.MS_RA_FORWARDER_TOKEN || process.env.TOKEN

    if (!requiredToken) {
        return { authorized: true }
    }

    const authorization = request.headers.get('authorization')

    if (!authorization) {
        return { authorized: false, error: 'Missing Authorization header' }
    }

    if (!authorization.startsWith('Bearer ')) {
        return { authorized: false, error: 'Invalid Authorization format. Expected: Bearer <token>' }
    }

    const token = authorization.substring(7)

    if (token !== requiredToken) {
        return { authorized: false, error: 'Invalid token' }
    }

    return { authorized: true }
}

function jsonResponse(data: any, status: number = 200, additionalHeaders?: Record<string, string>): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders
        }
    })
}

function jsonError(message: string, status: number = 400, additionalHeaders?: Record<string, string>): Response {
    return jsonResponse({ error: message }, status, additionalHeaders)
}

// ============ API Handler ============

export async function GET(request: Request) {
    const requestId = logger.logRequest(request, { endpoint: '/api/voices' })
    const startTime = Date.now()

    try {
        // Rate limiting
        const rateLimitResult = applyRateLimit(request, voicesRateLimiter)
        if (!rateLimitResult.allowed) {
            logger.warn('Rate limit exceeded', {
                requestId,
                endpoint: '/api/voices',
            })
            return jsonError(
                rateLimitResult.error || 'Rate limit exceeded',
                429,
                rateLimitResult.headers
            )
        }

        // Authentication
        const authResult = verifyBearerToken(request)
        if (!authResult.authorized) {
            logger.warn('Unauthorized access attempt', {
                requestId,
                endpoint: '/api/voices',
                error: authResult.error,
            })
            return jsonError(authResult.error || 'Unauthorized', 401, rateLimitResult.headers)
        }

        logger.debug('Fetching voices from Edge TTS service', { requestId })

        // Fetch voices from Edge TTS service
        const service = new EdgeTTSService()
        const voices = await service.fetchVoices()

        logger.info('Successfully fetched voices', {
            requestId,
            voiceCount: voices.length,
            duration: `${Date.now() - startTime}ms`,
        })

        // Return voices with rate limit headers
        return jsonResponse(
            {
                success: true,
                count: voices.length,
                voices: voices,
            },
            200,
            {
                ...rateLimitResult.headers,
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            }
        )
    } catch (error) {
        const duration = Date.now() - startTime
        logger.error('Failed to fetch voices', error, {
            requestId,
            endpoint: '/api/voices',
            duration: `${duration}ms`,
        })

        const message = error instanceof Error ? error.message : 'Internal server error'
        return jsonError(message, 500)
    }
}
