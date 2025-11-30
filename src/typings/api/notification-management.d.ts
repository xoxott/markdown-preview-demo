/**
 * Notification Management API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace NotificationManagement
   *
   * backend api module: "notification-management"
   */
  namespace NotificationManagement {
    /** Notification information */
    interface Notification {
      id: number;
      title: string;
      content: string;
      type: string | null;
      priority: number | null;
      isSent: boolean;
      sentAt: string | null;
      expiresAt: string | null;
      targetUserIds: number[] | null;
      targetRoleCodes: string[] | null;
      readCount: number | null;
      totalCount: number | null;
      createdAt: string;
      updatedAt: string;
    }

    /** Notification list query parameters */
    interface NotificationListParams extends Common.PaginationParams {
      /** Search keyword (title or content) */
      search?: string;
      /** Filter by status */
      isSent?: boolean;
      /** Filter by type */
      type?: string;
      /** Filter by target user ID */
      targetUserId?: number;
      /** Sort by field */
      sortBy?: string;
      /** Sort order (asc or desc) */
      sortOrder?: 'asc' | 'desc';
    }

    /** Create notification request */
    interface CreateNotificationRequest {
      title: string;
      content: string;
      type?: string;
      priority?: number;
      isSent?: boolean;
      sentAt?: string;
      expiresAt?: string;
      targetUserIds?: number[];
      targetRoleCodes?: string[];
    }

    /** Update notification request */
    interface UpdateNotificationRequest {
      title?: string;
      content?: string;
      type?: string;
      priority?: number;
      isSent?: boolean;
      sentAt?: string;
      expiresAt?: string;
      targetUserIds?: number[];
      targetRoleCodes?: string[];
    }

    /** Batch delete notifications request */
    interface BatchDeleteNotificationsRequest {
      ids: number[];
    }

    /** Toggle notification status request */
    interface ToggleNotificationStatusRequest {
      id: number;
      isSent: boolean;
    }

    /** Mark notification as read request */
    interface MarkAsReadRequest {
      id: number;
      userId?: number;
    }

    /** Notification list response */
    type NotificationListResponse = ListResponse<Notification>;

    /** Notification detail response */
    type NotificationDetailResponse = Notification;

    /** Create notification response */
    interface CreateNotificationResponse {
      message: string;
      notification: Notification;
    }

    /** Update notification response */
    interface UpdateNotificationResponse {
      message: string;
      notification: Notification;
    }

    /** Delete notification response */
    interface DeleteNotificationResponse {
      message: string;
    }

    /** Batch delete notifications response */
    interface BatchDeleteNotificationsResponse {
      message: string;
      deletedCount: number;
    }

    /** Toggle notification status response */
    interface ToggleNotificationStatusResponse {
      message: string;
      notification: Notification;
    }

    /** Mark as read response */
    interface MarkAsReadResponse {
      message: string;
      notification: Notification;
    }
  }
}

