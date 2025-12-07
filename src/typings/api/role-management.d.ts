/**
 * Role Management API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace RoleManagement
   *
   * backend api module: "role-management"
   */
  namespace RoleManagement {
    /** Role information */
    interface Role {
      id: number;
      name: string;
      code: string;
      description: string | null;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }

    /** Role list query parameters */
    interface RoleListParams extends Common.PaginationParams {
      /** Search keyword (name or code) */
      search?: string;
      /** Filter by status */
      isActive?: boolean;
    }

    /** Create role request */
    interface CreateRoleRequest {
      name: string;
      code: string;
      description?: string;
      isActive?: boolean;
    }

    /** Update role request */
    interface UpdateRoleRequest {
      name?: string;
      code?: string;
      description?: string;
      isActive?: boolean;
    }

    /** Batch delete roles request */
    interface BatchDeleteRolesRequest {
      ids: number[];
    }

    /** Toggle role status request */
    interface ToggleRoleStatusRequest {
      id: number;
      isActive: boolean;
    }

    /** Role list response */
    type RoleListResponse = ListData<Role>;

    /** Role detail response */
    type RoleDetailResponse = Role;

    /** Create role response */
    interface CreateRoleResponse {
      message: string;
      role: Role;
    }

    /** Update role response */
    interface UpdateRoleResponse {
      message: string;
      role: Role;
    }

    /** Delete role response */
    interface DeleteRoleResponse {
      message: string;
    }

    /** Batch delete roles response */
    interface BatchDeleteRolesResponse {
      message: string;
      deletedCount: number;
    }

    /** Toggle role status response */
    interface ToggleRoleStatusResponse {
      message: string;
      role: Role;
    }
  }
}

