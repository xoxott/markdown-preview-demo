/**
 * 安全工具函数
 *
 * 从包中导入基础工具函数，保留组件特有的安全函数
 */

// 从包中导入基础工具函数
export {
  escapeHtml,
  unescapeAll,
  validateAttrName,
  isUrlSafe
} from '@suga/markdown-it-render-vnode';

// 导入 isUrlSafe 用于函数内部使用
import { isUrlSafe } from '@suga/markdown-it-render-vnode';

// 组件特有的安全函数

/** 敏感 URL 协议正则 */
const SENSITIVE_URL_REG = /^javascript:|vbscript:|file:|data:/i;

/** 敏感属性正则 */
const SENSITIVE_ATTR_REG = /^href|src|xlink:href|poster|srcset$/i;

/** 事件属性正则 */
const ATTR_EVENT_REG = /^on/i;

/**
 * 清理 SVG 内容，移除危险元素和属性
 *
 * @param svg - SVG 字符串
 * @returns 清理后的 SVG 字符串
 */
export function sanitizeSvg(svg: string): string {
  // 创建临时 DOM 解析 SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');

  // 检查解析错误
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    console.error('SVG parsing error:', parserError.textContent);
    return '';
  }

  const svgElement = doc.querySelector('svg');
  if (!svgElement) {
    return '';
  }

  // 移除危险的元素
  const dangerousElements = ['script', 'iframe', 'object', 'embed', 'link', 'style', 'foreignObject'];

  dangerousElements.forEach(tagName => {
    const elements = svgElement.querySelectorAll(tagName);
    elements.forEach(el => el.remove());
  });

  // 移除危险的属性
  const allElements = svgElement.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const attrName = attr.name.toLowerCase();

      // 移除事件处理器
      if (ATTR_EVENT_REG.test(attrName)) {
        el.removeAttribute(attr.name);
        return;
      }

      // 移除危险的 URL
      if (SENSITIVE_ATTR_REG.test(attrName)) {
        const value = attr.value;
        if (!isUrlSafe(value)) {
          el.removeAttribute(attr.name);
        }
      }
    });
  });

  // 序列化回字符串
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}

/**
 * 清理 HTML 内容
 *
 * @param html - HTML 字符串
 * @returns 清理后的 HTML 字符串
 */
export function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 移除 script 标签
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  // 移除危险属性
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const attrName = attr.name.toLowerCase();

      if (ATTR_EVENT_REG.test(attrName)) {
        el.removeAttribute(attr.name);
      }

      if (SENSITIVE_ATTR_REG.test(attrName)) {
        const value = attr.value;
        if (!isUrlSafe(value)) {
          el.removeAttribute(attr.name);
        }
      }
    });
  });

  return doc.body.innerHTML;
}
