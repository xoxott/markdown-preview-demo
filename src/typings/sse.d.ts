/**
 * SSE (Server-Sent Events) related types
 */
export namespace SSE {
  /** SSE connection status */
  type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

  /** SSE event types for monitoring */
  type MonitoringEventType = 'health' | 'liveness' | 'readiness' | 'metrics' | 'system' | 'performance' | 'environment';

  /** SSE connection configuration */
  interface ConnectionConfig {
    /** SSE endpoint URL */
    url: string;
    /** Connection timeout in milliseconds */
    timeout?: number;
    /** Enable auto reconnect */
    autoReconnect?: boolean;
    /** Max reconnect attempts */
    maxReconnectAttempts?: number;
    /** Reconnect delay in milliseconds (will use exponential backoff) */
    reconnectDelay?: number;
    /** Max reconnect delay in milliseconds */
    maxReconnectDelay?: number;
    /** Custom headers */
    headers?: Record<string, string>;
    /** Query parameters */
    params?: Record<string, string>;
    /** With credentials */
    withCredentials?: boolean;
  }

  /** SSE message format */
  interface SSEMessage {
    /** Message type */
    type: 'connected' | 'data' | 'heartbeat' | 'error';
    /** Timestamp */
    timestamp: string;
    /** Message data (for type='data') */
    data?: any;
    /** Error message (for type='error') */
    error?: string;
  }

  /** SSE event data */
  interface EventData<T = any> {
    /** Event type */
    type: string;
    /** Event data */
    data: T;
    /** Event ID */
    id?: string;
    /** Event timestamp */
    timestamp?: string;
  }

  /** Monitoring event data types */
  interface MonitoringEventData {
    health: Api.Health.HealthCheckResponse;
    liveness: Api.Health.LivenessResponse;
    readiness: Api.Health.ReadinessResponse;
    metrics: Api.Monitoring.MetricsSummary;
    system: Api.System.SystemInfo;
    performance: Api.System.PerformanceMetrics;
    environment: Api.System.EnvironmentInfo;
  }

  /** Event listener callback */
  type EventListener<T = any> = (data: T, event: MessageEvent) => void;

  /** Connection status change callback */
  type StatusChangeListener = (status: ConnectionStatus, error?: Error) => void;

  /** SSE connection instance */
  interface Connection {
    /** Connection ID */
    id: string;
    /** Connection status */
    status: ConnectionStatus;
    /** Connection config */
    config: ConnectionConfig;
    /** Event listeners */
    listeners: Map<string, Set<EventListener>>;
    /** Status change listeners */
    statusListeners: Set<StatusChangeListener>;
    /** AbortController for fetch request */
    abortController?: AbortController;
    /** Reconnect attempts count */
    reconnectAttempts: number;
    /** Reconnect timer */
    reconnectTimer?: number;
    /** Reference count - number of components using this connection */
    refCount: number;
  }
}

