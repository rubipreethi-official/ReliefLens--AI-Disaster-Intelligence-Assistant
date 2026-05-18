/// <reference types="vite/client" />
/**
 * logger.ts
 *
 * Structured logger utility for ReliefLens.
 * Replaces all console.log calls per the README coding rules.
 * In production builds, only 'warn' and 'error' levels emit output.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev = import.meta.env.DEV

function formatPrefix(level: LogLevel, context?: string): string {
  const tag = context ? `[ReliefLens:${context}]` : '[ReliefLens]'
  return `${tag} ${level.toUpperCase()}:`
}

function log(level: LogLevel, context: string | undefined, ...args: unknown[]): void {
  const prefix = formatPrefix(level, context)

  // In production, suppress debug and info to reduce noise
  if (!isDev && (level === 'debug' || level === 'info')) return

  switch (level) {
    case 'debug': console.debug(prefix, ...args); break
    case 'info':  console.info(prefix, ...args);  break
    case 'warn':  console.warn(prefix, ...args);  break
    case 'error': console.error(prefix, ...args); break
  }
}

/** Create a namespaced logger for a specific module */
export function createLogger(context: string) {
  return {
    debug: (...args: unknown[]) => log('debug', context, ...args),
    info:  (...args: unknown[]) => log('info',  context, ...args),
    warn:  (...args: unknown[]) => log('warn',  context, ...args),
    error: (...args: unknown[]) => log('error', context, ...args),
  }
}

/** Default logger (no context) */
export const logger = createLogger('App')
