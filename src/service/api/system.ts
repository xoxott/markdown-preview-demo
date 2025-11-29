import { request } from '../request';

/**
 * Get system information
 */
export function fetchSystemInfo() {
  return request<Api.System.SystemInfo>({
    url: '/api/admin/system/info',
    method: 'get'
  });
}

/**
 * Get performance metrics
 */
export function fetchPerformanceMetrics() {
  return request<Api.System.PerformanceMetrics>({
    url: '/api/admin/system/performance',
    method: 'get'
  });
}

/**
 * Get environment information
 */
export function fetchEnvironmentInfo() {
  return request<Api.System.EnvironmentInfo>({
    url: '/api/admin/system/environment',
    method: 'get'
  });
}

