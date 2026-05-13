// ─────────────────────────────────────────────────────────────
// Structured CloudWatch logging for Lambda
// Formats logs for parsing by CloudWatch Insights
// ─────────────────────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  [key: string]: any;
}

class Logger {
  private logLevel: LogLevel;
  private context: LogContext = {};

  constructor() {
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    this.logLevel = envLevel || LogLevel.INFO;
  }

  /**
   * Set the current log level.
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Set persistent context for all subsequent logs.
   * Useful for request ID, user ID, etc.
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear the context.
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log at DEBUG level.
   */
  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(
        JSON.stringify({
          level: LogLevel.DEBUG,
          message,
          timestamp: new Date().toISOString(),
          ...this.context,
          ...(data && { data }),
        })
      );
    }
  }

  /**
   * Log at INFO level.
   */
  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(
        JSON.stringify({
          level: LogLevel.INFO,
          message,
          timestamp: new Date().toISOString(),
          ...this.context,
          ...(data && { data }),
        })
      );
    }
  }

  /**
   * Log at WARN level.
   */
  warn(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(
        JSON.stringify({
          level: LogLevel.WARN,
          message,
          timestamp: new Date().toISOString(),
          ...this.context,
          ...(data && { data }),
        })
      );
    }
  }

  /**
   * Log at ERROR level.
   * Automatically extracts stack trace if error is an Error object.
   */
  error(message: string, error?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData: Record<string, any> = {
        level: LogLevel.ERROR,
        message,
        timestamp: new Date().toISOString(),
        ...this.context,
      };

      if (error instanceof Error) {
        errorData.errorMessage = error.message;
        errorData.errorStack = error.stack;
        errorData.errorName = error.name;
      } else if (typeof error === 'object') {
        errorData.error = error;
      } else {
        errorData.error = String(error);
      }

      console.error(JSON.stringify(errorData));
    }
  }

  /**
   * Determine if a log level should be output.
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }
}

// Singleton instance
export const logger = new Logger();

