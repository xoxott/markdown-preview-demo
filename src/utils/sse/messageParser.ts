import type { SSE } from '@/typings/sse';

/**
 * Parse SSE message from raw data string
 *
 * Handles both single and double-encoded JSON formats:
 * - Single: {"type":"data","data":{...}}
 * - Double: {"data":"{\"type\":\"data\",\"data\":{...}}"}
 *
 * @param rawData - Raw data string from SSE stream
 * @param connectionId - Connection ID for logging
 * @returns Parsed SSE message or null if parsing fails
 */
export function parseSSEMessage(
  rawData: string,
  connectionId: string
): SSE.SSEMessage | null {
  if (!rawData || !rawData.trim()) {
    return null;
  }

  try {
    let parsedData: any;

    try {
      parsedData = JSON.parse(rawData);
    } catch (parseErr) {
      // sseLogger.error(`Failed to parse JSON for "${connectionId}":`, parseErr, 'Raw data:', rawData);
      return null;
    }

    // Check if it's double-encoded JSON: {"data": "{\"type\":\"data\",...}"}
    if (
      parsedData &&
      typeof parsedData === 'object' &&
      parsedData.data &&
      typeof parsedData.data === 'string' &&
      !parsedData.type
    ) {
      // It's double-encoded, parse the inner JSON string
      // sseLogger.debug(`Detected double-encoded JSON for "${connectionId}", parsing inner data`);
      try {
        parsedData = JSON.parse(parsedData.data);
      } catch (innerParseErr) {
        // sseLogger.error(`Failed to parse inner JSON for "${connectionId}":`, innerParseErr);
        return null;
      }
    }

    // Ensure it's a valid SSE message
    if (parsedData && typeof parsedData === 'object' && parsedData.type) {
      return parsedData as SSE.SSEMessage;
    }

    // sseLogger.warn(`Invalid message format for "${connectionId}":`, parsedData, 'Expected object with type field');
    return null;
  } catch (err) {
    // sseLogger.error(`Failed to process message for "${connectionId}":`, err, 'Raw data:', rawData);
    return null;
  }
}


