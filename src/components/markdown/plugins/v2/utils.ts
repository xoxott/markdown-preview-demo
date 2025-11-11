/**
 * Markdown 渲染工具函数
 * @module utils
 */

import type { Component, VNode } from 'vue';
import { Comment, Fragment, Text, createVNode } from 'vue';
import type { Token, RenderEnv } from './types';
import { HTML_ESCAPE_MAP, HTML_UNESCAPE_MAP, SECURITY_PATTERNS, PERFORMANCE_CONFIG } from './constants';

/** 属性对象池 */
const attrPool: Array<Record<string, any>> = [];
const POOL_SIZE = 20;

// 初始化对象池
for (let i = 0; i < POOL_SIZE; i++) {
  attrPool.push({});
}

/**
 * 从对象池获取属性对象（性能优化）
 */
export function getAttrsFromPool(): Record<string, any> {
  if (!PERFORMANCE_CONFIG.ENABLE_OBJECT_POOL) {
    return {};
  }
  return attrPool.pop() || {};
}

/**
 * 归还属性对象到池中
 */
export function returnAttrsToPool(attrs: Record<string, any>): void {
  if (!PERFORMANCE_CONFIG.ENABLE_OBJECT_POOL || attrPool.length >= POOL_SIZE) {
    return;
  }
  // 清空对象
  Object.keys(attrs).forEach(key => delete attrs[key]);
  attrPool.push(attrs);
}

/**
 * HTML 转义（性能优化版本）
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
 * @param str - 转义后的字符串
 * @returns 原始字符串
 */
export function unescapeAll(str: string): string {
  // 快速路径：如果没有转义字符，直接返回
  if (str.indexOf('&') === -1) {
    return str;
  }
  
  return str.replace(/&(amp|lt|gt|quot|#39);/g, (match, code) => {
    return HTML_UNESCAPE_MAP[match] || match;
  });
}

/**
 * 验证属性名称合法性
 * @param name - 属性名称
 * @returns 是否合法
 */
export function validateAttrName(name: string): boolean {
  return SECURITY_PATTERNS.ATTR_NAME.test(name) && !SECURITY_PATTERNS.ATTR_EVENT.test(name);
}

/**
 * 验证属性值安全性
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
 * 获取 Token 对应的源码行号范围
 * @param token - Markdown Token
 * @param env - 渲染环境变量
 * @returns [起始行号, 结束行号]
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
 * 判断是否为组件选项对象
 * @param obj - 待检测对象
 * @returns 是否为组件
 */
export function isComponentOptions(obj: any): obj is Component {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  return 'setup' in obj || 'render' in obj || 'template' in obj;
}

/**
 * 创建 HTML 内容的 VNode（带错误处理）
 * @param html - HTML 字符串
 * @returns 对应的 VNode
 */
export function createHtmlVNode(html: string): VNode {
  try {
    const template = document.createElement('template');
    template.innerHTML = html;
    const elements = template.content.children;
    
    if (elements.length === 0) {
      return createVNode(Text, {}, '');
    }
    
    const children: VNode[] = [];
    
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
      attrs.key = `html-${i}-${element.innerHTML.substring(0, 20)}`;
      
      children.push(createVNode(tagName, attrs, []));
    }
    
    return children.length === 1 ? children[0] : createVNode(Fragment, {}, children);
  } catch (error) {
    console.error('[Markdown Renderer] Failed to create HTML VNode:', error);
    return createVNode(Text, {}, '[HTML Parse Error]');
  }
}

/**
 * 合并 CSS 类名（性能优化）
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
 * @param info - info 字符串
 * @returns [语言名, 属性字符串]
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
 * @param e - 事件对象
 */
export function onLeavePictureInPicture(e: Event): void {
  const target = e.target as HTMLMediaElement;
  if (!target.isConnected) {
    target.pause();
  } else {
    const scrollIntoView = (target as any).scrollIntoViewIfNeeded;
    if (typeof scrollIntoView === 'function') {
      scrollIntoView.call(target);
    }
  }
}

/**
 * 移除指定的属性键
 * @param attrs - 属性对象
 * @param keysToRemove - 要移除的键数组
 * @returns 新的属性对象
 */
export function omitAttrs(attrs: Record<string, any>, keysToRemove: string[]): Record<string, any> {
  const result = getAttrsFromPool();
  
  for (const key in attrs) {
    if (!keysToRemove.includes(key)) {
      result[key] = attrs[key];
    }
  }
  
  return result;
}

/**
 * 创建注释节点
 */
export function createCommentNode(): VNode {
  return createVNode(Comment);
}

/**
 * 创建文本节点
 */
export function createTextNode(text: string): VNode {
  return createVNode(Text, {}, text);
}

/**
 * 创建片段节点
 */
export function createFragmentNode(children: VNode[]): VNode {
  return createVNode(Fragment, {}, children);
}

