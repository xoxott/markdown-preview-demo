/**
 * Permission Management API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace PermissionManagement
   *
   * backend api module: "permission-management"
   */
  namespace PermissionManagement {
    /** Permission information */
    interface Permission {
      id: number;
      name: string;
      code: string;
      resource: string;
      action: string;
      description: string | null;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }

    /** Permission tree node (for tree display) */
    interface PermissionTreeNode {
      id: number;
      name: string;
      code: string;
      resource: string;
      action: string;
      parentId: number | null;
      description: string | null;
      isActive: boolean;
      children?: PermissionTreeNode[];
    }

    /** Permission list query parameters */
    interface PermissionListParams extends Common.PaginationParams {
      /** Search keyword (name or code) */
      search?: string;
      /** Filter by status */
      isActive?: boolean;
      /** Filter by resource */
      resource?: string;
      /** Filter by action */
      action?: string;
      /** Sort by field */
      sortBy?: string;
      /** Sort order (asc or desc) */
      sortOrder?: 'asc' | 'desc';
    }

    /** Create permission request */
    interface CreatePermissionRequest {
      name: string;
      code: string;
      resource: string;
      action: string;
      description?: string;
      isActive?: boolean;
    }

    /** Update permission request */
    interface UpdatePermissionRequest {
      name?: string;
      code?: string;
      resource?: string;
      action?: string;
      description?: string;
      isActive?: boolean;
    }

    /** Batch delete permissions request */
    interface BatchDeletePermissionsRequest {
      ids: number[];
    }

    /** Toggle permission status request */
    interface TogglePermissionStatusRequest {
      id: number;
      isActive: boolean;
    }

    /** Assign permissions to role request */
    interface AssignPermissionsRequest {
      permissionIds: number[];
    }

    /** Permission list response */
    type PermissionListResponse = ListResponse<Permission>;

    /** Permission tree response */
    interface PermissionTreeResponse {
      data: PermissionTreeNode[];
      statusCode: number;
      message: string;
      timestamp: string;
    }

    /** Permission detail response */
    type PermissionDetailResponse = Permission;

    /** Create permission response */
    interface CreatePermissionResponse {
      message: string;
      permission: Permission;
    }

    /** Update permission response */
    interface UpdatePermissionResponse {
      message: string;
      permission: Permission;
    }

    /** Delete permission response */
    interface DeletePermissionResponse {
      message: string;
    }

    /** Batch delete permissions response */
    interface BatchDeletePermissionsResponse {
      message: string;
      deletedCount: number;
    }

    /** Toggle permission status response */
    interface TogglePermissionStatusResponse {
      message: string;
      permission: Permission;
    }

    /** Assign permissions to role response */
    interface AssignPermissionsResponse {
      message: string;
      roleId: number;
      permissionIds: number[];
    }
  }
}

