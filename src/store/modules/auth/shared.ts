import { localStg } from '@/utils/storage';

/** Get access token */
export function getToken() {
  return localStg.get('token') || localStg.get('accessToken') || '';
}

/** Get refresh token */
export function getRefreshToken() {
  return localStg.get('refreshToken') || '';
}

/** Clear auth storage */
export function clearAuthStorage() {
  localStg.remove('token');
  localStg.remove('accessToken');
  localStg.remove('refreshToken');
  localStg.remove('temporaryToken');
}

/** Save remembered username */
export function saveRememberedUsername(username: string) {
  localStg.set('savedUsername', username);
  localStg.set('rememberMe', true);
}

/** Get remembered username */
export function getRememberedUsername(): string {
  return localStg.get('savedUsername') || '';
}

/** Clear remembered username */
export function clearRememberedUsername() {
  localStg.remove('savedUsername');
  localStg.remove('rememberMe');
}
