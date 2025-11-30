import { request, refreshTokenRequest } from '../request';

/**
 * Login step 1 - Initial login with username and password
 *
 * @param username Username
 * @param password Password
 */
export function fetchLoginStep1(username: string, password: string) {
  return request<Api.Auth.LoginStep1Response>({
    url: '/api/admin/auth/login-step1',
    method: 'post',
    data: {
      username,
      password
    } satisfies Api.Auth.LoginStep1Request
  });
}

/**
 * Login step 2 - Verify code with temporary token
 *
 * @param temporaryToken Temporary token from step 1
 * @param code Verification code
 */
export function fetchLoginStep2(temporaryToken: string, code: string) {
  return request<Api.Auth.LoginStep2Response>({
    url: '/api/admin/auth/login-step2',
    method: 'post',
    data: {
      temporaryToken,
      code
    } satisfies Api.Auth.LoginStep2Request
  });
}

/**
 * Register new user
 *
 * @param username Username
 * @param email Email
 * @param password Password
 * @param verificationCode Verification code
 */
export function fetchRegister(username: string, email: string, password: string, verificationCode: string) {
  return request<Api.Auth.RegisterResponse>({
    url: '/api/admin/auth/register',
    method: 'post',
    data: {
      username,
      email,
      password,
      verificationCode
    } satisfies Api.Auth.RegisterRequest
  });
}

/**
 * Send registration verification code
 *
 * @param email Email address
 */
export function fetchSendRegistrationCode(email: string) {
  return request<Api.Auth.SendCodeResponse>({
    url: '/api/admin/auth/send-registration-code',
    method: 'post',
    data: {
      email
    } satisfies Api.Auth.SendCodeRequest
  });
}

/**
 * Refresh access token
 *
 * @param refreshToken Refresh token
 * 注意：使用 refreshTokenRequest 而不是 request，避免携带过期的 accessToken
 */
export function fetchRefreshToken(refreshToken: string) {
  return refreshTokenRequest<Api.Auth.RefreshTokenResponse>({
    url: '/api/admin/auth/refresh',
    method: 'post',
    data: {
      refreshToken
    } satisfies Api.Auth.RefreshTokenRequest
  });
}

/**
 * Get user info
 */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({ url: '/api/admin/users/me' });
}

/**
 * Logout
 */
export function fetchLogout() {
  return request<Api.Auth.LogoutResponse>({
    url: '/api/admin/auth/logout',
    method: 'post'
  });
}

/**
 * Send reset password verification code
 *
 * @param email Email address
 */
export function fetchSendResetPasswordCode(email: string) {
  return request<Api.Auth.SendCodeResponse>({
    url: '/api/admin/auth/send-reset-password-code',
    method: 'post',
    data: {
      email
    } satisfies Api.Auth.SendCodeRequest
  });
}

/**
 * Reset password
 *
 * @param email Email address
 * @param code Verification code
 * @param newPassword New password
 */
export function fetchResetPassword(email: string, code: string, newPassword: string) {
  return request<Api.Auth.RegisterResponse>({
    url: '/api/admin/auth/reset-password',
    method: 'post',
    data: {
      email,
      code,
      newPassword
    }
  });
}
