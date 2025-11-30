/**
 * Common API types
 */

declare namespace Api {
  /**
   * Standard response format
   *
   * @template T Response data type
   */
  interface Response<T = any> {
    /** Response data */
    data: T;
    /** HTTP status code */
    statusCode: number;
    /** Response message (default "Success") */
    message: string;
    /** Timestamp (ISO format) */
    timestamp: string;
  }

  /**
   * Unified list response format
   *
   * @template T Item type in lists array
   */
  interface ListResponse<T = any> {
    /** Response data */
    data: {
      /** Data list */
      lists: T[];
      /** Total count */
      total: number;
      /** Current page */
      page: number;
      /** Items per page */
      limit: number;
      /** Total pages */
      totalPages: number;
    };
    /** HTTP status code */
    statusCode: number;
    /** Response message */
    message: string;
    /** Timestamp (ISO format) */
    timestamp: string;
  }

  /**
   * Paginated response format (legacy, for backward compatibility)
   *
   * @template T Item type in data array
   */
  interface PaginatedResponse<T = any> {
    /** Data list */
    data: T[];
    /** Pagination metadata */
    meta: {
      /** Total count */
      total: number;
      /** Current page */
      page: number;
      /** Items per page */
      limit: number;
      /** Total pages */
      totalPages: number;
      /** Whether has next page */
      hasNextPage: boolean;
      /** Whether has previous page */
      hasPreviousPage: boolean;
    };
  }

  /**
   * Error response format
   */
  interface ErrorResponse {
    /** HTTP status code */
    statusCode: number;
    /** Error code (more specific than statusCode, e.g. 40101 for token expired) */
    errorCode?: number;
    /** Error message */
    message: string;
    /** Timestamp (ISO format) */
    timestamp: string;
    /** Request path */
    path: string;
    /** HTTP method */
    method: string;
    /** Error type */
    error?: string;
  }

  namespace Common {
    /** Pagination query parameters */
    interface PaginationParams {
      /** Current page number (starts from 1) */
      page: number;
      /** Items per page */
      limit: number;
    }

    /**
     * enable status
     *
     * - "1": enabled
     * - "2": disabled
     */
    type EnableStatus = '1' | '2';

    /** common record */
    type CommonRecord<T = any> = {
      /** record id */
      id: number;
      /** record creator */
      createBy: string;
      /** record create time */
      createTime: string;
      /** record updater */
      updateBy: string;
      /** record update time */
      updateTime: string;
      /** record status */
      status: EnableStatus | null;
    } & T;
  }
}

