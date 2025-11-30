import { request } from '../request';

/**
 * Get role list
 *
 * @param params Query parameters
 */
export function fetchRoleList(params: Api.RoleManagement.RoleListParams) {
  return request<Api.RoleManagement.RoleListResponse>({
    url: '/api/admin/roles',
    method: 'get',
    params
  });
}

/**
 * Get role detail
 *
 * @param id Role ID
 */
export function fetchRoleDetail(id: number) {
  return request<Api.RoleManagement.RoleDetailResponse>({
    url: `/api/admin/roles/${id}`,
    method: 'get'
  });
}

/**
 * Create role
 *
 * @param data Role data
 */
export function fetchCreateRole(data: Api.RoleManagement.CreateRoleRequest) {
  return request<Api.RoleManagement.CreateRoleResponse>({
    url: '/api/admin/roles',
    method: 'post',
    data
  });
}

/**
 * Update role
 *
 * @param id Role ID
 * @param data Role data
 */
export function fetchUpdateRole(id: number, data: Api.RoleManagement.UpdateRoleRequest) {
  return request<Api.RoleManagement.UpdateRoleResponse>({
    url: `/api/admin/roles/${id}`,
    method: 'put',
    data
  });
}

/**
 * Delete role
 *
 * @param id Role ID
 */
export function fetchDeleteRole(id: number) {
  return request<Api.RoleManagement.DeleteRoleResponse>({
    url: `/api/admin/roles/${id}`,
    method: 'delete'
  });
}

/**
 * Batch delete roles
 *
 * @param data Role IDs
 */
export function fetchBatchDeleteRoles(data: Api.RoleManagement.BatchDeleteRolesRequest) {
  return request<Api.RoleManagement.BatchDeleteRolesResponse>({
    url: '/api/admin/roles/batch',
    method: 'delete',
    data
  });
}

/**
 * Toggle role status (enable/disable)
 *
 * @param id Role ID
 * @param isActive Status
 */
export function fetchToggleRoleStatus(id: number, isActive: boolean) {
  return request<Api.RoleManagement.ToggleRoleStatusResponse>({
    url: `/api/admin/roles/${id}/status`,
    method: 'patch',
    data: { isActive }
  });
}

