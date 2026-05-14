import type { RequestOption } from '@suga/axios';
import { BACKEND_ERROR_CODE } from '@suga/axios';
import { localStg } from '@/utils/storage';

export function createDemoRequestPolicies(): Partial<RequestOption<App.Service.DemoResponse>> {
  return {
    async onRequest(config) {
      const { headers } = config;
      const token = localStg.get('token');
      const Authorization = token ? `Bearer ${token}` : null;
      Object.assign(headers, { Authorization });
      return config;
    },
    isBackendSuccess(response) {
      return response.data.status === '200';
    },
    async onBackendFail() {},
    transformBackendResponse(response) {
      return response.data.result;
    },
    onError(error) {
      let message = error.message;
      if (error.code === BACKEND_ERROR_CODE) {
        message = error.response?.data?.message || message;
      }
      window.$message?.error(message);
    }
  };
}
