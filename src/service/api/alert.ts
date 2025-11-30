import { request } from '../request';

/**
 * Get alert list
 *
 * @param params Query parameters
 */
export function fetchAlertList(params: Api.AlertManagement.AlertListParams) {
  return request<Api.AlertManagement.AlertListResponse>({
    url: '/api/admin/alerts',
    method: 'get',
    params
  });
}

/**
 * Get alert detail
 *
 * @param id Alert ID
 */
export function fetchAlertDetail(id: number) {
  return request<Api.AlertManagement.AlertDetailResponse>({
    url: `/api/admin/alerts/${id}`,
    method: 'get'
  });
}

/**
 * Create alert
 *
 * @param data Alert data
 */
export function fetchCreateAlert(data: Api.AlertManagement.CreateAlertRequest) {
  return request<Api.AlertManagement.CreateAlertResponse>({
    url: '/api/admin/alerts',
    method: 'post',
    data
  });
}

/**
 * Update alert
 *
 * @param id Alert ID
 * @param data Alert data
 */
export function fetchUpdateAlert(id: number, data: Api.AlertManagement.UpdateAlertRequest) {
  return request<Api.AlertManagement.UpdateAlertResponse>({
    url: `/api/admin/alerts/${id}`,
    method: 'put',
    data
  });
}

/**
 * Delete alert
 *
 * @param id Alert ID
 */
export function fetchDeleteAlert(id: number) {
  return request<Api.AlertManagement.DeleteAlertResponse>({
    url: `/api/admin/alerts/${id}`,
    method: 'delete'
  });
}

/**
 * Batch delete alerts
 *
 * @param data Alert IDs
 */
export function fetchBatchDeleteAlerts(data: Api.AlertManagement.BatchDeleteAlertsRequest) {
  return request<Api.AlertManagement.BatchDeleteAlertsResponse>({
    url: '/api/admin/alerts/batch',
    method: 'delete',
    data
  });
}

/**
 * Toggle alert status (enable/disable)
 *
 * @param id Alert ID
 * @param isEnabled Status
 */
export function fetchToggleAlertStatus(id: number, isEnabled: boolean) {
  return request<Api.AlertManagement.ToggleAlertStatusResponse>({
    url: `/api/admin/alerts/${id}/status`,
    method: 'patch',
    data: { isEnabled }
  });
}

/**
 * Acknowledge alert
 *
 * @param id Alert ID
 */
export function fetchAcknowledgeAlert(id: number) {
  return request<Api.AlertManagement.AcknowledgeAlertResponse>({
    url: `/api/admin/alerts/${id}/acknowledge`,
    method: 'patch'
  });
}

/**
 * Resolve alert
 *
 * @param id Alert ID
 */
export function fetchResolveAlert(id: number) {
  return request<Api.AlertManagement.ResolveAlertResponse>({
    url: `/api/admin/alerts/${id}/resolve`,
    method: 'patch'
  });
}

