import type { AxiosResponse } from 'axios';
import { BACKEND_ERROR_CODE, createFlatRequest, createRequest } from '@sa/axios';
import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { $t } from '@/locales';
import { getAuthorization, handleExpiredRequest, showErrorMsg } from './shared';
import type { RequestInstanceState } from './type';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL, otherBaseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

/**
 * 获取可刷新的 token 错误码列表
 * 默认: 1202 = TOKEN_EXPIRED (Access token has expired)
 */
function getExpiredTokenCodes(): string[] {
  const codes = import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES?.split(',').filter(Boolean);
  return codes && codes.length > 0 ? codes : ['1202'];
}

/**
 * 获取登出码列表
 */
function getLogoutCodes(): string[] {
  return import.meta.env.VITE_SERVICE_LOGOUT_CODES?.split(',').filter(Boolean) || [];
}

/**
 * 获取模态框登出码列表
 */
function getModalLogoutCodes(): string[] {
  return import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES?.split(',').filter(Boolean) || [];
}

/**
 * 提取错误响应中的业务错误码
 */
function extractErrorCode(errorData: Api.ErrorResponse): string {
  return String(errorData.code);
}

/**
 * 创建重试请求配置
 */
function createRetryConfig(response: AxiosResponse, newToken: string) {
  return {
    ...response.config,
    headers: {
      ...response.config.headers,
      Authorization: newToken
    }
  };
}

/**
 * 刷新 token 专用的请求实例
 * 不携带 Authorization header，避免循环问题
 */
export const refreshTokenRequest = createFlatRequest<App.Service.Response, RequestInstanceState>(
  {
    baseURL,
    headers: {
      apifoxToken: 'XL299LiMEDZ0H5h3A29PxwQXdMJqWyY2'
    }
  },
  {
    // 不添加 Authorization header
    async onRequest(config) {
      return config;
    },
    isBackendSuccess(response) {
      const code = response.data.code;
      return code === 200 || code === 201;
    },
    async onBackendFail() {
      // 刷新 token 失败时不处理，直接返回 null
      return null;
    },
    transformBackendResponse(response) {
      return response.data.data;
    },
    onError() {
      // 刷新 token 失败时不显示错误消息
    }
  }
);

export const request = createFlatRequest<App.Service.Response, RequestInstanceState>(
  {
    baseURL,
    headers: {
      apifoxToken: 'XL299LiMEDZ0H5h3A29PxwQXdMJqWyY2'
    }
  },
  {
    async onRequest(config) {
      const Authorization = getAuthorization();
      Object.assign(config.headers, { Authorization });

      return config;
    },
    isBackendSuccess(response) {
      const code = response.data.code;
      const isSuccess = code === 200 || code === 201;
      console.log('[Request] isBackendSuccess check:', {
        code,
        isSuccess,
        url: response.config.url,
        status: response.status
      });
      return isSuccess;
    },
    async onBackendFail(response, instance) {
      const authStore = useAuthStore();
      const errorData = response.data as unknown as Api.ErrorResponse;
      const errorCode = extractErrorCode(errorData);
      const expiredTokenCodes = getExpiredTokenCodes();
      const logoutCodes = getLogoutCodes();
      const modalLogoutCodes = getModalLogoutCodes();

      console.log('[Request] onBackendFail triggered:', {
        errorCode,
        expiredTokenCodes,
        url: response.config.url,
        status: response.status,
        message: errorData.message
      });

      const handleLogout = () => authStore.resetStore();
      const logoutAndCleanup = () => {
        handleLogout();
        window.removeEventListener('beforeunload', handleLogout);
        request.state.errMsgStack = request.state.errMsgStack.filter(msg => msg !== response.data.message);
      };

      // 1. 尝试刷新 token
      if (expiredTokenCodes.includes(errorCode)) {
        console.log('[Token Refresh] 检测到 token 过期，开始刷新 token，errorCode:', errorCode);
        const success = await handleExpiredRequest(request.state);
        if (success) {
          console.log('[Token Refresh] Token 刷新成功，重新发送请求');
          const newToken = getAuthorization();
          return instance.request(createRetryConfig(response, newToken!)) as Promise<AxiosResponse>;
        }
        console.warn('[Token Refresh] Token 刷新失败，将执行登出逻辑');
      }

      // 2. 处理需要登出的错误码
      // 认证相关错误码 (1200-1299)，除了可刷新的 token 过期错误
      const authErrorCodes = ['1200', '1201', '1203', '1204', '1205', '1206', '1207'];
      const shouldLogout =
        !expiredTokenCodes.includes(errorCode) &&
        (authErrorCodes.includes(errorCode) || logoutCodes.includes(errorCode));

      if (shouldLogout) {
        handleLogout();
        return null;
      }

      // 3. 处理需要显示模态框的错误码
      if (modalLogoutCodes.includes(errorCode) && !request.state.errMsgStack?.includes(response.data.message)) {
        request.state.errMsgStack = [...(request.state.errMsgStack || []), response.data.message];
        window.addEventListener('beforeunload', handleLogout);

        window.$dialog?.error({
          title: $t('common.error'),
          content: response.data.message,
          positiveText: $t('common.confirm'),
          maskClosable: false,
          closeOnEsc: false,
          onPositiveClick: logoutAndCleanup,
          onClose: logoutAndCleanup
        });

        return null;
      }

      return null;
    },
    transformBackendResponse(response) {
      return response.data.data;
    },
    onError(error) {
      let message = error.message;
      let errorCode: string | null = null;

      // 提取错误信息
      if (error.response?.data) {
        const errorData = error.response.data as unknown as Api.ErrorResponse;
        if (errorData && 'code' in errorData && 'message' in errorData) {
          message = errorData.message || message;
          errorCode = extractErrorCode(errorData);
        }
      }

      // 判断是否应该显示错误消息
      const expiredTokenCodes = getExpiredTokenCodes();
      const modalLogoutCodes = getModalLogoutCodes();

      // 认证相关错误码 (1200-1299)，除了可刷新的 token 过期错误
      const authErrorCodes = ['1200', '1201', '1203', '1204', '1205', '1206', '1207'];
      const shouldSuppressError =
        (errorCode && expiredTokenCodes.includes(errorCode)) || // token 已自动刷新
        (errorCode && authErrorCodes.includes(errorCode)) || // 已登出
        (errorCode && modalLogoutCodes.includes(errorCode)); // 错误消息已在模态框中显示

      if (shouldSuppressError) {
        return;
      }

      showErrorMsg(request.state, message);
    }
  }
);

export const demoRequest = createRequest<App.Service.DemoResponse>(
  {
    baseURL: otherBaseURL.demo
  },
  {
    async onRequest(config) {
      const { headers } = config;

      // set token
      const token = localStg.get('token');
      const Authorization = token ? `Bearer ${token}` : null;
      Object.assign(headers, { Authorization });

      return config;
    },
    isBackendSuccess(response) {
      // when the backend response code is "200", it means the request is success
      // you can change this logic by yourself
      return response.data.status === '200';
    },
    async onBackendFail(_response) {
      // when the backend response code is not "200", it means the request is fail
      // for example: the token is expired, refresh token and retry request
    },
    transformBackendResponse(response) {
      return response.data.result;
    },
    onError(error) {
      // when the request is fail, you can show error message

      let message = error.message;

      // show backend error message
      if (error.code === BACKEND_ERROR_CODE) {
        message = error.response?.data?.message || message;
      }

      window.$message?.error(message);
    }
  }
);
