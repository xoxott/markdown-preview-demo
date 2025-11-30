import { request } from '../request';

/**
 * Get permission list
 *
 * @param params Query parameters
 */
export function fetchPermissionList(params: Api.PermissionManagement.PermissionListParams) {
  return request<Api.PermissionManagement.PermissionListResponse>({
    url: '/api/admin/permissions',
    method: 'get',
    params
  });
}

/**
 * Get permission tree (for tree selector)
 *
 */
export function fetchPermissionTree() {
  return request<Api.PermissionManagement.PermissionTreeResponse>({
    url: '/api/admin/permissions/tree',
    method: 'get'
  });
}

/**
 * Get permission detail
 *
 * @param id Permission ID
 */
export function fetchPermissionDetail(id: number) {
  return request<Api.PermissionManagement.PermissionDetailResponse>({
    url: `/api/admin/permissions/${id}`,
    method: 'get'
  });
}

/**
 * Create permission
 *
 * @param data Permission data
 */
export function fetchCreatePermission(data: Api.PermissionManagement.CreatePermissionRequest) {
  return request<Api.PermissionManagement.CreatePermissionResponse>({
    url: '/api/admin/permissions',
    method: 'post',
    data
  });
}

/**
 * Update permission
 *
 * @param id Permission ID
 * @param data Permission data
 */
export function fetchUpdatePermission(id: number, data: Api.PermissionManagement.UpdatePermissionRequest) {
  return request<Api.PermissionManagement.UpdatePermissionResponse>({
    url: `/api/admin/permissions/${id}`,
    method: 'put',
    data
  });
}

/**
 * Delete permission
 *
 * @param id Permission ID
 */
export function fetchDeletePermission(id: number) {
  return request<Api.PermissionManagement.DeletePermissionResponse>({
    url: `/api/admin/permissions/${id}`,
    method: 'delete'
  });
}

/**
 * Batch delete permissions
 *
 * @param data Permission IDs
 */
export function fetchBatchDeletePermissions(data: Api.PermissionManagement.BatchDeletePermissionsRequest) {
  return request<Api.PermissionManagement.BatchDeletePermissionsResponse>({
    url: '/api/admin/permissions/batch',
    method: 'delete',
    data
  });
}

/**
 * Toggle permission status (enable/disable)
 *
 * @param id Permission ID
 * @param isActive Status
 */
export function fetchTogglePermissionStatus(id: number, isActive: boolean) {
  return request<Api.PermissionManagement.TogglePermissionStatusResponse>({
    url: `/api/admin/permissions/${id}/status`,
    method: 'patch',
    data: { isActive }
  });
}

/**
 * Assign permissions to role
 *
 * @param roleId Role ID
 * @param data Permission IDs
 */
export function fetchAssignPermissionsToRole(roleId: number, data: Api.PermissionManagement.AssignPermissionsRequest) {
  return request<Api.PermissionManagement.AssignPermissionsResponse>({
    url: `/api/admin/roles/${roleId}/permissions`,
    method: 'post',
    data
  });
}

