import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';

export const STATIC_DEMO_TOKEN = 'static-demo-token';

/** GitHub Pages / static hosting: no cross-origin API. */
export function isStaticDemo(): boolean {
  if (import.meta.env.VITE_STATIC_DEMO === 'Y') {
    return true;
  }
  if (typeof window !== 'undefined' && /github\.io$/i.test(window.location.hostname)) {
    return true;
  }
  return false;
}

/** Seed local auth so route init never calls /users/me on static hosts. */
export function seedStaticDemoAuth(): void {
  const superRole = import.meta.env.VITE_STATIC_SUPER_ROLE || 'R_SUPER';
  const authStore = useAuthStore();

  localStg.set('token', STATIC_DEMO_TOKEN);
  localStg.set('refreshToken', STATIC_DEMO_TOKEN);
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
