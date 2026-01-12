/**
 * 拦截器管理模块
 */

import type { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * 拦截器管理器
 */
export class InterceptorManager {
  private instance: AxiosInstance;
  private requestInterceptorIds: number[] = [];
  private responseInterceptorIds: number[] = [];

  constructor(instance: AxiosInstance) {
    this.instance = instance;
  }

  /**
   * 设置默认拦截器
   * @param requestInterceptor 请求拦截器
   * @param requestErrorInterceptor 请求错误拦截器
   * @param responseInterceptor 响应拦截器
   * @param responseErrorInterceptor 响应错误拦截器
   */
  setupDefaultInterceptors(
    requestInterceptor: (
      config: InternalAxiosRequestConfig,
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
    requestErrorInterceptor: (error: unknown) => unknown,
    responseInterceptor: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
    responseErrorInterceptor: (error: AxiosError) => unknown,
  ): void {
    // 请求拦截器
    this.instance.interceptors.request.use(requestInterceptor, requestErrorInterceptor);

    // 响应拦截器
    this.instance.interceptors.response.use(responseInterceptor, responseErrorInterceptor);
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
    const id = this.instance.interceptors.request.use(onFulfilled, onRejected);
    this.requestInterceptorIds.push(id);
    return id;
  }

  /**
   * 移除请求拦截器
   * @param id 拦截器 ID
   */
  removeRequestInterceptor(id: number): void {
    this.instance.interceptors.request.eject(id);
    this.requestInterceptorIds = this.requestInterceptorIds.filter(i => i !== id);
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
    const id = this.instance.interceptors.response.use(onFulfilled, onRejected);
    this.responseInterceptorIds.push(id);
    return id;
  }

  /**
   * 移除响应拦截器
   * @param id 拦截器 ID
   */
  removeResponseInterceptor(id: number): void {
    this.instance.interceptors.response.eject(id);
    this.responseInterceptorIds = this.responseInterceptorIds.filter(i => i !== id);
  }

  /**
   * 清除所有自定义拦截器（保留默认拦截器）
   */
  clearCustomInterceptors(): void {
    this.requestInterceptorIds.forEach(id => this.instance.interceptors.request.eject(id));
    this.responseInterceptorIds.forEach(id => this.instance.interceptors.response.eject(id));
    this.requestInterceptorIds = [];
    this.responseInterceptorIds = [];
  }
}
