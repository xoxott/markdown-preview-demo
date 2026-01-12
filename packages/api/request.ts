/**
 * 核心请求类
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { requestInterceptor, requestErrorInterceptor } from './interceptors/request';
import { responseInterceptor, responseErrorInterceptor } from './interceptors/response/index';
import { requestDedupeManager } from './utils/request/requestDedupe';
import { assertRequestOptions } from './utils/common/validators';
import { DEFAULT_TIMEOUT } from './constants';
import type { RequestConfig, ApiResponse, PageResponse } from './types';
import type { Plugin } from './plugins/types';
import type { Middleware } from './middleware/types';
import { MiddlewareManagerImpl } from './middleware/MiddlewareManager';
import type { RequestAdapter } from './adapters/types';
import { AxiosAdapter } from './adapters/AxiosAdapter';
import type { RequestQueueManager } from './utils/request/requestQueue';
import { createRequestQueue } from './utils/request/requestQueue';
import { cancelTokenManager } from './utils/request/cancel';
import type { TimeoutStrategy, RequestOptions } from './core/types';
import { ConfigManager } from './core/ConfigManager';
import { TimeoutManager } from './core/TimeoutManager';
import { CacheManager } from './core/CacheManager';
import { InterceptorManager } from './core/InterceptorManager';
import { PluginManager } from './core/PluginManager';
import { RequestExecutor } from './core/RequestExecutor';
import { FileOperations } from './methods/FileOperations';

/**
 * 请求类
 */
export class Request {
  private instance: AxiosInstance;
  private adapter: RequestAdapter;
  private defaultConfig: Partial<RequestConfig> = {};
  private defaultOptions: RequestOptions = {};
  private timeoutManager: TimeoutManager;
  private executor: RequestExecutor;
  private interceptorManager: InterceptorManager;
  private pluginManager: PluginManager;
  private middlewareManager: MiddlewareManagerImpl = new MiddlewareManagerImpl();
  private queueManager: RequestQueueManager | null = null;
  private fileOperations: FileOperations;

  constructor(config?: AxiosRequestConfig, options?: RequestOptions) {
    // 验证配置
    assertRequestOptions(options);

    const baseURL = options?.baseURL || '/api';
    const timeout = options?.timeout || DEFAULT_TIMEOUT;

    // 保存默认选项
    this.defaultOptions = { baseURL, timeout };

    // 初始化超时策略管理器
    this.timeoutManager = new TimeoutManager(
      TimeoutManager.createDefaultStrategy(timeout, options?.timeoutStrategy),
    );

    this.instance = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });

    // 创建默认的 Axios 适配器
    this.adapter = new AxiosAdapter(this.instance);

    // 创建请求执行器
    this.executor = new RequestExecutor(this.adapter, this.middlewareManager, null); // queueManager 稍后设置

    // 创建拦截器管理器
    this.interceptorManager = new InterceptorManager(this.instance);

    // 创建插件管理器
    this.pluginManager = new PluginManager();

    // 创建请求队列管理器（如果配置了队列）
    if (options?.queueConfig) {
      this.queueManager = createRequestQueue(options.queueConfig);
      // 更新执行器的队列管理器
      this.executor = new RequestExecutor(this.adapter, this.middlewareManager, this.queueManager);
    }

    // 设置默认拦截器
    this.interceptorManager.setupDefaultInterceptors(
      requestInterceptor,
      requestErrorInterceptor,
      responseInterceptor,
      responseErrorInterceptor as (error: AxiosError) => unknown,
    );

    // 初始化文件操作
    this.fileOperations = new FileOperations();
  }

  /**
   * 设置请求适配器
   * @param adapter 请求适配器实例
   */
  setAdapter(adapter: RequestAdapter): void {
    this.adapter = adapter;
    // 更新执行器的适配器
    this.executor = new RequestExecutor(this.adapter, this.middlewareManager, this.queueManager);
  }

  /**
   * 获取请求适配器
   * @returns 请求适配器实例
   */
  getAdapter(): RequestAdapter {
    return this.adapter;
  }

  /**
   * 设置默认请求配置（会与每个请求的配置合并）
   * @param config 默认配置
   */
  setDefaultConfig(config: Partial<RequestConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * 设置默认请求选项（baseURL、timeout 等）
   * @param options 默认选项
   */
  setDefaultOptions(options: Partial<RequestOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    // 更新 axios 实例的配置
    if (options.baseURL !== undefined) {
      this.instance.defaults.baseURL = options.baseURL;
    }
    if (options.timeout !== undefined) {
      this.instance.defaults.timeout = options.timeout;
    }
  }

  /**
   * 通用请求方法
   * @param config 请求配置
   * @returns Promise
   */
  protected async request<T = unknown>(config: RequestConfig): Promise<T> {
    // 合并默认配置和请求配置
    const mergedConfig = ConfigManager.mergeConfig(this.defaultConfig, config);
    const requestConfig = ConfigManager.prepareConfig(mergedConfig, config =>
      this.timeoutManager.getTimeout(config),
    );

    // 检查缓存（只有 GET 请求支持缓存）
    const cachedData = CacheManager.getCachedData<T>(config);
    if (cachedData !== null) {
      return cachedData;
    }

    // 执行请求的函数
    const executeRequest = async (): Promise<T> => {
      const result = await this.executor.execute<T>(requestConfig, config);

      // 缓存结果（只有 GET 请求支持缓存）
      CacheManager.setCacheData(config, result);

      return result;
    };

    // 如果启用去重（默认启用，除非明确设置为 false）
    if (config.dedupe !== false) {
      return requestDedupeManager.getOrCreateRequest(config, executeRequest);
    }

    // 不使用去重，直接执行
    return executeRequest();
  }

  /**
   * 设置超时策略
   * @param strategy 超时策略配置
   */
  setTimeoutStrategy(strategy: Partial<TimeoutStrategy>): void {
    this.timeoutManager.setTimeoutStrategy(strategy);
  }

  /**
   * GET请求
   * @param url 请求URL
   * @param params 请求参数
   * @param config 请求配置
   * @returns Promise
   */
  get<T = unknown>(url: string, params?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'GET',
      url,
      params,
    });
  }

  /**
   * POST请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'POST',
      url,
      data,
    });
  }

  /**
   * PUT请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'PUT',
      url,
      data,
    });
  }

  /**
   * DELETE请求
   * @param url 请求URL
   * @param config 请求配置
   * @returns Promise
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'DELETE',
      url,
    });
  }

  /**
   * PATCH请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'PATCH',
      url,
      data,
    });
  }

  /**
   * 文件上传
   * @param url 请求URL
   * @param file 文件或FormData
   * @param config 请求配置（支持 onUploadProgress 进度回调）
   * @returns Promise
   */
  upload<T = unknown>(url: string, file: File | FormData, config?: RequestConfig): Promise<T> {
    return this.fileOperations.upload<T>(url, file, config, this.post.bind(this));
  }

  /**
   * 文件下载
   * @param url 请求URL
   * @param params 请求参数
   * @param filename 文件名
   * @param config 请求配置（支持 onDownloadProgress 进度回调）
   * @returns Promise
   */
  download(
    url: string,
    params?: unknown,
    filename?: string,
    config?: RequestConfig,
  ): Promise<void> {
    return this.fileOperations.download(url, params, filename, config, this.get.bind(this));
  }

  /**
   * 取消请求
   * @param requestId 请求ID
   * @param message 取消原因
   */
  cancel(requestId: string, message?: string): void {
    cancelTokenManager.cancel(requestId, message);
  }

  /**
   * 取消所有请求
   * @param message 取消原因
   */
  cancelAll(message?: string): void {
    cancelTokenManager.cancelAll(message);
  }

  /**
   * 按条件取消请求
   * @param predicate 取消条件函数
   * @param message 取消原因
   * @returns 取消的请求数量
   */
  cancelBy(predicate: (config: RequestConfig) => boolean, message?: string): number {
    return cancelTokenManager.cancelBy(predicate, message);
  }

  /**
   * 取消指定 URL 模式的所有请求
   * @param pattern URL 匹配模式（正则表达式）
   * @param message 取消原因
   * @returns 取消的请求数量
   */
  cancelByUrlPattern(pattern: RegExp, message?: string): number {
    return this.cancelBy(config => pattern.test(config.url || ''), message);
  }

  /**
   * 取消指定方法的所有请求
   * @param method HTTP 方法
   * @param message 取消原因
   * @returns 取消的请求数量
   */
  cancelByMethod(method: string, message?: string): number {
    return this.cancelBy(
      config => (config.method || 'GET').toUpperCase() === method.toUpperCase(),
      message,
    );
  }

  /**
   * 获取axios实例（用于特殊需求）
   * @returns AxiosInstance
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }

  /**
   * 清除请求缓存
   * @param config 请求配置（可选，不传则清除所有缓存）
   */
  clearCache(config?: RequestConfig): void {
    CacheManager.clearCache(config);
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    CacheManager.cleanupCache();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { memoryCount: number; storageCount: number } {
    return CacheManager.getCacheStats();
  }

  /**
   * 添加请求拦截器
   * @param onFulfilled 成功回调
   * @param onRejected 失败回调
   * @returns 拦截器 ID（用于移除）
   */
  addRequestInterceptor(
    onFulfilled?: (
      config: InternalAxiosRequestConfig,
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
    onRejected?: (error: unknown) => unknown,
  ): number {
    return this.interceptorManager.addRequestInterceptor(onFulfilled, onRejected);
  }

  /**
   * 移除请求拦截器
   * @param id 拦截器 ID
   */
  removeRequestInterceptor(id: number): void {
    this.interceptorManager.removeRequestInterceptor(id);
  }

  /**
   * 添加响应拦截器
   * @param onFulfilled 成功回调
   * @param onRejected 失败回调
   * @returns 拦截器 ID（用于移除）
   */
  addResponseInterceptor(
    onFulfilled?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
    onRejected?: (error: AxiosError) => unknown,
  ): number {
    return this.interceptorManager.addResponseInterceptor(onFulfilled, onRejected);
  }

  /**
   * 移除响应拦截器
   * @param id 拦截器 ID
   */
  removeResponseInterceptor(id: number): void {
    this.interceptorManager.removeResponseInterceptor(id);
  }

  /**
   * 清除所有自定义拦截器（保留默认拦截器）
   */
  clearCustomInterceptors(): void {
    this.interceptorManager.clearCustomInterceptors();
  }

  /**
   * 安装插件
   * @param plugin 插件实例
   */
  use(plugin: Plugin): void {
    this.pluginManager.use(plugin, this);
  }

  /**
   * 卸载插件
   * @param pluginName 插件名称
   */
  unuse(pluginName: string): void {
    this.pluginManager.unuse(pluginName, this);
  }

  /**
   * 检查插件是否已安装
   * @param pluginName 插件名称
   * @returns 是否已安装
   */
  hasPlugin(pluginName: string): boolean {
    return this.pluginManager.hasPlugin(pluginName);
  }

  /**
   * 获取所有已安装的插件名称
   * @returns 插件名称列表
   */
  listPlugins(): string[] {
    return this.pluginManager.listPlugins();
  }

  /**
   * 清除所有插件
   */
  clearPlugins(): void {
    this.pluginManager.clearPlugins(this);
  }

  /**
   * 添加中间件
   * @param middleware 中间件函数
   */
  useMiddleware(middleware: Middleware): void {
    this.middlewareManager.use(middleware);
  }

  /**
   * 移除中间件
   * @param middleware 中间件函数
   */
  removeMiddleware(middleware: Middleware): void {
    this.middlewareManager.remove(middleware);
  }

  /**
   * 清除所有中间件
   */
  clearMiddlewares(): void {
    this.middlewareManager.clear();
  }
}

// 创建默认请求实例（需要在应用层传入配置）
export function createRequest(config?: AxiosRequestConfig, options?: RequestOptions): Request {
  return new Request(config, options);
}

// 导出类型
export type { RequestConfig, ApiResponse, PageResponse, TimeoutStrategy, RequestOptions };
