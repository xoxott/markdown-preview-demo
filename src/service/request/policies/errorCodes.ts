/** 认证相关错误码 (1200–1299)，除可刷新的 token 过期外，常触发登出 */
export const AUTH_ERROR_CODES = ['1200', '1201', '1203', '1204', '1205', '1206', '1207'] as const;

export function getExpiredTokenCodes(): string[] {
  const codes = import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES?.split(',').filter(Boolean);
  return codes && codes.length > 0 ? codes : ['1202'];
}

export function getLogoutCodes(): string[] {
  return import.meta.env.VITE_SERVICE_LOGOUT_CODES?.split(',').filter(Boolean) || [];
}

export function getModalLogoutCodes(): string[] {
  return import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES?.split(',').filter(Boolean) || [];
}

export function extractErrorCode(errorData: Api.ErrorResponse): string {
  return String(errorData.code);
}
