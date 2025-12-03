import { EdgeTTSService } from "@/service/edge-tts-service"
import { TTSOptions } from "@/service/tts-service"
import { applyRateLimit, ttsRateLimiter } from "../utils/rate-limiter"
import { logger } from "../utils/logger"

// Force this route to be dynamic since it uses request headers
export const dynamic = 'force-dynamic'

Error.stackTraceLimit = Infinity

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

function jsonError(message: string, status: number = 400, additionalHeaders?: Record<string, string>): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders
        }
    })
}

function parseNumberParam(
    searchParams: URLSearchParams,
    paramName: string,
    defaultValue: number,
    min: number,
    max: number
): number {
    const paramValue = searchParams.get(paramName)

    if (paramValue === null || paramValue === undefined) {
        return defaultValue
    }

    const num = Number(paramValue)

    if (Number.isNaN(num)) {
        throw new Error(`Invalid ${paramName}: must be a number`)
    }

    if (num < min || num > max) {
        throw new Error(`Invalid ${paramName}: must be between ${min} and ${max}`)
    }

    return num
}

function parseRequiredParam(searchParams: URLSearchParams, paramName: string): string {
    const value = searchParams.get(paramName)

    if (!value || value.trim() === '') {
        throw new Error(`Missing required parameter: ${paramName}`)
    }

    return value
}

// ============ API Handler ============

export async function GET(request: Request) {
    const requestId = logger.logRequest(request, { endpoint: '/api/text-to-speech' })
    const startTime = Date.now()

    try {
        // Rate limiting
        const rateLimitResult = applyRateLimit(request, ttsRateLimiter)
        if (!rateLimitResult.allowed) {
            logger.warn('Rate limit exceeded', {
                requestId,
                endpoint: '/api/text-to-speech',
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
                endpoint: '/api/text-to-speech',
                error: authResult.error,
            })
            return jsonError(authResult.error || 'Unauthorized', 401, rateLimitResult.headers)
        }

        // Parse and validate parameters
        const { searchParams } = new URL(request.url)

        const text = parseRequiredParam(searchParams, 'text')
        const voice = parseRequiredParam(searchParams, 'voice')
        const pitch = parseNumberParam(searchParams, 'pitch', 0, -100, 100)
        const rate = parseNumberParam(searchParams, 'rate', 0, -100, 100)
        const volume = parseNumberParam(searchParams, 'volume', 100, 0, 100)
        const personality = searchParams.get('personality') || undefined

        logger.debug('TTS request parameters', {
            requestId,
            textLength: text.length,
            voice,
            pitch,
            rate,
            volume,
            personality,
        })

        // Validate text length
        if (text.length > 10000) {
            logger.warn('Text too long', {
                requestId,
                textLength: text.length,
                maxLength: 10000,
            })
            return jsonError('Text too long (max 10000 characters)', 400, rateLimitResult.headers)
        }

        // Convert text to speech
        logger.info('Starting TTS conversion', { requestId, voice })
        const service = new EdgeTTSService()
        const options: TTSOptions = {
            voice,
            volume,
            rate,
            pitch,
            personality,
        }

        const speech = await service.convert(text, options)
        const audioBlob = new Blob([speech.audio], { type: 'audio/mpeg' })

        const duration = Date.now() - startTime
        logger.info('TTS conversion successful', {
            requestId,
            audioSize: speech.audio.byteLength,
            duration: `${duration}ms`,
        })

        return new Response(audioBlob, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
                ...rateLimitResult.headers
            }
        })
    } catch (error) {
        const duration = Date.now() - startTime
        logger.error('Text-to-speech error', error, {
            requestId,
            endpoint: '/api/text-to-speech',
            duration: `${duration}ms`,
        })

        const message = error instanceof Error ? error.message : 'Internal server error'
        return jsonError(message, 500)
    }
}