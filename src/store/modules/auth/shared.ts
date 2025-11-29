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
