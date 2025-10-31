/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:05:26
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-31 15:56:01
 * @FilePath: \markdown-preview-demo\src\hooks\upload\constants.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// ==================== 常量定义 ====================
/**
 * 上传模块全局常量
 */
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
    MAX_RETRIES:3
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
      FAIR: 100,
    },
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
    COMPLETE:100
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
    DEFAULT_CHUNKS: 10,
  },

  /** 可重试的错误关键字，用于判断是否需要自动重试 */
  RETRYABLE_ERROR_KEYWORDS: [
    'networkerror', 
    'timeouterror',
    'aborterror',
    'fetch',
    'network',
    'timeout',
    '5', // 表示 5xx 服务器错误
  ],

  /** 上传相关配置 */
  UPLOAD:{
    /** 超时时间 */
    TIMEOUT:60000,
    /** 分块大小 */
    CHUNK_SIZE:2 * 1024 * 1024,
    /** 最小分块大小 */
    MIN_CHUNK_SIZE:512 * 1024,
    /** 最大分块大小 */
    MAX_CHUNK_SIZE:20 * 1024 * 1024,
    /** 最大文件 */
    MAX_FILESIZE:1 * 1024 * 1024 * 1024,
    /** 最大文件数量 */
    MAX_FILES: 1000
  },

  /** 压缩相关配置 */
  COMPRESSION:{
      /** 图片压缩启用状态 */
      ENABLE_COMPRESSION:true,
      /** 压缩质量百分比 */
      COMPRESSION_QUALITY:0.8, 
  },
  /** 预览相关配置 */
  PREVIEW:{
      /** 预览启用状态 */
      ENABLE_PREVIEW:true,
      /** 预览图宽度 */
      PREVIEW_MAX_WIDTH:200,
      /** 预览图高度 */
      PREVIEW_MAX_HEIGHT:200
  }
} as const;