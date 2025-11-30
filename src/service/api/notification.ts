import { request } from '../request';

/**
 * Get notification list
 *
 * @param params Query parameters
 */
export function fetchNotificationList(params: Api.NotificationManagement.NotificationListParams) {
  return request<Api.NotificationManagement.NotificationListResponse>({
    url: '/api/admin/notifications',
    method: 'get',
    params
  });
}

/**
 * Get notification detail
 *
 * @param id Notification ID
 */
export function fetchNotificationDetail(id: number) {
  return request<Api.NotificationManagement.NotificationDetailResponse>({
    url: `/api/admin/notifications/${id}`,
    method: 'get'
  });
}

/**
 * Create notification
 *
 * @param data Notification data
 */
export function fetchCreateNotification(data: Api.NotificationManagement.CreateNotificationRequest) {
  return request<Api.NotificationManagement.CreateNotificationResponse>({
    url: '/api/admin/notifications',
    method: 'post',
    data
  });
}

/**
 * Update notification
 *
 * @param id Notification ID
 * @param data Notification data
 */
export function fetchUpdateNotification(id: number, data: Api.NotificationManagement.UpdateNotificationRequest) {
  return request<Api.NotificationManagement.UpdateNotificationResponse>({
    url: `/api/admin/notifications/${id}`,
    method: 'put',
    data
  });
}

/**
 * Delete notification
 *
 * @param id Notification ID
 */
export function fetchDeleteNotification(id: number) {
  return request<Api.NotificationManagement.DeleteNotificationResponse>({
    url: `/api/admin/notifications/${id}`,
    method: 'delete'
  });
}

/**
 * Batch delete notifications
 *
 * @param data Notification IDs
 */
export function fetchBatchDeleteNotifications(data: Api.NotificationManagement.BatchDeleteNotificationsRequest) {
  return request<Api.NotificationManagement.BatchDeleteNotificationsResponse>({
    url: '/api/admin/notifications/batch',
    method: 'delete',
    data
  });
}

/**
 * Toggle notification status (send/unsend)
 *
 * @param id Notification ID
 * @param isSent Status
 */
export function fetchToggleNotificationStatus(id: number, isSent: boolean) {
  return request<Api.NotificationManagement.ToggleNotificationStatusResponse>({
    url: `/api/admin/notifications/${id}/status`,
    method: 'patch',
    data: { isSent }
  });
}

/**
 * Mark notification as read
 *
 * @param id Notification ID
 * @param userId User ID (optional, defaults to current user)
 */
export function fetchMarkAsRead(id: number, userId?: number) {
  return request<Api.NotificationManagement.MarkAsReadResponse>({
    url: `/api/admin/notifications/${id}/read`,
    method: 'patch',
    data: userId ? { userId } : {}
  });
}

