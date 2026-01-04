/**
 * Flow 主题管理 Hook
 *
 * 提供主题切换和管理功能
 */

import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue';

/**
 * 主题类型
 */
export type FlowTheme = 'light' | 'dark' | 'auto';

/**
 * 主题常量
 */
const THEME_VALUES = ['light', 'dark', 'auto'] as const;
const DEFAULT_THEME: FlowTheme = 'light';
const DEFAULT_STORAGE_KEY = 'flow-theme';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * 主题管理 Hook 选项
 */
export interface UseFlowThemeOptions {
  /** 初始主题 */
  initialTheme?: FlowTheme;
  /** 是否持久化到 localStorage */
  persist?: boolean;
  /** localStorage key */
  storageKey?: string;
  /** 主题变化回调 */
  onThemeChange?: (theme: FlowTheme) => void;
}

/**
 * 主题管理 Hook 返回值
 */
export interface UseFlowThemeReturn {
  /** 当前主题 */
  theme: Ref<FlowTheme>;
  /** 设置主题 */
  setTheme: (theme: FlowTheme) => void;
  /** 切换主题 */
  toggleTheme: () => void;
  /** 是否为深色模式 */
  isDark: Ref<boolean>;
}

/**
 * 获取系统主题偏好
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
}

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: FlowTheme, rootElement?: HTMLElement): void {
  const root = rootElement || document.documentElement;
  root.setAttribute('data-flow-theme', theme);
}

/**
 * 从 localStorage 读取主题
 */
function getStoredTheme(storageKey: string): FlowTheme | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(storageKey);
  if (stored && THEME_VALUES.includes(stored as FlowTheme)) {
    return stored as FlowTheme;
  }
  return null;
}

/**
 * 保存主题到 localStorage
 */
function saveTheme(storageKey: string, theme: FlowTheme): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, theme);
  }
}

/**
 * 计算是否为深色模式
 */
function calculateIsDark(theme: FlowTheme): boolean {
  if (theme === 'auto') {
    return getSystemTheme() === 'dark';
  }
  return theme === 'dark';
}

/**
 * Flow 主题管理 Hook
 *
 * @param options Hook 选项
 * @returns 主题管理功能
 *
 * @example
 * ```typescript
 * const { theme, setTheme, toggleTheme, isDark } = useFlowTheme({
 *   initialTheme: 'auto',
 *   persist: true
 * });
 * ```
 */
export function useFlowTheme(
  options: UseFlowThemeOptions = {}
): UseFlowThemeReturn {
  const {
    initialTheme = DEFAULT_THEME,
    persist = false,
    storageKey = DEFAULT_STORAGE_KEY,
    onThemeChange
  } = options;

  // 初始化主题（优先使用存储的主题）
  const storedTheme = persist ? getStoredTheme(storageKey) : null;
  const theme = ref<FlowTheme>(storedTheme || initialTheme);

  // 计算是否为深色模式（使用 computed 自动响应主题变化）
  const isDark = computed<boolean>(() => calculateIsDark(theme.value));

  /**
   * 设置主题
   */
  const setTheme = (newTheme: FlowTheme) => {
    theme.value = newTheme;
    applyTheme(newTheme);

    // 持久化到 localStorage
    if (persist) {
      saveTheme(storageKey, newTheme);
    }

    // 触发回调
    onThemeChange?.(newTheme);
  };

  /**
   * 切换主题（在 light 和 dark 之间切换）
   */
  const toggleTheme = () => {
    if (theme.value === 'auto') {
      // 如果当前是 auto，切换到系统主题的相反主题
      const systemTheme = getSystemTheme();
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // 在 light 和 dark 之间切换
      setTheme(theme.value === 'light' ? 'dark' : 'light');
    }
  };

  // 监听系统主题变化（当主题为 auto 时）
  let mediaQuery: MediaQueryList | null = null;
  const handleSystemThemeChange = () => {
    if (theme.value === 'auto') {
      // isDark 是 computed，会自动更新，只需要触发回调
      onThemeChange?.(theme.value);
    }
  };

  // 监听主题变化，自动应用主题
  watch(
    () => theme.value,
    (newTheme) => {
      applyTheme(newTheme);
    },
    { immediate: true }
  );

  // 初始化
  onMounted(() => {
    // 监听系统主题变化
    if (typeof window !== 'undefined') {
      mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        // 兼容旧浏览器
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }
  });

  // 清理
  onUnmounted(() => {
    if (mediaQuery) {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        // 兼容旧浏览器
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    }
  });

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark
  };
}
