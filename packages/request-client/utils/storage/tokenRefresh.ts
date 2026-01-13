/**
 * Token 刷新工具
 */

import axios, { type AxiosRequestConfig } from 'axios';
import { DEFAULT_TOKEN_REFRESH_CONFIG, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../../constants';
import { storageManager } from './storage';

/**
 * Token 刷新选项
 */
export interface TokenRefreshOptions {
  refreshTokenUrl?: string;
  refreshTokenMethod?: 'GET' | 'POST' | 'PUT';
  refreshTokenParamKey?: string;
  tokenKeyInResponse?: string;
  refreshTokenKeyInResponse?: string;
  onRefreshSuccess?: (token: string, refreshToken: string) => void;
  onRefreshError?: (error: unknown) => void;
}

/**
 * Token 刷新管理器
 */
class TokenRefreshManager {
  private options: Required<TokenRefreshOptions> = {
    refreshTokenUrl: DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_URL,
    refreshTokenMethod: DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_METHOD,
    refreshTokenParamKey: DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_PARAM_KEY,
    tokenKeyInResponse: DEFAULT_TOKEN_REFRESH_CONFIG.TOKEN_KEY_IN_RESPONSE,
    refreshTokenKeyInResponse: DEFAULT_TOKEN_REFRESH_CONFIG.REFRESH_TOKEN_KEY_IN_RESPONSE,
    onRefreshSuccess: () => {},
    onRefreshError: () => {},
  };

  /**
   * 配置 Token 刷新
   */
  configure(options: TokenRefreshOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<string | null> {
    const refreshToken = storageManager.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return null;
    }

    try {
      const config: AxiosRequestConfig = {
        url: this.options.refreshTokenUrl,
        method: this.options.refreshTokenMethod,
      };

      if (this.options.refreshTokenMethod === 'POST' || this.options.refreshTokenMethod === 'PUT') {
        config.data = {
          [this.options.refreshTokenParamKey]: refreshToken,
        };
      } else {
        config.params = {
          [this.options.refreshTokenParamKey]: refreshToken,
        };
      }

      const response = await axios.request(config);
      const data = response.data;

      const newToken = data[this.options.tokenKeyInResponse];
      const newRefreshToken = data[this.options.refreshTokenKeyInResponse];

      if (newToken) {
        storageManager.setItem(TOKEN_KEY, newToken);
        if (newRefreshToken) {
          storageManager.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }
        this.options.onRefreshSuccess(newToken, newRefreshToken || refreshToken);
        return newToken;
      }

      return null;
    } catch (error) {
      this.options.onRefreshError(error);
      return null;
    }
  }
}

export const tokenRefreshManager = new TokenRefreshManager();

/**
 * 配置 Token 刷新
 */
export function configureTokenRefresh(options: TokenRefreshOptions): void {
  tokenRefreshManager.configure(options);
}

