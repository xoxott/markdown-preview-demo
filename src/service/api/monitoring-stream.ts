import type { SSE } from '@/typings/sse';
import { getServiceBaseURL } from '@/utils/service';
import { localStg } from '@/utils/storage';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

/**
 * Monitoring SSE connection IDs
 */
export const MONITORING_SSE_CONNECTION_IDS: Record<Exclude<SSE.MonitoringEventType, 'environment'>, string> = {
  health: 'monitoring-health',
  liveness: 'monitoring-liveness',
  readiness: 'monitoring-readiness',
  metrics: 'monitoring-metrics',
  system: 'monitoring-system',
  performance: 'monitoring-performance'
} as const;

/**
 * Get authorization token for SSE
 * 
 * @returns Authorization token or empty string
 */
function getSSEToken(): string {
  const token = localStg.get('token') || localStg.get('accessToken');
  return token || '';
}

/**
 * Get SSE endpoint URL for specific event type
 * 
 * @param eventType - Monitoring event type
 * @returns SSE endpoint URL
 */
function getSSEEndpoint(eventType: SSE.MonitoringEventType): string {
  const endpoints: Record<SSE.MonitoringEventType, string> = {
    health: `${baseURL}/api/admin/health/stream`,
    liveness: `${baseURL}/api/admin/health/liveness/stream`,
    readiness: `${baseURL}/api/admin/health/readiness/stream`,
    metrics: `${baseURL}/api/admin/monitoring/metrics/summary/stream`,
    system: `${baseURL}/api/admin/system/info/stream`,
    performance: `${baseURL}/api/admin/system/performance/stream`,
    environment: `${baseURL}/api/admin/system/environment/stream` // Fallback, may not exist
  };
  return endpoints[eventType];
}

/**
 * Create monitoring SSE connection configuration for specific event type
 * 
 * @param eventType - Monitoring event type
 * @returns SSE connection configuration
 */
export function createMonitoringSSEConfig(eventType: SSE.MonitoringEventType): SSE.ConnectionConfig {
  const token = getSSEToken();

  return {
    url: getSSEEndpoint(eventType),
    timeout: 30000,
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    },
    withCredentials: false
  };
}

/**
 * Monitoring event data types
 */
export type MonitoringEventData = {
  [K in SSE.MonitoringEventType]: SSE.MonitoringEventData[K];
};

/**
 * Monitoring event listener type
 */
export type MonitoringEventListener<T extends SSE.MonitoringEventType = SSE.MonitoringEventType> = (
  data: MonitoringEventData[T],
  event: MessageEvent
) => void;

