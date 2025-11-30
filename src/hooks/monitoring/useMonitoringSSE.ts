import { ref, computed, onBeforeUnmount, watch } from 'vue';
import type { Ref } from 'vue';
import type { SSE } from '@/typings/sse';
import { sseManager } from '@/utils/sse/SSEManager';
import { throttle } from '@/utils/debounce';
import {
  MONITORING_SSE_CONNECTION_IDS,
  createMonitoringSSEConfig,
  type MonitoringEventListener
} from '@/service/api/monitoring-stream';
import { localStg } from '@/utils/storage';

/**
 * Monitoring SSE Hook Options
 */
export interface UseMonitoringSSEOptions {
  /** Auto connect on mount */
  autoConnect?: boolean;
  /** Enable auto reconnect */
  autoReconnect?: boolean;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
}

/**
 * Monitoring SSE Hook Return Type
 */
export interface UseMonitoringSSEReturn {
  /** Connection status */
  status: Ref<SSE.ConnectionStatus>;
  /** Is connected */
  isConnected: Ref<boolean>;
  /** Is connecting */
  isConnecting: Ref<boolean>;
  /** Is reconnecting */
  isReconnecting: Ref<boolean>;
  /** Connection error */
  error: Ref<Error | null>;
  /** Connect to SSE */
  connect: () => void;
  /** Disconnect from SSE */
  disconnect: () => void;
  /** Subscribe to health event */
  onHealth: (listener: MonitoringEventListener<'health'>) => () => void;
  /** Subscribe to liveness event */
  onLiveness: (listener: MonitoringEventListener<'liveness'>) => () => void;
  /** Subscribe to readiness event */
  onReadiness: (listener: MonitoringEventListener<'readiness'>) => () => void;
  /** Subscribe to metrics event */
  onMetrics: (listener: MonitoringEventListener<'metrics'>) => () => void;
  /** Subscribe to system event */
  onSystem: (listener: MonitoringEventListener<'system'>) => () => void;
  /** Subscribe to performance event */
  onPerformance: (listener: MonitoringEventListener<'performance'>) => () => void;
  /** Subscribe to environment event */
  onEnvironment: (listener: MonitoringEventListener<'environment'>) => () => void;
  /** Subscribe to all events */
  onAll: (listener: (eventType: SSE.MonitoringEventType, data: any) => void) => () => void;
}

/**
 * Use Monitoring SSE Hook
 *
 * Provides a convenient way to connect to monitoring SSE stream and subscribe to events
 */
export function useMonitoringSSE(options: UseMonitoringSSEOptions = {}): UseMonitoringSSEReturn {
  const {
    autoConnect = true,
    autoReconnect = true,
    maxReconnectAttempts = 5
  } = options;

  // Connection status
  const status = ref<SSE.ConnectionStatus>('disconnected');
  const error = ref<Error | null>(null);

  // Computed status flags
  const isConnected = computed(() => status.value === 'connected');
  const isConnecting = computed(() => status.value === 'connecting');
  const isReconnecting = computed(() => status.value === 'reconnecting');

  // Unsubscribe functions
  const unsubscribeFunctions: Array<() => void> = [];

  /**
   * Connect to monitoring SSE (all event types)
   */
  const connect = () => {
    // Get token
    const token = localStg.get('token') || localStg.get('accessToken');
    if (!token) {
      error.value = new Error('No authentication token available');
      status.value = 'error';
      return;
    }

    // Connect to all event types
    const eventTypes = [
      'health',
      'liveness',
      'readiness',
      'metrics',
      'system',
      'performance'
    ] as const satisfies readonly Exclude<SSE.MonitoringEventType, 'environment'>[];

    let connectedCount = 0;
    let connectingCount = 0;

    eventTypes.forEach(eventType => {
      const connectionId = MONITORING_SSE_CONNECTION_IDS[eventType];

      // Check if already connected - connect() will handle ref counting
      const existingConnection = sseManager.getConnection(connectionId);
      if (existingConnection) {
        const existingStatus = existingConnection.status;
        if (existingStatus === 'connected') {
          connectedCount++;
        } else if (existingStatus === 'connecting') {
          connectingCount++;
        }
        // connect() will increment ref count for existing connections
      }

      // Create config for this event type
      const config = createMonitoringSSEConfig(eventType);
      config.autoReconnect = autoReconnect;
      config.maxReconnectAttempts = maxReconnectAttempts;

      // Connect (will create new connection or increment ref count for existing)
      const connection = sseManager.connect(connectionId, config);
      if (connection.status === 'connected') {
        connectedCount++;
      } else if (connection.status === 'connecting') {
        connectingCount++;
      }

      // Subscribe to status changes
      const unsubscribeStatus = sseManager.onStatusChange(connectionId, (newStatus, err) => {
        // Update overall status based on all connections
        updateOverallStatus();
        if (err) {
          error.value = err;
        }
      });

      unsubscribeFunctions.push(unsubscribeStatus);
    });

    // Update initial status
    updateOverallStatus();
  };

  /**
   * Update overall connection status based on all connections
   *
   * Aggregates status from all individual connections to determine overall status
   */
  const updateOverallStatus = () => {
    const eventTypes = [
      'health',
      'liveness',
      'readiness',
      'metrics',
      'system',
      'performance'
    ] as const satisfies readonly Exclude<SSE.MonitoringEventType, 'environment'>[];

    const statuses = eventTypes.map(eventType => {
      const connectionId = MONITORING_SSE_CONNECTION_IDS[eventType];
      return sseManager.getStatus(connectionId);
    }).filter(Boolean) as SSE.ConnectionStatus[];

    if (statuses.length === 0) {
      status.value = 'disconnected';
      return;
    }

    // Determine overall status
    if (statuses.some(s => s === 'error')) {
      status.value = 'error';
    } else if (statuses.some(s => s === 'connecting' || s === 'reconnecting')) {
      status.value = statuses.some(s => s === 'reconnecting') ? 'reconnecting' : 'connecting';
    } else if (statuses.every(s => s === 'connected')) {
      status.value = 'connected';
    } else {
      status.value = 'disconnected';
    }
  };

  /**
   * Disconnect from monitoring SSE (all event types)
   *
   * Closes all SSE connections and cleans up listeners
   * Uses reference counting - only disconnects when ref count reaches 0
   */
  const disconnect = () => {
    // Unsubscribe all listeners
    unsubscribeFunctions.forEach(fn => fn());
    unsubscribeFunctions.length = 0;

    // Disconnect all connections (will decrement ref count)
    // Connection will only be actually closed when ref count reaches 0
    const eventTypes = [
      'health',
      'liveness',
      'readiness',
      'metrics',
      'system',
      'performance'
    ] as const satisfies readonly Exclude<SSE.MonitoringEventType, 'environment'>[];

    eventTypes.forEach(eventType => {
      const connectionId = MONITORING_SSE_CONNECTION_IDS[eventType];
      sseManager.disconnect(connectionId, false); // Don't force, use ref counting
    });

    status.value = 'disconnected';
    error.value = null;
  };

  /**
   * Subscribe to specific event type
   */
  const subscribe = <T extends Exclude<SSE.MonitoringEventType, 'environment'>>(
    eventType: T,
    listener: MonitoringEventListener<T>
  ): (() => void) => {
    const connectionId = MONITORING_SSE_CONNECTION_IDS[eventType];

    if (!sseManager.hasConnection(connectionId)) {
      return () => {};
    }

    // Throttle listener to prevent excessive updates (max 10 updates per second)
    // This helps reduce UI lag when receiving high-frequency updates
    const throttledListener = throttle((actualData: any, event: MessageEvent) => {
      listener(actualData, event);
    }, 100);

    // Subscribe to 'data' event type, as the SSE stream will send data messages
    const unsubscribe = sseManager.subscribe(
      connectionId,
      'data',
      ((data: any) => {
        // The data should already be parsed and routed correctly
        // But we need to extract the actual data from the message
        if (data && typeof data === 'object') {
          // If data has eventType, verify it matches
          if (data.eventType && data.eventType !== eventType) {
            return; // Not for this listener
          }
          // Extract actual data - message.data contains the actual payload
          const actualData = data.data !== undefined ? data.data : data;
          throttledListener(actualData, new MessageEvent('data', { data: JSON.stringify(actualData) }));
        } else {
          throttledListener(data, new MessageEvent('data', { data: JSON.stringify(data) }));
        }
      }) as SSE.EventListener
    );

    unsubscribeFunctions.push(unsubscribe);
    return unsubscribe;
  };

  /**
   * Subscribe to health event
   */
  const onHealth = (listener: MonitoringEventListener<'health'>) => {
    return subscribe('health', listener);
  };

  /**
   * Subscribe to liveness event
   */
  const onLiveness = (listener: MonitoringEventListener<'liveness'>) => {
    return subscribe('liveness', listener);
  };

  /**
   * Subscribe to readiness event
   */
  const onReadiness = (listener: MonitoringEventListener<'readiness'>) => {
    return subscribe('readiness', listener);
  };

  /**
   * Subscribe to metrics event
   */
  const onMetrics = (listener: MonitoringEventListener<'metrics'>) => {
    return subscribe('metrics', listener);
  };

  /**
   * Subscribe to system event
   */
  const onSystem = (listener: MonitoringEventListener<'system'>) => {
    return subscribe('system', listener);
  };

  /**
   * Subscribe to performance event
   */
  const onPerformance = (listener: MonitoringEventListener<'performance'>) => {
    return subscribe('performance', listener);
  };

  /**
   * Subscribe to environment event
   * Note: Environment doesn't have a dedicated SSE endpoint, so this is a no-op
   */
  const onEnvironment = (_listener: MonitoringEventListener<'environment'>) => {
    return () => {};
  };

  /**
   * Subscribe to all events
   */
  const onAll = (listener: (eventType: SSE.MonitoringEventType, data: any) => void) => {
    const unsubscribes: Array<() => void> = [];

    const eventTypes = [
      'health',
      'liveness',
      'readiness',
      'metrics',
      'system',
      'performance'
    ] as const satisfies readonly Exclude<SSE.MonitoringEventType, 'environment'>[];

    eventTypes.forEach(eventType => {
      const unsubscribe = subscribe(eventType, (data) => {
        listener(eventType, data);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(fn => fn());
    };
  };

  // Auto connect on mount
  if (autoConnect) {
    connect();
  } else {
    // Even if not auto connecting, we should increment ref count for existing connections
    // This ensures that if a component uses autoConnect: false but subscribes to events,
    // the connection won't be closed when another component unmounts
    const eventTypes = [
      'health',
      'liveness',
      'readiness',
      'metrics',
      'system',
      'performance'
    ] as const satisfies readonly Exclude<SSE.MonitoringEventType, 'environment'>[];

    eventTypes.forEach(eventType => {
      const connectionId = MONITORING_SSE_CONNECTION_IDS[eventType];
      const existingConnection = sseManager.getConnection(connectionId);
      if (existingConnection) {
        existingConnection.refCount++;
      }
    });
  }

  // Watch token changes and update SSE connections
  // Note: We don't disconnect/reconnect here to avoid interrupting token refresh process
  // The token refresh handler in shared.ts will update SSE headers automatically
  watch(
    () => localStg.get('token') || localStg.get('accessToken'),
    (newToken, oldToken) => {
      if (!newToken && status.value === 'connected') {
        // Token removed, disconnect
        disconnect();
      }
      // Don't reconnect on token change - let the token refresh handler manage it
      // This prevents interrupting the refresh process and avoids loops
    }
  );

  // Cleanup on unmount
  onBeforeUnmount(() => {
    disconnect();
  });

  return {
    status,
    isConnected,
    isConnecting,
    isReconnecting,
    error,
    connect,
    disconnect,
    onHealth,
    onLiveness,
    onReadiness,
    onMetrics,
    onSystem,
    onPerformance,
    onEnvironment,
    onAll
  };
}

