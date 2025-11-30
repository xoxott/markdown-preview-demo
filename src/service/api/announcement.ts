import { request } from '../request';

/**
 * Get announcement list
 *
 * @param params Query parameters
 */
export function fetchAnnouncementList(params: Api.AnnouncementManagement.AnnouncementListParams) {
  return request<Api.AnnouncementManagement.AnnouncementListResponse>({
    url: '/api/admin/announcements',
    method: 'get',
    params
  });
}

/**
 * Get announcement detail
 *
 * @param id Announcement ID
 */
export function fetchAnnouncementDetail(id: number) {
  return request<Api.AnnouncementManagement.AnnouncementDetailResponse>({
    url: `/api/admin/announcements/${id}`,
    method: 'get'
  });
}

/**
 * Create announcement
 *
 * @param data Announcement data
 */
export function fetchCreateAnnouncement(data: Api.AnnouncementManagement.CreateAnnouncementRequest) {
  return request<Api.AnnouncementManagement.CreateAnnouncementResponse>({
    url: '/api/admin/announcements',
    method: 'post',
    data
  });
}

/**
 * Update announcement
 *
 * @param id Announcement ID
 * @param data Announcement data
 */
export function fetchUpdateAnnouncement(id: number, data: Api.AnnouncementManagement.UpdateAnnouncementRequest) {
  return request<Api.AnnouncementManagement.UpdateAnnouncementResponse>({
    url: `/api/admin/announcements/${id}`,
    method: 'put',
    data
  });
}

/**
 * Delete announcement
 *
 * @param id Announcement ID
 */
export function fetchDeleteAnnouncement(id: number) {
  return request<Api.AnnouncementManagement.DeleteAnnouncementResponse>({
    url: `/api/admin/announcements/${id}`,
    method: 'delete'
  });
}

/**
 * Batch delete announcements
 *
 * @param data Announcement IDs
 */
export function fetchBatchDeleteAnnouncements(data: Api.AnnouncementManagement.BatchDeleteAnnouncementsRequest) {
  return request<Api.AnnouncementManagement.BatchDeleteAnnouncementsResponse>({
    url: '/api/admin/announcements/batch',
    method: 'delete',
    data
  });
}

/**
 * Toggle announcement status (publish/unpublish)
 *
 * @param id Announcement ID
 * @param isPublished Status
 */
export function fetchToggleAnnouncementStatus(id: number, isPublished: boolean) {
  return request<Api.AnnouncementManagement.ToggleAnnouncementStatusResponse>({
    url: `/api/admin/announcements/${id}/status`,
    method: 'patch',
    data: { isPublished }
  });
}

