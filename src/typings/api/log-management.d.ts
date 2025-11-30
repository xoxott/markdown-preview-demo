/**
 * Log Management API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace LogManagement
   *
   * backend api module: "log-management"
   */
  namespace LogManagement {
    /** Log information */
    interface Log {
      id: number;
      action: string;
      module: string | null;
      userId: number | null;
      username: string | null;
      ip: string | null;
      userAgent: string | null;
      requestMethod: string | null;
      requestUrl: string | null;
      requestBody: string | null;
      responseStatus: number | null;
      responseBody: string | null;
      duration: number | null;
      error: string | null;
      createdAt: string;
    }

    /** Log list query parameters */
    interface LogListParams extends Common.PaginationParams {
      /** Search keyword (action, module, username, url) */
      search?: string;
      /** Filter by action */
      action?: string;
      /** Filter by module */
      module?: string;
      /** Filter by user ID */
      userId?: number;
      /** Filter by IP */
      ip?: string;
      /** Filter by response status */
      responseStatus?: number;
      /** Filter by start date */
      startDate?: string;
      /** Filter by end date */
      endDate?: string;
      /** Sort by field */
      sortBy?: string;
      /** Sort order (asc or desc) */
      sortOrder?: 'asc' | 'desc';
    }

    /** Delete log request */
    interface DeleteLogRequest {
      id: number;
    }

    /** Batch delete logs request */
    interface BatchDeleteLogsRequest {
      ids: number[];
    }

    /** Clear logs request */
    interface ClearLogsRequest {
      /** Optional: clear logs before this date */
      beforeDate?: string;
    }

    /** Log list response */
    type LogListResponse = ListResponse<Log>;

    /** Log detail response */
    type LogDetailResponse = Log;

    /** Delete log response */
    interface DeleteLogResponse {
      message: string;
    }

    /** Batch delete logs response */
    interface BatchDeleteLogsResponse {
      message: string;
      deletedCount: number;
    }

    /** Clear logs response */
    interface ClearLogsResponse {
      message: string;
      deletedCount: number;
    }
  }
}

