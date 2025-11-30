import type { SSE } from '@/typings/sse';
import { parseSSEMessage } from './messageParser';

/**
 * SSE Connection Manager
 *
 * Singleton pattern to manage all SSE connections
 * Supports connection pooling, auto-reconnect, event distribution
 */
class SSEManager {
  private static instance: SSEManager;
  private connections: Map<string, SSE.Connection> = new Map();
  private defaultConfig: Partial<SSE.ConnectionConfig> = {
    timeout: 30000,
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    withCredentials: false
  };

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  /**
   * Create or get SSE connection
   */
  connect(
    connectionId: string,
    config: SSE.ConnectionConfig
  ): SSE.Connection {
    // If connection already exists, increment ref count and return it
    if (this.connections.has(connectionId)) {
      const existing = this.connections.get(connectionId)!;
      existing.refCount++;
      // If connection is disconnected or in error state, reconnect it
      if (existing.status === 'disconnected' || existing.status === 'error') {
        this.createSSEConnection(existing);
      }
      return existing;
    }

    // Merge with default config
    const mergedConfig: SSE.ConnectionConfig = {
      ...this.defaultConfig,
      ...config
    };

    // Create connection object
    const connection: SSE.Connection = {
      id: connectionId,
      status: 'connecting',
      config: mergedConfig,
      listeners: new Map(),
      statusListeners: new Set(),
      reconnectAttempts: 0,
      refCount: 1 // Initial ref count
    };

    // Create SSE connection using fetch API
    this.createSSEConnection(connection);

    // Store connection
    this.connections.set(connectionId, connection);

    return connection;
  }

  /**
   * Create SSE connection using fetch API (supports custom headers)
   *
   * @param connection - SSE connection instance to establish
   */
  private async createSSEConnection(connection: SSE.Connection): Promise<void> {
    try {
      // Abort existing connection if any
      if (connection.abortController) {
        connection.abortController.abort();
      }

      connection.status = 'connecting';
      this.notifyStatusChange(connection, 'connecting');

      // Create AbortController for this connection
      const abortController = new AbortController();
      connection.abortController = abortController;

      // Prepare headers
      const headers = new Headers();
      headers.set('Accept', 'text/event-stream');
      headers.set('Cache-Control', 'no-cache');

      // Add custom headers from config
      if (connection.config.headers) {
        Object.entries(connection.config.headers).forEach(([key, value]) => {
          headers.set(key, value);
        });
      }

      // Make fetch request
      const response = await fetch(connection.config.url, {
        method: 'GET',
        headers,
        credentials: connection.config.withCredentials ? 'include' : 'same-origin',
        signal: abortController.signal
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired, wait for refresh
        if (response.status === 401) {
          // sseLogger.warn(`Connection "${connection.id}" received 401 Unauthorized, token may be expired. Waiting for token refresh...`);
          // Mark connection as waiting for token refresh
          connection.status = 'error';
          this.notifyStatusChange(connection, 'error', new Error('Unauthorized: Token expired'));
          // Clear abortController since we're not continuing
          connection.abortController = undefined;
          // Don't auto reconnect immediately for 401, wait for token refresh
          // The connection will be reconnected after token refresh via updateHeaders
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Update status to connected
      connection.status = 'connected';
      connection.reconnectAttempts = 0;
      this.notifyStatusChange(connection, 'connected');

      // Read stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Process stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // sseLogger.info(`Connection "${connection.id}" stream ended`);
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentData = '';
        for (const line of lines) {
          if (line.trim() === '') {
            // Empty line indicates end of message
            if (currentData) {
              const message = parseSSEMessage(currentData, connection.id);
              if (message) {
                this.handleSSEMessage(connection, message);
              }
              currentData = '';
            }
            continue;
          }

          // Parse SSE message format: "data: {...}"
          if (line.startsWith('data: ')) {
            currentData = line.substring(6).trim();
          } else if (line.startsWith('event: ')) {
            // Handle event type if needed
            // const eventType = line.substring(7).trim();
          } else if (line.startsWith('id: ')) {
            // Handle event ID if needed
            // const eventId = line.substring(4).trim();
          }
        }

        // Handle remaining data if buffer ends without empty line
        if (currentData && buffer === '') {
          const message = parseSSEMessage(currentData, connection.id);
          if (message) {
            this.handleSSEMessage(connection, message);
          }
        }
      }

      // Stream ended, handle reconnection if needed
      if (connection.status === 'connected' && connection.config.autoReconnect) {
        this.scheduleReconnect(connection);
      }
    } catch (error: any) {
      // Don't handle error if aborted
      if (error.name === 'AbortError') {
        return;
      }

      this.handleError(connection, error);
    }
  }

  /**
   * Handle SSE message based on type
   */
  private handleSSEMessage(connection: SSE.Connection, message: SSE.SSEMessage): void {
    switch (message.type) {
      case 'connected':
        connection.status = 'connected';
        connection.reconnectAttempts = 0;
        this.notifyStatusChange(connection, 'connected');
        break;

      case 'data':
        // Handle data message
        if (message.data) {
          // For monitoring streams, each connection is dedicated to a specific event type
          // So we route to 'data' listeners directly
          const listeners = connection.listeners.get('data') || new Set();
          listeners.forEach(listener => {
            try {
              listener(message.data, new MessageEvent('data', { data: JSON.stringify(message.data) }));
            } catch (err) {
              // Silent error handling
            }
          });
        }
        break;

      case 'heartbeat':
        // Handle heartbeat
        break;

      case 'error':
        // Handle error message
        const error = new Error(message.error || 'Unknown error');
        this.handleError(connection, error);
        break;

      default:
        // Unknown message type
    }
  }


  /**
   * Handle connection error
   */
  private handleError(connection: SSE.Connection, error: Event | Error): void {
    connection.status = 'error';
    const errorObj = error instanceof Error ? error : new Error('Unknown error');
    this.notifyStatusChange(connection, 'error', errorObj);

    // Abort connection
    if (connection.abortController) {
      connection.abortController.abort();
      connection.abortController = undefined;
    }

    // Check if error is 401 Unauthorized (token expired)
    // For 401 errors, don't auto reconnect - wait for token refresh
    const isUnauthorized = errorObj.message.includes('401') || errorObj.message.includes('Unauthorized');

    // Auto reconnect if enabled and not 401 error
    if (connection.config.autoReconnect && !isUnauthorized) {
      this.scheduleReconnect(connection);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   *
   * @param connection - SSE connection instance
   */
  private scheduleReconnect(connection: SSE.Connection): void {
    if (connection.reconnectAttempts >= (connection.config.maxReconnectAttempts || 5)) {
      connection.status = 'error';
      this.notifyStatusChange(connection, 'error', new Error('Max reconnect attempts reached'));
      return;
    }

    connection.reconnectAttempts++;
    connection.status = 'reconnecting';
    this.notifyStatusChange(connection, 'reconnecting');

    // Calculate delay with exponential backoff
    const baseDelay = connection.config.reconnectDelay || 1000;
    const maxDelay = connection.config.maxReconnectDelay || 30000;
    const delay = Math.min(baseDelay * Math.pow(2, connection.reconnectAttempts - 1), maxDelay);

    connection.reconnectTimer = window.setTimeout(() => {
      this.createSSEConnection(connection);
    }, delay);
  }

  /**
   * Subscribe to event
   *
   * @param connectionId - Connection ID
   * @param eventType - Event type to subscribe to
   * @param listener - Event listener callback
   * @returns Unsubscribe function
   */
  subscribe<T = any>(
    connectionId: string,
    eventType: string | 'message',
    listener: SSE.EventListener<T>
  ): () => void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return () => {};
    }

    if (!connection.listeners.has(eventType)) {
      connection.listeners.set(eventType, new Set<SSE.EventListener>());
    }

    connection.listeners.get(eventType)!.add(listener as SSE.EventListener);

    // Return unsubscribe function
    return () => {
      const listeners = connection.listeners.get(eventType);
      if (listeners) {
        listeners.delete(listener as SSE.EventListener);
        if (listeners.size === 0) {
          connection.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to connection status changes
   *
   * @param connectionId - Connection ID
   * @param listener - Status change listener callback
   * @returns Unsubscribe function
   */
  onStatusChange(
    connectionId: string,
    listener: SSE.StatusChangeListener
  ): () => void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return () => {};
    }

    connection.statusListeners.add(listener as SSE.StatusChangeListener);

    // Return unsubscribe function
    return () => {
      connection.statusListeners.delete(listener as SSE.StatusChangeListener);
    };
  }

  /**
   * Notify status change listeners
   *
   * @param connection - SSE connection instance
   * @param status - New connection status
   * @param error - Optional error object
   */
  private notifyStatusChange(
    connection: SSE.Connection,
    status: SSE.ConnectionStatus,
    error?: Error
  ): void {
    connection.statusListeners.forEach(listener => {
      try {
        listener(status, error);
      } catch (err) {
        // Silent error handling
      }
    });
  }

  /**
   * Disconnect SSE connection
   *
   * @param connectionId - Connection ID to disconnect
   * @param force - Force disconnect even if ref count > 0 (default: false)
   */
  disconnect(connectionId: string, force: boolean = false): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Decrement ref count
    connection.refCount--;

    // Only actually disconnect if ref count reaches 0 or force is true
    if (connection.refCount > 0 && !force) {
      return;
    }

    // Clear reconnect timer
    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
      connection.reconnectTimer = undefined;
    }

    // Abort connection
    if (connection.abortController) {
      connection.abortController.abort();
      connection.abortController = undefined;
    }

    // Clear listeners
    connection.listeners.clear();
    connection.statusListeners.clear();

    // Update status
    connection.status = 'disconnected';
    this.notifyStatusChange(connection, 'disconnected');

    // Remove from connections map
    this.connections.delete(connectionId);
  }

  /**
   * Get connection status
   *
   * @param connectionId - Connection ID
   * @returns Connection status or null if not found
   */
  getStatus(connectionId: string): SSE.ConnectionStatus | null {
    const connection = this.connections.get(connectionId);
    return connection?.status || null;
  }

  /**
   * Get connection instance
   *
   * @param connectionId - Connection ID
   * @returns Connection instance or null if not found
   */
  getConnection(connectionId: string): SSE.Connection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Check if connection exists
   *
   * @param connectionId - Connection ID
   * @returns True if connection exists
   */
  hasConnection(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * Disconnect all connections
   *
   * Useful for cleanup on application shutdown
   */
  disconnectAll(): void {
    const connectionIds = Array.from(this.connections.keys());
    for (const id of connectionIds) {
      this.disconnect(id);
    }
  }

  /**
   * Update connection headers (e.g., after token refresh)
   *
   * @param connectionId - Connection ID
   * @param headers - New headers to update
   * @param reconnect - Whether to reconnect after updating headers (default: true)
   */
  updateHeaders(connectionId: string, headers: Record<string, string>, reconnect: boolean = true): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Update config headers
    connection.config.headers = {
      ...connection.config.headers,
      ...headers
    };

    // Reconnect if needed
    if (reconnect && (connection.status === 'error' || connection.status === 'disconnected')) {
      // Clear any pending reconnect timer
      if (connection.reconnectTimer) {
        clearTimeout(connection.reconnectTimer);
        connection.reconnectTimer = undefined;
      }

      // Reset reconnect attempts
      connection.reconnectAttempts = 0;

      // Reconnect with new headers
      this.createSSEConnection(connection);
    }
  }

  /**
   * Update headers for all connections
   *
   * @param headers - New headers to update
   * @param reconnect - Whether to reconnect after updating headers (default: true)
   */
  updateAllHeaders(headers: Record<string, string>, reconnect: boolean = true): void {
    const connectionIds = Array.from(this.connections.keys());
    for (const id of connectionIds) {
      this.updateHeaders(id, headers, reconnect);
    }
  }
}

export const sseManager = SSEManager.getInstance();

