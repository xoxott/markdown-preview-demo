/**
 * Auth API types
 */

/// <reference path="./common.d.ts" />

declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    /** Login token response */
    interface LoginToken {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }

    /** User role information */
    interface UserRole {
      id: number;
      name: string;
      code: string;
    }

    /** User information */
    interface UserInfo {
      id: number;
      username: string;
      email: string;
      avatar: string | null;
      isActive: boolean;
      lastLoginAt: string;
      lastActivityAt: string;
      isOnline: boolean;
      createdAt: string;
      updatedAt: string;
      roles: UserRole[];
      /** Role codes extracted from roles array (for compatibility) */
      role?: string;
      /** Button permissions (may not be returned by API) */
      buttons?: string[];
    }

    /** Login step 1 request */
    interface LoginStep1Request {
      username: string;
      password: string;
    }

    /** Login step 1 response - success without verification */
    interface LoginStep1SuccessResponse {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      requiresVerification: false;
      message: string;
    }

    /** Login step 1 response - requires verification */
    interface LoginStep1VerificationResponse {
      temporaryToken: string;
      requiresVerification: true;
      riskScore: number;
      riskFactors: string[];
      message: string;
      expiresIn: number;
    }

    /** Login step 1 response (union type) */
    type LoginStep1Response = LoginStep1SuccessResponse | LoginStep1VerificationResponse;

    /** Login step 2 request */
    interface LoginStep2Request {
      temporaryToken: string;
      code: string;
    }

    /** Login step 2 response */
    interface LoginStep2Response {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: UserInfo;
    }

    /** Register request */
    interface RegisterRequest {
      username: string;
      email: string;
      password: string;
      verificationCode: string;
    }

    /** Register response */
    interface RegisterResponse {
      message: string;
      user?: UserInfo;
    }

    /** Send registration code request */
    interface SendCodeRequest {
      email: string;
    }

    /** Send registration code response */
    interface SendCodeResponse {
      message: string;
    }

    /** Refresh token request */
    interface RefreshTokenRequest {
      refreshToken: string;
    }

    /** Refresh token response */
    interface RefreshTokenResponse {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }

    /** Logout response */
    interface LogoutResponse {
      message: string;
    }

    /** Email code login request */
    interface EmailCodeLoginRequest {
      email: string;
      code: string;
    }

    /** Email code login response */
    interface EmailCodeLoginResponse {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: UserInfo;
    }

    /** Send login code request */
    interface SendLoginCodeRequest {
      email: string;
    }

    /** Send login code response */
    interface SendLoginCodeResponse {
      message: string;
    }
  }
}

