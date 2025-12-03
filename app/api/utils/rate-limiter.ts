/**
 * Simple in-memory rate limiter using sliding window algorithm
 */

interface RateLimitEntry {
    timestamps: number[]
}

class RateLimiter {
    private requests: Map<string, RateLimitEntry> = new Map()
    private readonly windowMs: number
    private readonly maxRequests: number

    constructor(windowMs: number = 60000, maxRequests: number = 60) {
        this.windowMs = windowMs
        this.maxRequests = maxRequests
        
        // Clean up old entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }

    /**
     * Check if a request should be rate limited
     * @param identifier - Unique identifier (e.g., IP address, user ID)
     * @returns Object with allowed status and remaining requests
     */
    check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
        const now = Date.now()
        const entry = this.requests.get(identifier) || { timestamps: [] }

        // Remove timestamps outside the current window
        entry.timestamps = entry.timestamps.filter(
            timestamp => now - timestamp < this.windowMs
        )

        const allowed = entry.timestamps.length < this.maxRequests
        const remaining = Math.max(0, this.maxRequests - entry.timestamps.length - (allowed ? 1 : 0))
        const oldestTimestamp = entry.timestamps[0] || now
        const resetAt = oldestTimestamp + this.windowMs

        if (allowed) {
            entry.timestamps.push(now)
            this.requests.set(identifier, entry)
        }

        return { allowed, remaining, resetAt }
    }

    /**
     * Clean up old entries to prevent memory leaks
     */
    private cleanup(): void {
        const now = Date.now()
        for (const [identifier, entry] of this.requests.entries()) {
            entry.timestamps = entry.timestamps.filter(
                timestamp => now - timestamp < this.windowMs
            )
            if (entry.timestamps.length === 0) {
                this.requests.delete(identifier)
            }
        }
    }

    /**
     * Reset rate limit for a specific identifier
     */
    reset(identifier: string): void {
        this.requests.delete(identifier)
    }

    /**
     * Get current request count for an identifier
     */
    getCount(identifier: string): number {
        const now = Date.now()
        const entry = this.requests.get(identifier)
        if (!entry) return 0

        return entry.timestamps.filter(
            timestamp => now - timestamp < this.windowMs
        ).length
    }
}

// Create rate limiter instances for different endpoints
export const ttsRateLimiter = new RateLimiter(60000, 60) // 60 requests per minute
export const voicesRateLimiter = new RateLimiter(60000, 30) // 30 requests per minute

/**
 * Get client identifier from request (IP address or forwarded IP)
 */
export function getClientIdentifier(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')
    
    return cfConnectingIp || realIp || forwardedFor?.split(',')[0].trim() || 'unknown'
}

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(
    request: Request,
    limiter: RateLimiter
): { allowed: boolean; headers: Record<string, string>; error?: string } {
    const identifier = getClientIdentifier(request)
    const { allowed, remaining, resetAt } = limiter.check(identifier)

    const headers = {
        'X-RateLimit-Limit': limiter['maxRequests'].toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetAt).toISOString(),
    }

    if (!allowed) {
        return {
            allowed: false,
            headers,
            error: 'Rate limit exceeded. Please try again later.'
        }
    }

    return { allowed: true, headers }
}
