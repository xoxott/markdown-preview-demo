/**
 * Token 管理示例
 * 展示 Token 的配置、刷新和使用
 */

import { createRequest } from '../request';
import { configureTokenRefresh } from '../utils/storage/tokenRefresh';
import { storageManager } from '../utils/storage/storage';
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants';

// ========== 配置 Token 刷新 ==========

/**
 * 配置 Token 刷新
 * 在应用启动时调用
 */
export function setupTokenRefresh() {
  configureTokenRefresh({
    refreshTokenUrl: '/api/auth/refresh',
    refreshTokenMethod: 'POST',
    refreshTokenParamKey: 'refreshToken',
    tokenKeyInResponse: 'token',
    refreshTokenKeyInResponse: 'refreshToken',
    onRefreshFailed: () => {
      // Token 刷新失败，跳转到登录页
      console.log('Token 刷新失败，跳转到登录页');
      window.location.href = '/login';
    },
  });
}

// ========== Token 存储和获取 ==========

/**
 * 保存 Token
 */
export function saveToken(token: string, refreshToken?: string): void {
  storageManager.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    storageManager.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/**
 * 获取 Token
 */
export function getToken(): string | null {
  return storageManager.getItem(TOKEN_KEY);
}

/**
 * 获取 Refresh Token
 */
export function getRefreshToken(): string | null {
  return storageManager.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  storageManager.removeItem(TOKEN_KEY);
  storageManager.removeItem(REFRESH_TOKEN_KEY);
}

// ========== 登录和登出 ==========

const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

/**
 * 登录
 */
interface LoginDto {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

async function login(credentials: LoginDto): Promise<LoginResponse> {
  const response = await request.post<LoginResponse>('/auth/login', credentials, {
    skipTokenRefresh: true, // 登录请求不需要 Token
  });

  // 保存 Token
  saveToken(response.token, response.refreshToken);

  return response;
}

/**
 * 登出
 */
async function logout(): Promise<void> {
  try {
    await request.post(
      '/auth/logout',
      {},
      {
        skipErrorHandler: true, // 登出失败也不显示错误提示
      },
    );
  } catch (error) {
    console.error('登出请求失败:', error);
  } finally {
    // 无论请求是否成功，都清除本地 Token
    clearToken();
  }
}

// ========== Token 刷新监听 ==========

import { tokenRefreshManager } from '../utils/storage/tokenRefresh';

/**
 * 监听 Token 刷新状态
 */
export function watchTokenRefresh() {
  // 检查是否正在刷新 Token
  const isRefreshing = tokenRefreshManager.isRefreshingToken();
  console.log('Token 是否正在刷新:', isRefreshing);

  // 等待 Token 刷新完成（带超时）
  tokenRefreshManager.waitForRefresh(30000).then(token => {
    if (token) {
      console.log('Token 刷新完成:', token);
    } else {
      console.log('Token 刷新超时或未刷新');
    }
  });
}

// ========== 使用示例 ==========

/**
 * 完整的认证流程示例
 */
export async function authenticationExample() {
  // 1. 配置 Token 刷新
  setupTokenRefresh();

  // 2. 用户登录
  try {
    const loginResponse = await login({
      username: 'user@example.com',
      password: 'password123',
    });
    console.log('登录成功:', loginResponse.user);
  } catch (error) {
    console.error('登录失败:', error);
    return;
  }

  // 3. 使用 Token 进行请求（Token 会自动添加到请求头）
  try {
    const user = await request.get('/user/profile');
    console.log('用户信息:', user);
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }

  // 4. 登出
  await logout();
  console.log('已登出');
}

/**
 * 检查 Token 是否有效
 */
export async function checkTokenValidity(): Promise<boolean> {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    // 尝试获取用户信息，如果 Token 无效会返回 401，触发自动刷新
    await request.get(
      '/user/profile',
      {},
      {
        skipErrorHandler: true, // 不显示错误提示
      },
    );
    return true;
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token 无效
      return false;
    }
    throw error;
  }
}

// 函数已在上面导出，这里不需要重复导出
