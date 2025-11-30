import { request } from '../request';

/**
 * Get version log list
 *
 * @param params Query parameters
 */
export function fetchVersionLogList(params: Api.VersionLogManagement.VersionLogListParams) {
  return request<Api.VersionLogManagement.VersionLogListResponse>({
    url: '/api/admin/version-logs',
    method: 'get',
    params
  });
}

/**
 * Get version log detail
 *
 * @param id Version log ID
 */
export function fetchVersionLogDetail(id: number) {
  return request<Api.VersionLogManagement.VersionLogDetailResponse>({
    url: `/api/admin/version-logs/${id}`,
    method: 'get'
  });
}

/**
 * Create version log
 *
 * @param data Version log data
 */
export function fetchCreateVersionLog(data: Api.VersionLogManagement.CreateVersionLogRequest) {
  return request<Api.VersionLogManagement.CreateVersionLogResponse>({
    url: '/api/admin/version-logs',
    method: 'post',
    data
  });
}

/**
 * Update version log
 *
 * @param id Version log ID
 * @param data Version log data
 */
export function fetchUpdateVersionLog(id: number, data: Api.VersionLogManagement.UpdateVersionLogRequest) {
  return request<Api.VersionLogManagement.UpdateVersionLogResponse>({
    url: `/api/admin/version-logs/${id}`,
    method: 'put',
    data
  });
}

/**
 * Delete version log
 *
 * @param id Version log ID
 */
export function fetchDeleteVersionLog(id: number) {
  return request<Api.VersionLogManagement.DeleteVersionLogResponse>({
    url: `/api/admin/version-logs/${id}`,
    method: 'delete'
  });
}

/**
 * Batch delete version logs
 *
 * @param data Version log IDs
 */
export function fetchBatchDeleteVersionLogs(data: Api.VersionLogManagement.BatchDeleteVersionLogsRequest) {
  return request<Api.VersionLogManagement.BatchDeleteVersionLogsResponse>({
    url: '/api/admin/version-logs/batch',
    method: 'delete',
    data
  });
}

/**
 * Toggle version log status (publish/unpublish)
 *
 * @param id Version log ID
 * @param isPublished Status
 */
export function fetchToggleVersionLogStatus(id: number, isPublished: boolean) {
  return request<Api.VersionLogManagement.ToggleVersionLogStatusResponse>({
    url: `/api/admin/version-logs/${id}/status`,
    method: 'patch',
    data: { isPublished }
  });
}

