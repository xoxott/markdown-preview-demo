/**
 * 主题工具函数
 *
 * 提供获取 CSS 变量值的工具函数
 */

/**
 * 获取 CSS 变量值
 *
 * @param variableName CSS 变量名（不需要 -- 前缀）
 * @param element 元素（默认为 document.documentElement）
 * @param fallback 默认值（如果变量不存在）
 * @returns CSS 变量值或默认值
 *
 * @example
 * ```typescript
 * const nodeBg = getCssVariable('flow-node-bg', undefined, '#ffffff');
 * ```
 */
export function getCssVariable(
  variableName: string,
  element: HTMLElement = document.documentElement,
  fallback?: string
): string {
  const value = getComputedStyle(element).getPropertyValue(`--${variableName}`).trim();
  return value || fallback || '';
}

/**
 * 设置 CSS 变量值
 *
 * @param variableName CSS 变量名（不需要 -- 前缀）
 * @param value 变量值
 * @param element 元素（默认为 document.documentElement）
 *
 * @example
 * ```typescript
 * setCssVariable('flow-node-bg', '#f5f5f5');
 * ```
 */
export function setCssVariable(
  variableName: string,
  value: string,
  element: HTMLElement = document.documentElement
): void {
  element.style.setProperty(`--${variableName}`, value);
}

/**
 * 批量设置 CSS 变量值
 *
 * @param variables 变量对象（key 为变量名，value 为变量值）
 * @param element 元素（默认为 document.documentElement）
 *
 * @example
 * ```typescript
 * setCssVariables({
 *   'flow-node-bg': '#f5f5f5',
 *   'flow-node-border': '#e0e0e0'
 * });
 * ```
 */
export function setCssVariables(
  variables: Record<string, string>,
  element: HTMLElement = document.documentElement
): void {
  Object.entries(variables).forEach(([key, value]) => {
    setCssVariable(key, value, element);
  });
}

/**
 * 获取当前主题
 *
 * @param element 元素（默认为 document.documentElement）
 * @returns 当前主题（'light' | 'dark' | 'auto'）
 */
export function getCurrentTheme(element: HTMLElement = document.documentElement): 'light' | 'dark' | 'auto' {
  const theme = element.getAttribute('data-flow-theme');
  if (theme && ['light', 'dark', 'auto'].includes(theme)) {
    return theme as 'light' | 'dark' | 'auto';
  }
  return 'light';
}

