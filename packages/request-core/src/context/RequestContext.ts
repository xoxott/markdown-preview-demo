/**
 * 请求上下文（Request Context）
 * 请求的唯一事实来源，所有 Step 通过 Context 通信
 */
export interface NormalizedRequestConfig {
  readonly url: string;
  readonly method: string;
  readonly baseURL?: string;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
  readonly params?: unknown;
  readonly data?: unknown;
  readonly responseType?: string;
  readonly signal?: AbortSignal;
  readonly onUploadProgress?: (progressEvent: unknown) => void;
  readonly onDownloadProgress?: (progressEvent: unknown) => void;
  [key: string]: unknown;
}

/**
 * 请求状态
 */
export interface RequestState {
  /** 是否已取消 */
  aborted: boolean;
  /** 是否来自缓存 */
  fromCache: boolean;
  /** 是否正在重试 */
  retrying: boolean;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 请求上下文
 * 请求生命周期内的唯一共享对象
 */
export interface RequestContext<T = unknown> {
  /** 请求唯一标识 */
  readonly id: string;
  /** 标准化请求配置（只读，禁止修改） */
  readonly config: NormalizedRequestConfig;
  /** 请求状态（可修改） */
  state: RequestState;
  /** 元数据（用于 Step 之间传递信息，业务层可在此存储业务相关配置） */
  meta: Record<string, unknown>;
  /** 请求结果 */
  result?: T;
  /** 请求错误 */
  error?: unknown;
}

/**
 * 创建请求上下文
 * @param config 标准化请求配置（只包含传输层需要的字段）
 * @param id 请求唯一标识（可选，不提供则自动生成）
 * @param meta 元数据（可选，用于业务层传递额外信息）
 */
export function createRequestContext<T = unknown>(
  config: NormalizedRequestConfig,
  id?: string,
  meta?: Record<string, unknown>,
): RequestContext<T> {
  const requestId =
    id ||
    `${config.method || 'GET'}:${config.url || ''}:${JSON.stringify(config.params || config.data || {})}`;

  return {
    id: requestId,
    config,
    state: {
      aborted: false,
      fromCache: false,
      retrying: false,
      retryCount: 0,
    },
    meta: meta || {},
    result: undefined,
    error: undefined,
  };
}

