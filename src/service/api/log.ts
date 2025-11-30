import { request } from '../request';

/**
 * Get log list
 *
 * @param params Query parameters
 */
export function fetchLogList(params: Api.LogManagement.LogListParams) {
  return request<Api.LogManagement.LogListResponse>({
    url: '/api/admin/logs',
    method: 'get',
    params
  });
}

/**
 * Get log detail
 *
 * @param id Log ID
 */
export function fetchLogDetail(id: number) {
  return request<Api.LogManagement.LogDetailResponse>({
    url: `/api/admin/logs/${id}`,
    method: 'get'
  });
}

/**
 * Delete log
 *
 * @param id Log ID
 */
export function fetchDeleteLog(id: number) {
  return request<Api.LogManagement.DeleteLogResponse>({
    url: `/api/admin/logs/${id}`,
    method: 'delete'
  });
}

/**
 * Batch delete logs
 *
 * @param data Log IDs
 */
export function fetchBatchDeleteLogs(data: Api.LogManagement.BatchDeleteLogsRequest) {
  return request<Api.LogManagement.BatchDeleteLogsResponse>({
    url: '/api/admin/logs/batch',
    method: 'delete',
    data
  });
}

/**
 * Clear logs
 *
 * @param data Clear options
 */
export function fetchClearLogs(data?: Api.LogManagement.ClearLogsRequest) {
  return request<Api.LogManagement.ClearLogsResponse>({
    url: '/api/admin/logs/clear',
    method: 'delete',
    data
  });
}

