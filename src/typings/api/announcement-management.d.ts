/**
 * Announcement Management API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace AnnouncementManagement
   *
   * backend api module: "announcement-management"
   */
  namespace AnnouncementManagement {
    /** Announcement information */
    interface Announcement {
      id: number;
      title: string;
      content: string;
      type: string | null;
      priority: number | null;
      isPublished: boolean;
      publishedAt: string | null;
      expiresAt: string | null;
      createdAt: string;
      updatedAt: string;
    }

    /** Announcement list query parameters */
    interface AnnouncementListParams extends Common.PaginationParams {
      /** Search keyword (title or content) */
      search?: string;
      /** Filter by status */
      isPublished?: boolean;
      /** Filter by type */
      type?: string;
      /** Sort by field */
      sortBy?: string;
      /** Sort order (asc or desc) */
      sortOrder?: 'asc' | 'desc';
    }

    /** Create announcement request */
    interface CreateAnnouncementRequest {
      title: string;
      content: string;
      type?: string;
      priority?: number;
      isPublished?: boolean;
      publishedAt?: string;
      expiresAt?: string;
    }

    /** Update announcement request */
    interface UpdateAnnouncementRequest {
      title?: string;
      content?: string;
      type?: string;
      priority?: number;
      isPublished?: boolean;
      publishedAt?: string;
      expiresAt?: string;
    }

    /** Batch delete announcements request */
    interface BatchDeleteAnnouncementsRequest {
      ids: number[];
    }

    /** Toggle announcement status request */
    interface ToggleAnnouncementStatusRequest {
      id: number;
      isPublished: boolean;
    }

    /** Announcement list response */
    type AnnouncementListResponse = ListResponse<Announcement>;

    /** Announcement detail response */
    type AnnouncementDetailResponse = Announcement;

    /** Create announcement response */
    interface CreateAnnouncementResponse {
      message: string;
      announcement: Announcement;
    }

    /** Update announcement response */
    interface UpdateAnnouncementResponse {
      message: string;
      announcement: Announcement;
    }

    /** Delete announcement response */
    interface DeleteAnnouncementResponse {
      message: string;
    }

    /** Batch delete announcements response */
    interface BatchDeleteAnnouncementsResponse {
      message: string;
      deletedCount: number;
    }

    /** Toggle announcement status response */
    interface ToggleAnnouncementStatusResponse {
      message: string;
      announcement: Announcement;
    }
  }
}

