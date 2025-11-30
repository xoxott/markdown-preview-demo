/**
 * User Management API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace UserManagement
   *
   * backend api module: "user-management"
   */
  namespace UserManagement {
    /** Role information */
    interface Role {
      id: number;
      name: string;
      code: string;
    }

    /** User information */
    interface User {
      id: number;
      username: string;
      email: string;
      avatar: string | null;
      isActive: boolean;
      isOnline: boolean;
      isBlacklisted: boolean;
      blacklistedAt: string | null;
      blacklistReason: string | null;
      lastLoginAt: string | null;
      lastActivityAt: string | null;
      createdAt: string;
      updatedAt: string;
      roles: Role[];
    }

    /** User list query parameters */
    interface UserListParams extends Common.PaginationParams {
      /** Search keyword (username or email) */
      search?: string;
      /** Filter by status */
      isActive?: boolean;
      /** Filter by online status */
      isOnline?: boolean;
      /** Filter by blacklist status */
      isBlacklisted?: boolean;
      /** Filter by role code */
      roleCode?: string;
    }

    /** Create user request */
    interface CreateUserRequest {
      username: string;
      email: string;
      password: string;
      roleIds: number[];
      isActive?: boolean;
    }

    /** Update user request */
    interface UpdateUserRequest {
      username?: string;
      email?: string;
      password?: string;
      roleIds?: number[];
      isActive?: boolean;
    }

    /** Batch delete users request */
    interface BatchDeleteUsersRequest {
      ids: number[];
    }

    /** Toggle user status request */
    interface ToggleUserStatusRequest {
      id: number;
      isActive: boolean;
    }

    /** User list response */
    type UserListResponse = ListResponse<User>;

    /** User detail response */
    type UserDetailResponse = User;

    /** Create user response */
    interface CreateUserResponse {
      message: string;
      user: User;
    }

    /** Update user response */
    interface UpdateUserResponse {
      message: string;
      user: User;
    }

    /** Delete user response */
    interface DeleteUserResponse {
      message: string;
    }

    /** Batch delete users response */
    interface BatchDeleteUsersResponse {
      message: string;
      deletedCount: number;
    }

    /** Toggle user status response */
    interface ToggleUserStatusResponse {
      message: string;
      user: User;
    }

    /** Role list response */
    type RoleListResponse = ListResponse<Role>;
  }
}

