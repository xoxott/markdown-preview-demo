import { request } from '../request';

/**
 * Get monitoring metrics summary
 */
export function fetchMetricsSummary() {
  return request<Api.Monitoring.MetricsSummary>({
    url: '/api/admin/monitoring/metrics/summary',
    method: 'get'
  });
}

