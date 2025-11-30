/**
 * Alert Management API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace AlertManagement
   *
   * backend api module: "alert-management"
   */
  namespace AlertManagement {
    /** Alert information */
    interface Alert {
      id: number;
      name: string;
      description: string | null;
      level: string;
      status: string;
      condition: string | null;
      threshold: number | null;
      metric: string | null;
      isEnabled: boolean;
      targetUserIds: number[] | null;
      targetRoleCodes: string[] | null;
      triggerCount: number | null;
      lastTriggeredAt: string | null;
      resolvedAt: string | null;
      acknowledgedAt: string | null;
      acknowledgedBy: number | null;
      createdAt: string;
      updatedAt: string;
    }

    /** Alert list query parameters */
    interface AlertListParams extends Common.PaginationParams {
      /** Search keyword (name or description) */
      search?: string;
      /** Filter by status */
      status?: string;
      /** Filter by level */
      level?: string;
      /** Filter by enabled status */
      isEnabled?: boolean;
      /** Filter by target user ID */
      targetUserId?: number;
      /** Sort by field */
      sortBy?: string;
      /** Sort order (asc or desc) */
      sortOrder?: 'asc' | 'desc';
    }

    /** Create alert request */
    interface CreateAlertRequest {
      name: string;
      description?: string;
      level: string;
      condition?: string;
      threshold?: number;
      metric?: string;
      isEnabled?: boolean;
      targetUserIds?: number[];
      targetRoleCodes?: string[];
    }

    /** Update alert request */
    interface UpdateAlertRequest {
      name?: string;
      description?: string;
      level?: string;
      condition?: string;
      threshold?: number;
      metric?: string;
      isEnabled?: boolean;
      targetUserIds?: number[];
      targetRoleCodes?: string[];
    }

    /** Batch delete alerts request */
    interface BatchDeleteAlertsRequest {
      ids: number[];
    }

    /** Toggle alert status request */
    interface ToggleAlertStatusRequest {
      id: number;
      isEnabled: boolean;
    }

    /** Acknowledge alert request */
    interface AcknowledgeAlertRequest {
      id: number;
    }

    /** Resolve alert request */
    interface ResolveAlertRequest {
      id: number;
    }

    /** Alert list response */
    type AlertListResponse = ListResponse<Alert>;

    /** Alert detail response */
    type AlertDetailResponse = Alert;

    /** Create alert response */
    interface CreateAlertResponse {
      message: string;
      alert: Alert;
    }

    /** Update alert response */
    interface UpdateAlertResponse {
      message: string;
      alert: Alert;
    }

    /** Delete alert response */
    interface DeleteAlertResponse {
      message: string;
    }

    /** Batch delete alerts response */
    interface BatchDeleteAlertsResponse {
      message: string;
      deletedCount: number;
    }

    /** Toggle alert status response */
    interface ToggleAlertStatusResponse {
      message: string;
      alert: Alert;
    }

    /** Acknowledge alert response */
    interface AcknowledgeAlertResponse {
      message: string;
      alert: Alert;
    }

    /** Resolve alert response */
    interface ResolveAlertResponse {
      message: string;
      alert: Alert;
    }
  }
}

