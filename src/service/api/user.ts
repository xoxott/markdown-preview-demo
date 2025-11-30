import { request } from '../request';

/**
 * Get user list
 *
 * @param params Query parameters
 */
export function fetchUserList(params: Api.UserManagement.UserListParams) {
  return request<Api.UserManagement.UserListResponse>({
    url: '/api/admin/users',
    method: 'get',
    params
  });
}

/**
 * Get user detail
 *
 * @param id User ID
 */
export function fetchUserDetail(id: number) {
  return request<Api.UserManagement.UserDetailResponse>({
    url: `/api/admin/users/${id}`,
    method: 'get'
  });
}

/**
 * Create user
 *
 * @param data User data
 */
export function fetchCreateUser(data: Api.UserManagement.CreateUserRequest) {
  return request<Api.UserManagement.CreateUserResponse>({
    url: '/api/admin/users',
    method: 'post',
    data
  });
}

/**
 * Update user
 *
 * @param id User ID
 * @param data User data
 */
export function fetchUpdateUser(id: number, data: Api.UserManagement.UpdateUserRequest) {
  return request<Api.UserManagement.UpdateUserResponse>({
    url: `/api/admin/users/${id}`,
    method: 'put',
    data
  });
}

/**
 * Delete user
 *
 * @param id User ID
 */
export function fetchDeleteUser(id: number) {
  return request<Api.UserManagement.DeleteUserResponse>({
    url: `/api/admin/users/${id}`,
    method: 'delete'
  });
}

/**
 * Batch delete users
 *
 * @param data User IDs
 */
export function fetchBatchDeleteUsers(data: Api.UserManagement.BatchDeleteUsersRequest) {
  return request<Api.UserManagement.BatchDeleteUsersResponse>({
    url: '/api/admin/users/batch',
    method: 'delete',
    data
  });
}

/**
 * Toggle user status (enable/disable)
 *
 * @param id User ID
 * @param isActive Status
 */
export function fetchToggleUserStatus(id: number, isActive: boolean) {
  return request<Api.UserManagement.ToggleUserStatusResponse>({
    url: `/api/admin/users/${id}/status`,
    method: 'patch',
    data: { isActive }
  });
}

/**
 * Get role list
 */
export function fetchRoleList() {
  return request<Api.UserManagement.RoleListResponse>({
    url: '/api/admin/roles',
    method: 'get'
  });
}

