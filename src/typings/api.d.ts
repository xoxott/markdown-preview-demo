/**
 * Namespace Api
 *
 * All backend api type
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
   * Paginated response format
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
    /** Error message */
    message: string;
    /** Timestamp (ISO format) */
    timestamp: string;
    /** Request path */
    path: string;
    /** HTTP method */
    method: string;
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

  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    /** Login token response */
    interface LoginToken {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }

    /** User role information */
    interface UserRole {
      id: number;
      name: string;
      code: string;
    }

    /** User information */
    interface UserInfo {
      id: number;
      username: string;
      email: string;
      avatar: string | null;
      isActive: boolean;
      lastLoginAt: string;
      lastActivityAt: string;
      isOnline: boolean;
      createdAt: string;
      updatedAt: string;
      roles: UserRole[];
      /** Role codes extracted from roles array (for compatibility) */
      role?: string;
      /** Button permissions (may not be returned by API) */
      buttons?: string[];
    }

    /** Login step 1 request */
    interface LoginStep1Request {
      username: string;
      password: string;
    }

    /** Login step 1 response - success without verification */
    interface LoginStep1SuccessResponse {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      requiresVerification: false;
      message: string;
    }

    /** Login step 1 response - requires verification */
    interface LoginStep1VerificationResponse {
      temporaryToken: string;
      requiresVerification: true;
      riskScore: number;
      riskFactors: string[];
      message: string;
      expiresIn: number;
    }

    /** Login step 1 response (union type) */
    type LoginStep1Response = LoginStep1SuccessResponse | LoginStep1VerificationResponse;

    /** Login step 2 request */
    interface LoginStep2Request {
      temporaryToken: string;
      code: string;
    }

    /** Login step 2 response */
    interface LoginStep2Response {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: UserInfo;
    }

    /** Register request */
    interface RegisterRequest {
      username: string;
      email: string;
      password: string;
      verificationCode: string;
    }

    /** Register response */
    interface RegisterResponse {
      message: string;
      user?: UserInfo;
    }

    /** Send registration code request */
    interface SendCodeRequest {
      email: string;
    }

    /** Send registration code response */
    interface SendCodeResponse {
      message: string;
    }

    /** Refresh token request */
    interface RefreshTokenRequest {
      refreshToken: string;
    }

    /** Refresh token response */
    interface RefreshTokenResponse {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }

    /** Logout response */
    interface LogoutResponse {
      message: string;
    }
  }

  /**
   * namespace Route
   *
   * backend api module: "route"
   */
  namespace Route {
    type ElegantConstRoute = import('@elegant-router/types').ElegantConstRoute;

    interface MenuRoute extends ElegantConstRoute {
      id: string;
    }

    interface UserRoute {
      routes: MenuRoute[];
      home: import('@elegant-router/types').LastLevelRouteKey;
    }
  }

  /**
   * namespace Health
   *
   * backend api module: "health"
   */
  namespace Health {
    /** Health check response */
    interface HealthCheckResponse {
      status: 'ok' | 'error';
      timestamp: string;
      [key: string]: any;
    }

    /** Liveness probe response */
    interface LivenessResponse {
      status: 'ok' | 'error';
      timestamp: string;
    }

    /** Readiness probe response */
    interface ReadinessResponse {
      status: 'ok' | 'error';
      timestamp: string;
    }
  }

  /**
   * namespace System
   *
   * backend api module: "system"
   */
  namespace System {
    /** System information */
    interface SystemInfo {
      /** Operating system */
      os?: string;
      /** System version */
      version?: string;
      /** Node version */
      nodeVersion?: string;
      /** Uptime in seconds */
      uptime?: number;
      /** System hostname */
      hostname?: string;
      /** Platform */
      platform?: string;
      /** Architecture */
      arch?: string;
      /** CPU count */
      cpuCount?: number;
      [key: string]: any;
    }

    /** Performance metrics */
    interface PerformanceMetrics {
      /** CPU usage percentage */
      cpu?: {
        usage: number;
        cores: number;
        model?: string;
      };
      /** Memory usage */
      memory?: {
        total: number;
        used: number;
        free: number;
        usage: number;
      };
      /** Disk usage */
      disk?: {
        total: number;
        used: number;
        free: number;
        usage: number;
        path?: string;
      };
      /** Load average */
      loadAverage?: number[];
      [key: string]: any;
    }

    /** Environment information */
    interface EnvironmentInfo {
      /** Environment variables (filtered) */
      env?: Record<string, string>;
      /** Application environment */
      nodeEnv?: string;
      /** Process information */
      process?: {
        pid: number;
        ppid: number;
        title: string;
        argv: string[];
        execPath: string;
      };
      [key: string]: any;
    }
  }

  /**
   * namespace Monitoring
   *
   * backend api module: "monitoring"
   */
  namespace Monitoring {
    /** Metrics summary */
    interface MetricsSummary {
      /** Total requests */
      totalRequests?: number;
      /** Active connections */
      activeConnections?: number;
      /** Request rate per second */
      requestRate?: number;
      /** Error rate */
      errorRate?: number;
      /** Average response time */
      avgResponseTime?: number;
      /** Timestamp */
      timestamp?: string;
      [key: string]: any;
    }
  }
}
