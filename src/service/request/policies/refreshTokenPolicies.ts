import type { RequestOption } from '@suga/axios';

/** 刷新专用实例：无 Authorization，失败静默 */
export function createRefreshTokenRequestOptions(): Partial<RequestOption<App.Service.Response>> {
  return {
    async onRequest(config) {
      return config;
    },
    isBackendSuccess(response) {
      const code = response.data.code;
      return code === 200 || code === 201;
    },
    async onBackendFail() {
      return null;
    },
    transformBackendResponse(response) {
      return response.data.data;
    },
    onError() {}
  };
}
