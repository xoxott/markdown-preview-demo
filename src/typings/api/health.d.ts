/**
 * Health API types
 */

declare namespace Api {
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
}

