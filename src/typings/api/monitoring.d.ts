/**
 * Monitoring API types
 */

declare namespace Api {
  /**
   * namespace Monitoring
   *
   * backend api module: "monitoring"
   */
  namespace Monitoring {
    /** Metrics summary */
    interface MetricsSummary {
      /** Memory usage */
      memory?: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
        external: number;
      };
      /** CPU usage */
      cpu?: {
        user: number;
        system: number;
      };
      /** Process uptime in seconds */
      uptime?: number;
      /** Timestamp */
      timestamp?: string;
      [key: string]: any;
    }
  }
}

