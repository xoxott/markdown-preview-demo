import { request } from '../request';

/**
 * Get application health status
 */
export function fetchHealthCheck() {
  return request<Api.Health.HealthCheckResponse>({
    url: '/api/admin/health',
    method: 'get'
  });
}

/**
 * Get liveness probe status
 */
export function fetchLiveness() {
  return request<Api.Health.LivenessResponse>({
    url: '/api/admin/health/liveness',
    method: 'get'
  });
}

/**
 * Get readiness probe status
 */
export function fetchReadiness() {
  return request<Api.Health.ReadinessResponse>({
    url: '/api/admin/health/readiness',
    method: 'get'
  });
}

