/**
 * SSE Logger Utility
 * 
 * Provides controlled logging for SSE operations
 * Logs are only enabled in development mode or when explicitly enabled
 */

const isDevelopment = import.meta.env.DEV;
const isSSEDebugEnabled = import.meta.env.VITE_SSE_DEBUG === 'true';

/**
 * Check if debug logging is enabled
 */
function isDebugEnabled(): boolean {
  return isDevelopment || isSSEDebugEnabled;
}

/**
 * SSE Logger
 */
export const sseLogger = {
  /**
   * Log debug information
   */
  debug: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.log('[SSE]', ...args);
    }
  },

  /**
   * Log information
   */
  info: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.log('[SSE]', ...args);
    }
  },

  /**
   * Log warnings
   */
  warn: (...args: any[]) => {
    console.warn('[SSE]', ...args);
  },

  /**
   * Log errors
   */
  error: (...args: any[]) => {
    console.error('[SSE]', ...args);
  }
};

