type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function emit(entry: LogEntry) {
  const output = JSON.stringify(entry);
  if (entry.level === 'error') {
    console.error(output);
  } else if (entry.level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) emit({ level: 'debug', message, timestamp: new Date().toISOString(), context });
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) emit({ level: 'info', message, timestamp: new Date().toISOString(), context });
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) emit({ level: 'warn', message, timestamp: new Date().toISOString(), context });
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (shouldLog('error')) {
      const errorInfo = error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { errorValue: String(error) };
      emit({ level: 'error', message, timestamp: new Date().toISOString(), context: { ...errorInfo, ...context } });
    }
  },
};
