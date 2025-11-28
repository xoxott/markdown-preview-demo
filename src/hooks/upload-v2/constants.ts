/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:05:26
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-31 15:56:01
 * @FilePath: \markdown-preview-demo\src\hooks\upload-v2\constants.ts
 * @Description: 上传模块全局常量
 */
// ==================== 常量定义 ====================
/** 上传模块全局常量 */
export const CONSTANTS = {
  /** 重试相关配置 */
  RETRY: {
    /** 最大延迟（毫秒） */
    MAX_DELAY: 30000,
    /** 分片上传最大延迟（毫秒） */
    CHUNK_MAX_DELAY: 10000,
    /** 基础延迟（毫秒） */
    BASE_DELAY: 1000,
    /** 指数退避倍数 */
    BACKOFF_MULTIPLIER: 1.5,
    /** 最大重试次数 */
    MAX_RETRIES: 3
  },

  /** 网络相关配置 */
  NETWORK: {
    /** 网络适配调整间隔（毫秒） */
    ADJUST_INTERVAL: 10000,
    /** 网络速度轮询间隔（毫秒） */
    POLL_INTERVAL: 50,
    /** 网络速度质量阈值（单位 KB/s） */
    QUALITY_THRESHOLDS: {
      /** 大于此值判定为良好网络 */
      GOOD: 1000,
      /** 大于此值判定为一般网络 */
      FAIR: 100
    },
    /** 网络自适应速度阈值（单位 KB/s） */
    ADAPTATION: {
      /** 慢速网络阈值，低于此值降低并发 */
      SLOW_THRESHOLD: 50,
      /** 快速网络阈值，高于此值提高并发 */
      FAST_THRESHOLD: 500,
      /** 速度历史记录窗口大小 */
      SPEED_HISTORY_SIZE: 5
    },
    /** 网络指标阈值 */
    METRICS: {
      /** 下行速度阈值（Mbps） */
      DOWNLINK: {
        /** 低于此值判定为差网络 */
        POOR: 1,
        /** 高于此值判定为好网络 */
        GOOD: 10
      },
      /** RTT 延迟阈值（毫秒） */
      RTT: {
        /** 低于此值判定为低延迟 */
        LOW: 50,
        /** 高于此值判定为高延迟 */
        HIGH: 300
      }
    },
    /** 网络自适应并发限制 */
    CONCURRENT_LIMITS: {
      /** 最小并发文件数 */
      MIN_FILES: 1,
      /** 最小并发分片数 */
      MIN_CHUNKS: 2,
      /** 最大并发文件数 */
      MAX_FILES: 6,
      /** 最大并发分片数 */
      MAX_CHUNKS: 12
    },
    /** 网络自适应分片大小限制（字节） */
    CHUNK_SIZE_LIMITS: {
      /** 差网络最小分片大小 */
      POOR_MIN: 256 * 1024,
      /** 好网络最大分片大小 */
      GOOD_MAX: 8 * 1024 * 1024,
      /** 省流模式最大分片大小 */
      SAVE_DATA_MAX: 512 * 1024
    }
  },

  /** 上传进度相关配置 */
  PROGRESS: {
    /** 分片占总进度权重（百分比） */
    CHUNK_WEIGHT: 90,
    /** 文件合并开始进度（百分比） */
    MERGE_START: 92,
    /** 文件合并结束进度（百分比） */
    MERGE_END: 95,
    /** 文件合并进度（百分比） */
    COMPLETE: 100
  },

  /** 并发控制相关 */
  CONCURRENT: {
    /** 差网络下最大并发分片数 */
    POOR_NETWORK: 2,
    /** 中等网络下最大并发分片数 */
    FAIR_NETWORK: 4,
    /** 好网络下最大并发分片数 */
    GOOD_NETWORK: 10,
    /** 默认同时上传文件数,并发数量 */
    DEFAULT_FILES: 10,
    /** 默认同时上传分片数，并发切块 */
    DEFAULT_CHUNKS: 10
  },

  /** 可重试的错误关键字，用于判断是否需要自动重试 */
  RETRYABLE_ERROR_KEYWORDS: [
    'networkerror',
    'timeouterror',
    'aborterror',
    'fetch',
    'network',
    'timeout',
    '5' // 表示 5xx 服务器错误
  ],

  /** 上传相关配置 */
  UPLOAD: {
    /** 超时时间 */
    TIMEOUT: 60000,
    /** 分块大小 */
    CHUNK_SIZE: 2 * 1024 * 1024,
    /** 最小分块大小 */
    MIN_CHUNK_SIZE: 512 * 1024,
    /** 最大分块大小 */
    MAX_CHUNK_SIZE: 20 * 1024 * 1024,
    /** 最大文件 */
    MAX_FILESIZE: 1 * 1024 * 1024 * 1024,
    /** 最大文件数量 */
    MAX_FILES: 500
  },

  /** 压缩相关配置 */
  COMPRESSION: {
    /** 图片压缩启用状态 */
    ENABLE_COMPRESSION: true,
    /** 压缩质量百分比 */
    COMPRESSION_QUALITY: 0.8
  },
  /** 预览相关配置 */
  PREVIEW: {
    /** 预览启用状态 */
    ENABLE_PREVIEW: true,
    /** 预览图宽度 */
    PREVIEW_MAX_WIDTH: 200,
    /** 预览图高度 */
    PREVIEW_MAX_HEIGHT: 200
  },

  /** Worker 相关配置 */
  WORKER: {
    /** 默认 Worker 数量 */
    DEFAULT_COUNT: 4,
    /** 默认 Worker URL */
    DEFAULT_URL: '/workers/md5.worker.js',
    /** Worker URL 清理延迟（毫秒） */
    URL_CLEANUP_DELAY: 1000
  }
} as const;

