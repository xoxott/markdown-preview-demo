/**
 * System API types
 */

declare namespace Api {
  /**
   * namespace System
   *
   * backend api module: "system"
   */
  namespace System {
    /** System information */
    interface SystemInfo {
      /** Operating system information */
      os?: {
        platform: string;
        type: string;
        release: string;
        arch: string;
        hostname: string;
        uptime: number;
      };
      /** CPU information */
      cpu?: {
        model: string;
        cores: number;
        speed: number;
        usage: {
          usage: string;
          idle: number;
          total: number;
        };
      };
      /** Memory information */
      memory?: {
        total: number;
        free: number;
        used: number;
        usagePercent: string;
      };
      /** Process information */
      process?: {
        pid: number;
        version: string;
        uptime: number;
        memoryUsage: {
          rss: number;
          heapTotal: number;
          heapUsed: number;
          external: number;
          arrayBuffers?: number;
        };
      };
      /** Network interfaces */
      network?: Record<string, Array<{
        address: string;
        netmask: string;
        family: string;
        mac: string;
        internal: boolean;
        cidr?: string;
        scopeid?: number;
      }>>;
      [key: string]: any;
    }

    /** Performance metrics */
    interface PerformanceMetrics {
      /** Timestamp */
      timestamp?: string;
      /** Memory usage */
      memory?: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        arrayBuffers?: number;
      };
      /** CPU usage */
      cpu?: {
        user: number;
        system: number;
      };
      /** Process uptime in seconds */
      uptime?: number;
      /** Load average */
      loadAverage?: number[];
      [key: string]: any;
    }

    /** Environment information */
    interface EnvironmentInfo {
      /** Node.js version */
      nodeVersion?: string;
      /** Platform */
      platform?: string;
      /** Architecture */
      arch?: string;
      /** Environment */
      env?: string;
      /** Current working directory */
      cwd?: string;
      /** Executable path */
      execPath?: string;
      [key: string]: any;
    }
  }
}

