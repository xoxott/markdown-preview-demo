import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';

export const STATIC_DEMO_TOKEN = 'static-demo-token';

/** 本地 dev 无后端时默认绕过登录；设 VITE_DEV_BYPASS_AUTH=N 可关闭。 */
export function isDevBypassAuth(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  return import.meta.env.VITE_DEV_BYPASS_AUTH !== 'N';
}

/** GitHub Pages / 静态托管 / 本地无 API 演示模式 */
export function isStaticDemo(): boolean {
  if (import.meta.env.VITE_STATIC_DEMO === 'Y') {
    return true;
  }
  if (isDevBypassAuth()) {
    return true;
  }
  if (typeof window !== 'undefined' && /github\.io$/i.test(window.location.hostname)) {
    return true;
  }
  return false;
}

/** 仅写入 token，可在 Pinia / Router 就绪前调用（如 main.ts 启动阶段）。 */
export function seedStaticDemoAuthTokens(): void {
  localStg.set('token', STATIC_DEMO_TOKEN);
  localStg.set('refreshToken', STATIC_DEMO_TOKEN);
}

/** Seed local auth so route init never calls /users/me on static hosts. */
export function seedStaticDemoAuth(): void {
  const superRole = import.meta.env.VITE_STATIC_SUPER_ROLE || 'R_SUPER';
  const authStore = useAuthStore();

  seedStaticDemoAuthTokens();
  authStore.token = STATIC_DEMO_TOKEN;
  Object.assign(authStore.userInfo, {
    id: 1,
    username: 'demo-user',
    email: 'demo@example.com',
    avatar: null,
    role: superRole,
    roles: [{ code: superRole, name: 'Demo' }],
    buttons: [],
    isActive: true,
    lastLoginAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isOnline: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}
