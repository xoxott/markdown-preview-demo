/**
 * Markdown 渲染工具函数
 *
 * @module utils
 */

import type { RenderEnv, Token } from './types';
import type { FrameworkNode } from './adapters/types';
import { HTML_ESCAPE_MAP, HTML_UNESCAPE_MAP, PERFORMANCE_CONFIG, SECURITY_PATTERNS } from './constants';
import { getAdapter } from './adapters/manager';
import { handleError } from './utils/error-handler';

/** 属性记录类型 */
export type AttrRecord = Record<string, string>;

/** 属性对象池 */
const attrPool: Array<AttrRecord> = [];

// 初始化对象池
for (let i = 0; i < PERFORMANCE_CONFIG.POOL_SIZE; i++) {
  attrPool.push({});
}

/** 从对象池获取属性对象（性能优化） */
export function getAttrsFromPool(): AttrRecord {
  if (!PERFORMANCE_CONFIG.ENABLE_OBJECT_POOL) {
    return {};
  }
  return attrPool.pop() || {};
}

/** 归还属性对象到池中 */
export function returnAttrsToPool(attrs: AttrRecord): void {
  if (!PERFORMANCE_CONFIG.ENABLE_OBJECT_POOL || attrPool.length >= PERFORMANCE_CONFIG.POOL_SIZE) {
    return;
  }
  // 清空对象的所有属性
  for (const key in attrs) {
    if (Object.prototype.hasOwnProperty.call(attrs, key)) {
      delete attrs[key];
    }
  }

  attrPool.push(attrs);
}

/**
 * HTML 转义（性能优化版本）
 *
 * @param str - 原始字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  // 快速路径：如果没有需要转义的字符，直接返回
  if (!/[&<>"']/.test(str)) {
    return str;
  }

  return str.replace(/[&<>"']/g, match => HTML_ESCAPE_MAP[match] || match);
}

/**
 * HTML 反转义（性能优化版本）
 *
 * @param str - 转义后的字符串
 * @returns 原始字符串
 */
export function unescapeAll(str: string): string {
  // 快速路径：如果没有转义字符，直接返回
  if (!str.includes('&')) {
    return str;
  }

  return str.replace(/&(amp|lt|gt|quot|#39);/g, (match) => {
    return HTML_UNESCAPE_MAP[match] || match;
  });
}

/**
 * 验证属性名称合法性
 *
 * @param name - 属性名称
 * @returns 是否合法
 */
export function validateAttrName(name: string): boolean {
  return SECURITY_PATTERNS.ATTR_NAME.test(name) && !SECURITY_PATTERNS.ATTR_EVENT.test(name);
}

/**
 * 验证属性值安全性
 *
 * @param name - 属性名
 * @param value - 属性值
 * @returns 是否安全
 */
export function validateAttrValue(name: string, value: string): boolean {
  const lowerName = name.toLowerCase();

  // 检查敏感属性
  if (SECURITY_PATTERNS.SENSITIVE_ATTR.test(lowerName)) {
    // 检查危险协议
    if (SECURITY_PATTERNS.SENSITIVE_URL.test(value)) {
      return false;
    }
  }

  return true;
}

/**
 * 验证 URL 安全性
 *
 * @param url - URL 字符串
 * @returns 是否安全
 */
export function isUrlSafe(url: string): boolean {
  return !SECURITY_PATTERNS.SENSITIVE_URL.test(url.trim());
}

/**
 * 获取 Token 对应的源码行号范围
 *
 * @param token - Markdown Token
 * @param env - 渲染环境变量
 * @returns 起始行号, 结束行号
 */
export function getSourceLineRange(token: Token, env?: RenderEnv): [number, number] {
  const [lineStart, lineEnd] = token.map || [0, 1];
  let sOffset = 0;

  if (env?.macroLines && env.bMarks && env.eMarks) {
    const sPos = env.bMarks[lineStart];
    for (const { matchPos, lineOffset, posOffset, currentPosOffset } of env.macroLines) {
      if (sPos + posOffset > matchPos && sPos + posOffset - currentPosOffset > matchPos) {
        sOffset = lineOffset;
      } else {
        break;
      }
    }
  }

  return [lineStart + sOffset, lineEnd + sOffset];
}

/**
 * 判断是否为组件选项对象（框架无关）
 *
 * @param obj - 待检测对象
 * @returns 是否为组件
 */
export function isComponentOptions(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  // 通用组件检测：检查是否有常见的组件属性
  return 'setup' in obj || 'render' in obj || 'template' in obj || 'component' in obj || typeof obj === 'function';
}

/**
 * 创建 HTML 内容的节点（带错误处理和 SSR 兼容）
 *
 * @param html - HTML 字符串
 * @returns 对应的节点
 */
export function createHtmlVNode(html: string): FrameworkNode {
  const adapter = getAdapter();

  // SSR 环境检测：在服务端直接返回文本节点
  if (typeof document === 'undefined') {
    return adapter.createText(html);
  }

  try {
    const template = document.createElement('template');
    template.innerHTML = html;
    const elements = template.content.children;

    if (elements.length === 0) {
      return adapter.createText('');
    }

    const children: FrameworkNode[] = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const tagName = element.tagName.toLowerCase();
      const attrs = getAttrsFromPool();

      // 复制属性
      for (let j = 0; j < element.attributes.length; j++) {
        const attr = element.attributes[j];
        attrs[attr.name] = attr.value;
      }

      attrs.innerHTML = element.innerHTML;
      const keySubstring = element.innerHTML.substring(0, PERFORMANCE_CONFIG.HTML_KEY_SUBSTRING_LENGTH);
      attrs.key = `html-${i}-${keySubstring}`;

      children.push(adapter.createElement(tagName, attrs, []));
    }

    return children.length === 1 ? children[0] : adapter.createFragment(children);
  } catch (error) {
    // 使用统一的错误处理
    const errorText = adapter.createText('[HTML Parse Error]');
    return handleError(error, 'Failed to create HTML VNode', errorText as FrameworkNode);
  }
}

/**
 * 合并 CSS 类名（性能优化）
 *
 * @param classes - 类名数组或字符串
 * @returns 合并后的类名字符串
 */
export function mergeClasses(...classes: (string | string[] | undefined)[]): string {
  const result: string[] = [];

  for (const cls of classes) {
    if (!cls) continue;

    if (typeof cls === 'string') {
      if (cls) result.push(cls);
    } else if (Array.isArray(cls)) {
      result.push(...cls.filter(Boolean));
    }
  }

  return result.join(' ');
}

/**
 * 安全地分割 info 字符串
 *
 * @param info - info 字符串
 * @returns 语言名, 属性字符串
 */
export function parseInfoString(info: string): [string, string] {
  if (!info) {
    return ['', ''];
  }

  const trimmed = info.trim();
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return [trimmed, ''];
  }

  return [
    trimmed.substring(0, spaceIndex),
    trimmed.substring(spaceIndex + 1).trim() // 移除前导空格
  ];
}

/**
 * 画中画模式离开事件处理
 *
 * @param e - 事件对象
 */
export function onLeavePictureInPicture(e: Event): void {
  const target = e.target as HTMLMediaElement;
  if (!target.isConnected) {
    target.pause();
  } else {
    // 使用类型断言访问非标准 API
    const scrollIntoView = (target as HTMLMediaElement & { scrollIntoViewIfNeeded?: () => void }).scrollIntoViewIfNeeded;
    if (typeof scrollIntoView === 'function') {
      scrollIntoView.call(target);
    }
  }
}

/**
 * 移除指定的属性键（使用 Set 优化查找性能）
 *
 * @param attrs - 属性对象
 * @param keysToRemove - 要移除的键数组
 * @returns 新的属性对象
 */
export function omitAttrs(attrs: AttrRecord, keysToRemove: string[]): AttrRecord {
  const result = getAttrsFromPool();
  // 使用 Set 进行 O(1) 查找，而不是数组的 O(n) 查找
  const keysSet = new Set(keysToRemove);

  for (const key in attrs) {
    if (!keysSet.has(key)) {
      result[key] = attrs[key];
    }
  }

  return result;
}

/** 创建注释节点 */
export function createCommentNode(): FrameworkNode {
  const adapter = getAdapter();
  return adapter.createComment() || adapter.createText('');
}

/** 创建文本节点 */
export function createTextNode(text: string): FrameworkNode | string {
  const adapter = getAdapter();
  return adapter.createText(text);
}

/** 创建片段节点 */
export function createFragmentNode(children: FrameworkNode[]): FrameworkNode {
  const adapter = getAdapter();
  return adapter.createFragment(children);
}

