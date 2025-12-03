/**
 * Enhanced logging utility for API requests
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

interface LogContext {
    requestId?: string
    method?: string
    url?: string
    ip?: string
    userAgent?: string
    [key: string]: any
}

class Logger {
    private readonly enabledLevels: Set<LogLevel>

    constructor() {
        const logLevel = process.env.LOG_LEVEL || 'INFO'
        this.enabledLevels = this.getEnabledLevels(logLevel)
    }

    private getEnabledLevels(level: string): Set<LogLevel> {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
        const startIndex = levels.findIndex(l => l === level.toUpperCase())
        
        if (startIndex === -1) {
            return new Set([LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR])
        }
        
        return new Set(levels.slice(startIndex))
    }

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString()
        const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
        return `[${timestamp}] [${level}] ${message}${contextStr}`
    }

    private shouldLog(level: LogLevel): boolean {
        return this.enabledLevels.has(level)
    }

    debug(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.formatMessage(LogLevel.DEBUG, message, context))
        }
    }

    info(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.formatMessage(LogLevel.INFO, message, context))
        }
    }

    warn(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage(LogLevel.WARN, message, context))
        }
    }

    error(message: string, error?: Error | unknown, context?: LogContext): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            const errorContext = {
                ...context,
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                } : error,
            }
            console.error(this.formatMessage(LogLevel.ERROR, message, errorContext))
        }
    }

    /**
     * Log API request details
     */
    logRequest(request: Request, additionalContext?: Record<string, any>): string {
        const requestId = crypto.randomUUID()
        const url = new URL(request.url)
        
        const context: LogContext = {
            requestId,
            method: request.method,
            url: url.pathname + url.search,
            ip: this.getClientIp(request),
            userAgent: request.headers.get('user-agent') || 'unknown',
            ...additionalContext,
        }

        this.info('Incoming request', context)
        return requestId
    }

    /**
     * Log API response details
     */
    logResponse(
        requestId: string,
        status: number,
        duration: number,
        additionalContext?: Record<string, any>
    ): void {
        const context: LogContext = {
            requestId,
            status,
            duration: `${duration}ms`,
            ...additionalContext,
        }

        if (status >= 500) {
            this.error('Request failed with server error', undefined, context)
        } else if (status >= 400) {
            this.warn('Request failed with client error', context)
        } else {
            this.info('Request completed', context)
        }
    }

    private getClientIp(request: Request): string {
        const forwardedFor = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const cfConnectingIp = request.headers.get('cf-connecting-ip')
        
        return cfConnectingIp || realIp || forwardedFor?.split(',')[0].trim() || 'unknown'
    }
}

// Export singleton instance
export const logger = new Logger()

/**
 * Wrapper function to log API handler execution
 */
export async function withLogging<T>(
    request: Request,
    handler: (requestId: string) => Promise<T>,
    context?: Record<string, any>
): Promise<T> {
    const requestId = logger.logRequest(request, context)
    const startTime = Date.now()

    try {
        const result = await handler(requestId)
        const duration = Date.now() - startTime
        
        // Determine status from result if it's a Response
        const status = result instanceof Response ? result.status : 200
        logger.logResponse(requestId, status, duration)
        
        return result
    } catch (error) {
        const duration = Date.now() - startTime
        logger.error('Request handler error', error, { requestId, duration: `${duration}ms` })
        throw error
    }
}
