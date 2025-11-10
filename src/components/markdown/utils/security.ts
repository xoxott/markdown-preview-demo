/** 安全工具函数 用于防止 XSS 攻击和其他安全问题 */

/** 敏感 URL 协议正则 */
export const SENSITIVE_URL_REG = /^javascript:|vbscript:|file:|data:/i;

/** 敏感属性正则 */
export const SENSITIVE_ATTR_REG = /^href|src|xlink:href|poster|srcset$/i;

/** 属性名称验证正则 */
export const ATTR_NAME_REG = /^[a-zA-Z_:][a-zA-Z0-9:._-]*$/;

/** 事件属性正则 */
export const ATTR_EVENT_REG = /^on/i;

/**
 * HTML 转义
 *
 * @param str - 原始字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  return str.replace(
    /[&<>"']/g,
    match =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[match] || match
  );
}

/**
 * HTML 反转义
 *
 * @param str - 转义后的字符串
 * @returns 原始字符串
 */
export function unescapeAll(str: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  };
  return str.replace(/&(amp|lt|gt|quot|#39);/g, (_, code) => htmlUnescapes[`&${code};`] || _);
}

/**
 * 验证属性名称合法性
 *
 * @param name - 属性名称
 * @returns 是否合法
 */
export function validateAttrName(name: string): boolean {
  return ATTR_NAME_REG.test(name) && !ATTR_EVENT_REG.test(name);
}

/**
 * 验证 URL 安全性
 *
 * @param url - URL 字符串
 * @returns 是否安全
 */
export function isUrlSafe(url: string): boolean {
  return !SENSITIVE_URL_REG.test(url.trim());
}

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
