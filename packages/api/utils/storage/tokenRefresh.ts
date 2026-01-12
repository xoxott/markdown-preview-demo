/**
 * Token 刷新工具
 */

import axios, { type AxiosResponse } from 'axios';
import {
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  DEFAULT_TIMEOUT,
  DEFAULT_TOKEN_REFRESH_CONFIG,
} from '../../constants';
import { storageManager } from './storage';
import { internalError } from '../common/internalLogger';

/**
 * Token 刷新响应数据接口
 */
interface TokenRefreshResponse {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}

/**
 * Token 刷新配置
 */
export interface TokenRefreshOptions {
  /** 刷新 token 的接口地址 */
  refreshTokenUrl?: string;
  /** 刷新 token 的方法 */
  refreshTokenMethod?: 'GET' | 'POST';
  /** 刷新 token 的请求参数键名 */
  refreshTokenParamKey?: string;
  /** 刷新 token 的响应数据中 token 的键名 */
  tokenKeyInResponse?: string;
  /** 刷新 token 的响应数据中 refreshToken 的键名 */
  refreshTokenKeyInResponse?: string;
  /** 刷新失败后的回调 */
  onRefreshFailed?: () => void;
}

/**
 * Token 刷新管理器
 */
class TokenRefreshManager {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private failedQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
  }> = [];
  private options: TokenRefreshOptions;

  constructor(options: TokenRefreshOptions = {}) {
    this.options = {
      refreshTokenUrl: DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_URL,
      refreshTokenMethod: DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_METHOD,
      refreshTokenParamKey: DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_PARAM_KEY,
      tokenKeyInResponse: DEFAULT_TOKEN_REFRESH_CONFIG.TOKEN_KEY_IN_RESPONSE,
      refreshTokenKeyInResponse: DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_KEY_IN_RESPONSE,
      ...options,
    };
  }

  /**
   * 更新配置
   */
  setOptions(options: Partial<TokenRefreshOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 获取刷新 token
   */
  private getRefreshToken(): string | null {
    return storageManager.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * 保存 token
   */
  private saveToken(token: string, refreshToken?: string): void {
    storageManager.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      storageManager.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  /**
   * 清除 token
   */
  private clearToken(): void {
    storageManager.removeItem(TOKEN_KEY);
    storageManager.removeItem(REFRESH_TOKEN_KEY);
  }

  /**
   * 处理等待队列（成功）
   */
  private resolveQueue(token: string | null): void {
    this.failedQueue.forEach(({ resolve }) => resolve(token));
    this.failedQueue = [];
  }

  /**
   * 处理等待队列（失败）
   */
  private rejectQueue(error: unknown): void {
    this.failedQueue.forEach(({ reject }) => reject(error));
    this.failedQueue = [];
  }

  /**
   * 重置刷新状态
   */
  private resetRefreshState(): void {
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * 刷新 token
   */
  async refreshToken(): Promise<string | null> {
    // 如果正在刷新，返回现有的 Promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // 检查是否有 refreshToken
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.handleRefreshFailed();
      return null;
    }

    // 开始刷新
    this.isRefreshing = true;
    this.refreshPromise = this.doRefreshToken(refreshToken);

    try {
      const newToken = await this.refreshPromise;
      // 刷新成功，处理等待队列
      this.resolveQueue(newToken);
      return newToken;
    } catch (error) {
      // 刷新失败，处理等待队列
      this.rejectQueue(error);
      this.handleRefreshFailed();
      throw error;
    } finally {
      this.resetRefreshState();
    }
  }

  /**
   * 创建刷新 token 的 axios 实例
   */
  private createRefreshAxiosInstance() {
    return axios.create({
      timeout: DEFAULT_TIMEOUT,
    });
  }

  /**
   * 执行刷新 token 请求
   */
  private async executeRefreshRequest(
    refreshAxios: ReturnType<typeof axios.create>,
    refreshToken: string,
  ): Promise<AxiosResponse<TokenRefreshResponse>> {
    const { refreshTokenUrl, refreshTokenMethod, refreshTokenParamKey } = this.options;

    if (!refreshTokenUrl) {
      throw new Error('刷新 token 接口地址未配置');
    }

    const paramKey = refreshTokenParamKey || DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_PARAM_KEY;
    const requestData = { [paramKey]: refreshToken };

    if (refreshTokenMethod === 'GET') {
      return refreshAxios.get<TokenRefreshResponse>(refreshTokenUrl, {
        params: requestData,
      });
    }

    return refreshAxios.post<TokenRefreshResponse>(refreshTokenUrl, requestData);
  }

  /**
   * 从响应数据中提取 token
   */
  private extractTokenFromResponse(data: TokenRefreshResponse): string | null {
    const { tokenKeyInResponse } = this.options;
    const tokenKey = tokenKeyInResponse || DEFAULT_TOKEN_REFRESH_CONFIG.TOKEN_KEY_IN_RESPONSE;

    // 尝试多种可能的 token 键名
    const token = (data[tokenKey] as string | undefined) || data.token || data.accessToken || null;

    return token && typeof token === 'string' ? token : null;
  }

  /**
   * 从响应数据中提取 refreshToken
   */
  private extractRefreshTokenFromResponse(data: TokenRefreshResponse): string | undefined {
    const { refreshTokenKeyInResponse } = this.options;
    const refreshTokenKey =
      refreshTokenKeyInResponse || DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_KEY_IN_RESPONSE;

    // 尝试多种可能的 refreshToken 键名
    const refreshToken = (data[refreshTokenKey] as string | undefined) || data.refreshToken;

    return refreshToken && typeof refreshToken === 'string' ? refreshToken : undefined;
  }

  /**
   * 执行刷新 token 请求
   */
  private async doRefreshToken(refreshToken: string): Promise<string | null> {
    try {
      // 创建临时 axios 实例，避免触发拦截器
      const refreshAxios = this.createRefreshAxiosInstance();

      // 执行刷新请求
      const response = await this.executeRefreshRequest(refreshAxios, refreshToken);

      // 验证响应数据
      const data = response.data;
      if (!data || typeof data !== 'object') {
        throw new Error('刷新 token 失败：响应数据格式错误');
      }

      // 提取 token
      const newToken = this.extractTokenFromResponse(data);
      if (!newToken) {
        throw new Error('刷新 token 失败：响应中未找到有效的 token');
      }

      // 提取 refreshToken（可选）
      const newRefreshToken = this.extractRefreshTokenFromResponse(data);

      // 保存新的 token
      this.saveToken(newToken, newRefreshToken);

      return newToken;
    } catch (error) {
      internalError('刷新 token 失败:', error);
      throw error;
    }
  }

  /**
   * 默认刷新失败处理（跳转到登录页）
   */
  private defaultRefreshFailedHandler(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    } catch (error) {
      internalError('跳转登录页失败:', error);
    }
  }

  /**
   * 处理刷新失败
   */
  private handleRefreshFailed(): void {
    this.clearToken();

    if (this.options.onRefreshFailed) {
      try {
        this.options.onRefreshFailed();
      } catch (error) {
        internalError('刷新失败回调执行失败:', error);
        // 回调失败时，使用默认处理
        this.defaultRefreshFailedHandler();
      }
    } else {
      this.defaultRefreshFailedHandler();
    }
  }

  /**
   * 等待 token 刷新完成
   * @param timeout 超时时间（毫秒），默认 30 秒
   * @returns Promise，如果超时则返回 null
   */
  async waitForRefresh(timeout: number = 30000): Promise<string | null> {
    if (!this.isRefreshing) {
      return null;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      new Promise<string | null>((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }),
      new Promise<string | null>(resolve => {
        timeoutId = setTimeout(() => {
          resolve(null);
        }, timeout);
      }),
    ]).finally(() => {
      // 清理超时定时器，避免内存泄漏
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });
  }

  /**
   * 检查是否正在刷新
   */
  isRefreshingToken(): boolean {
    return this.isRefreshing;
  }
}

// 创建全局 Token 刷新管理器实例
export const tokenRefreshManager = new TokenRefreshManager();

/**
 * 配置 Token 刷新选项
 */
export function configureTokenRefresh(options: TokenRefreshOptions): void {
  tokenRefreshManager.setOptions(options);
}
