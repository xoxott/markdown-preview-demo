/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:05:26
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:06:31
 * @FilePath: \markdown-preview-demo\src\hooks\upload\constants.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// ==================== 常量定义 ====================
export  const CONSTANTS = {
  RETRY: {
    MAX_DELAY: 30000,
    CHUNK_MAX_DELAY: 10000,
    BASE_DELAY: 1000,
    BACKOFF_MULTIPLIER: 1.5,
  },
  NETWORK: {
    ADJUST_INTERVAL: 10000,
    POLL_INTERVAL: 50,
    QUALITY_THRESHOLDS: {
      GOOD: 1000,
      FAIR: 100,
    },
  },
  PROGRESS: {
    CHUNK_WEIGHT: 90,
    MERGE_START: 92,
    MERGE_END: 95,
  },
  CONCURRENT: {
    POOR_NETWORK: 2,
    FAIR_NETWORK: 4,
    GOOD_NETWORK: 6,
    DEFAULT_FILES: 3,
    DEFAULT_CHUNKS: 6,
  },
  RETRYABLE_ERROR_KEYWORDS: [
    'networkerror',
    'timeouterror',
    'aborterror',
    'fetch',
    'network',
    'timeout',
    '5', // 5xx errors
  ],
} as const;