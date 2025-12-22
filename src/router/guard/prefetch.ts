import type { Router } from 'vue-router';

/**
 * 创建路由预加载守卫
 * 在鼠标悬停在菜单项上时预加载对应路由组件
 */
export function setupRoutePrefetch(router: Router) {
  // 预加载缓存
  const prefetchedRoutes = new Set<string>();

  // 预加载路由组件
  const prefetchRoute = (routeName: string) => {
    if (prefetchedRoutes.has(routeName)) {
      return;
    }

    const route = router.getRoutes().find(r => r.name === routeName);
    if (route && route.components) {
      // 触发组件的懒加载
      Object.values(route.components).forEach(component => {
        // 检查是否为懒加载组件（函数形式）
        if (component && typeof component === 'function' && component.constructor.name === 'AsyncFunction') {
          (component as () => Promise<any>)().catch(() => {
            // 忽略预加载错误
          });
        }
      });
      prefetchedRoutes.add(routeName);
    }
  };

  // 监听菜单项的鼠标悬停事件
  if (typeof window !== 'undefined') {
    // 使用事件委托优化性能
    document.addEventListener(
      'mouseover',
      (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // 查找最近的菜单项元素
        const menuItem = target.closest('[data-menu-id]');
        if (menuItem) {
          const routeName = menuItem.getAttribute('data-menu-id');
          if (routeName) {
            // 使用 requestIdleCallback 在浏览器空闲时预加载
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => prefetchRoute(routeName));
            } else {
              setTimeout(() => prefetchRoute(routeName), 100);
            }
          }
        }
      },
      { passive: true, capture: true }
    );
  }
}

