/* eslint-disable no-console */
import type { AxiosError, AxiosResponse } from 'axios';
import type { FlatRequestInstance, RequestOption } from '@suga/axios';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';
import { getAuthorization, handleExpiredRequest, showErrorMsg } from '../shared';
import type { RequestInstanceState } from '../type';
import {
  AUTH_ERROR_CODES,
  extractErrorCode,
  getExpiredTokenCodes,
  getLogoutCodes,
  getModalLogoutCodes
} from './errorCodes';
import { createRetryConfig } from './retry';

type MainFlatRequest = FlatRequestInstance<RequestInstanceState, App.Service.Response>;

const authErrorCodeSet = new Set<string>(AUTH_ERROR_CODES);

/** 主业务 Axios 策略（拦截器）：与步骤链组合时仍挂在同一 `instance` 上。 `getRequest` 在首次请求执行时已可用，用于读写 `request.state`。 */
export function createMainRequestPolicies(
  getRequest: () => MainFlatRequest
): Partial<RequestOption<App.Service.Response>> {
  return {
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
      const request = getRequest();
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
        request.state.errMsgStack = request.state.errMsgStack.filter(
          msg => msg !== response.data.message
        );
      };

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

      const shouldLogout =
        !expiredTokenCodes.includes(errorCode) &&
        (authErrorCodeSet.has(errorCode) || logoutCodes.includes(errorCode));

      if (shouldLogout) {
        handleLogout();
        return null;
      }

      if (
        modalLogoutCodes.includes(errorCode) &&
        !request.state.errMsgStack?.includes(response.data.message)
      ) {
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
    onError(error: AxiosError<App.Service.Response>) {
      const request = getRequest();
      let message = error.message;
      let errorCode: string | null = null;

      if (error.response?.data) {
        const errorData = error.response.data as unknown as Api.ErrorResponse;
        if (errorData && 'code' in errorData && 'message' in errorData) {
          message = errorData.message || message;
          errorCode = extractErrorCode(errorData);
        }
      }

      const expiredTokenCodes = getExpiredTokenCodes();
      const modalLogoutCodes = getModalLogoutCodes();

      const shouldSuppressError =
        (errorCode && expiredTokenCodes.includes(errorCode)) ||
        (errorCode && authErrorCodeSet.has(errorCode)) ||
        (errorCode && modalLogoutCodes.includes(errorCode));

      if (shouldSuppressError) {
        return;
      }

      showErrorMsg(request.state, message);
    }
  };
}
