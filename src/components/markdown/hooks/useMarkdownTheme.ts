import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useThemeVars } from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';

/** Markdown 主题管理 Hook 统一管理 Markdown 组件的主题相关逻辑 */
export function useMarkdownTheme() {
  const themeStore = useThemeStore();
  const { naiveTheme, darkMode } = storeToRefs(themeStore);
  const themeVars = useThemeVars();

  /** CSS 变量映射 */
  const cssVars = computed(() => ({
    '--markdown-text-color': themeVars.value.textColorBase,
    '--markdown-bg-color': themeVars.value.bodyColor,
    '--markdown-border-color': themeVars.value.borderColor,
    '--markdown-code-bg': themeVars.value.codeColor,
    '--markdown-link-color': themeVars.value.primaryColor,
    '--markdown-blockquote-bg': themeVars.value.cardColor,
    '--markdown-table-border': themeVars.value.dividerColor,
    '--markdown-heading-color': themeVars.value.textColor1
  }));

  /** 错误提示样式 */
  const errorStyle = computed(() => ({
    color: themeVars.value.errorColor,
    backgroundColor: themeVars.value.errorColorSuppl,
    borderColor: themeVars.value.errorColorHover
  }));

  /** 容器背景样式 */
  const containerBgStyle = computed(() => ({
    backgroundColor: darkMode.value ? themeVars.value.cardColor : themeVars.value.baseColor
  }));

  /** 代码块样式 */
  const codeBlockStyle = computed(() => ({
    backgroundColor: themeVars.value.codeColor,
    color: themeVars.value.textColor2
  }));

  /** 主题类名 */
  const themeClass = computed(() => (darkMode.value ? 'color-mode-dark' : 'color-mode-light'));

  /** 代码高亮主题 */
  const highlightTheme = computed(() => (darkMode.value ? 'github-dark' : 'github'));

  return {
    /** 是否为暗色模式 */
    darkMode,
    /** Naive UI 主题配置 */
    naiveTheme,
    /** 主题变量 */
    themeVars,
    /** CSS 变量对象 */
    cssVars,
    /** 主题类名 */
    themeClass,
    /** 代码高亮主题名称 */
    highlightTheme,
    /** 错误提示样式 */
    errorStyle,
    /** 容器背景样式 */
    containerBgStyle,
    /** 代码块样式 */
    codeBlockStyle
  };
}
