export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  debug(message: string, data?: unknown) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: unknown) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data?: unknown) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, error?: unknown) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }
}

export const logger = new Logger();
