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
    /** Business status code (200=success, 201=created, 1xxx-5xxx=error) */
    code: number;
    /** Response message (default "Success") */
    message: string;
    /** Timestamp (ISO format) */
    timestamp: string;
  }

  /**
   * List data format (after transformBackendResponse)
   * This is what you get from request<ListResponse<T>>().data
   *
   * @template T Item type in lists array
   */
  interface ListData<T = any> {
    /** Data list */
    lists: T[];
    /** Pagination metadata */
    meta: {
      /** Current page */
      page: number;
      /** Items per page */
      limit: number;
      /** Total count */
      total: number;
      /** Total pages */
      totalPages: number;
      /** Whether has previous page */
      hasPrevPage: boolean;
      /** Whether has next page */
      hasNextPage: boolean;
    };
  }

  /**
   * Unified list response format (raw API response)
   * After transformBackendResponse, you get ListData<T>
   *
   * @template T Item type in lists array
   */
  interface ListResponse<T = any> {
    /** Response data */
    data: ListData<T>;
    /** Business status code (200=success, 201=created, 1xxx-5xxx=error) */
    code: number;
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
    /** Business error code (1xxx-5xxx range) */
    code: number;
    /** Error message */
    message: string;
    /** Error details */
    details?: Record<string, any>;
    /** Timestamp (ISO format) */
    timestamp: string;
    /** Request path */
    path?: string;
    /** Error type (optional) */
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

