import type { AxiosResponse } from 'axios';

/** 刷新 token 后重放请求用的配置（走 axios 拦截器栈，不经外层步骤链） */
export function createRetryConfig(response: AxiosResponse, newToken: string) {
  return {
    ...response.config,
    headers: {
      ...response.config.headers,
      Authorization: newToken
    }
  };
}
