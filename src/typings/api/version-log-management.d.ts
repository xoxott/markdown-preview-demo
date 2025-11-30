/**
 * Version Log Management API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace VersionLogManagement
   *
   * backend api module: "version-log-management"
   */
  namespace VersionLogManagement {
    /** Version log information */
    interface VersionLog {
      id: number;
      version: string;
      type: string;
      releaseDate: string;
      content: string;
      features: string[] | null;
      fixes: string[] | null;
      improvements: string[] | null;
      isPublished: boolean;
      publishedAt: string | null;
      createdAt: string;
      updatedAt: string;
    }

    /** Version log list query parameters */
    interface VersionLogListParams extends Common.PaginationParams {
      /** Search keyword (version) */
      search?: string;
      /** Filter by type */
      type?: string;
      /** Filter by status */
      isPublished?: boolean;
      /** Filter by start date */
      startDate?: string;
      /** Filter by end date */
      endDate?: string;
      /** Sort by field */
      sortBy?: string;
      /** Sort order (asc or desc) */
      sortOrder?: 'asc' | 'desc';
    }

    /** Create version log request */
    interface CreateVersionLogRequest {
      version: string;
      type: string;
      releaseDate: string;
      content: string;
      features?: string[];
      fixes?: string[];
      improvements?: string[];
      isPublished?: boolean;
      publishedAt?: string;
    }

    /** Update version log request */
    interface UpdateVersionLogRequest {
      version?: string;
      type?: string;
      releaseDate?: string;
      content?: string;
      features?: string[];
      fixes?: string[];
      improvements?: string[];
      isPublished?: boolean;
      publishedAt?: string;
    }

    /** Batch delete version logs request */
    interface BatchDeleteVersionLogsRequest {
      ids: number[];
    }

    /** Toggle version log status request */
    interface ToggleVersionLogStatusRequest {
      id: number;
      isPublished: boolean;
    }

    /** Version log list response */
    type VersionLogListResponse = ListResponse<VersionLog>;

    /** Version log detail response */
    type VersionLogDetailResponse = VersionLog;

    /** Create version log response */
    interface CreateVersionLogResponse {
      message: string;
      versionLog: VersionLog;
    }

    /** Update version log response */
    interface UpdateVersionLogResponse {
      message: string;
      versionLog: VersionLog;
    }

    /** Delete version log response */
    interface DeleteVersionLogResponse {
      message: string;
    }

    /** Batch delete version logs response */
    interface BatchDeleteVersionLogsResponse {
      message: string;
      deletedCount: number;
    }

    /** Toggle version log status response */
    interface ToggleVersionLogStatusResponse {
      message: string;
      versionLog: VersionLog;
    }
  }
}

