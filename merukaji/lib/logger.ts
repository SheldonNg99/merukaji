type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// Define a more specific type instead of using 'any'
interface LogData {
    [key: string]: string | number | boolean | null | undefined | Date |
    Record<string, unknown> | Array<unknown> | Error;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    'DEBUG': 0,
    'INFO': 1,
    'WARN': 2,
    'ERROR': 3
};

// Default to INFO in production, DEBUG in development
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG';

/**
 * Simple logger function that outputs structured logs
 */
export function log(level: LogLevel, message: string, data: LogData = {}) {
    // Skip logging if level is below current log level
    if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LOG_LEVEL as LogLevel]) {
        return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...data,
    };

    // Format based on log level
    switch (level) {
        case 'ERROR':
            console.error(JSON.stringify(logEntry));
            break;
        case 'WARN':
            console.warn(JSON.stringify(logEntry));
            break;
        case 'INFO':
            console.info(JSON.stringify(logEntry));
            break;
        case 'DEBUG':
            console.debug(JSON.stringify(logEntry));
            break;
    }
}

// Convenience methods
export const logger = {
    debug: (message: string, data?: LogData) => log('DEBUG', message, data),
    info: (message: string, data?: LogData) => log('INFO', message, data),
    warn: (message: string, data?: LogData) => log('WARN', message, data),
    error: (message: string, data?: LogData) => log('ERROR', message, data),
};