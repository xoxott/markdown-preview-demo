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
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      domainEvents: any[];
      version: number;
      userId: number | null;
      method: string | null;
      path: string | null;
      statusCode: number | null;
      ip: string | null;
      responseTime: number | null;
      error: string | null;
    }

    /** Log list query parameters */
    interface LogListParams extends Common.PaginationParams {
      /** Search keyword (path, method) */
      search?: string;
      /** Filter by user ID */
      userId?: number;
      /** Filter by IP */
      ip?: string;
      /** Filter by status code */
      statusCode?: number;
      /** Filter by method */
      method?: string;
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
    type LogListResponse = ListData<Log>;

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

