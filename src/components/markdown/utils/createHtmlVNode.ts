import type { VNode } from 'vue';
import { Fragment, createVNode } from 'vue';
import DOMPurify from 'dompurify';

// 安全属性白名单
const SAFE_ATTRS = new Set([
  'class',
  'style',
  'href',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'data-*' // 通配 data 属性
]);

/**
 * 创建安全的 HTML 内容 VNode
 *
 * @param html - 原始 HTML 字符串
 * @param isTrusted - 是否信任该内容（默认为 false）
 * @returns 安全渲染的 VNode 片段
 */
export function createHtmlVNode(html: string, isTrusted = false): VNode {
  // 安全净化处理
  const sanitizedHtml = isTrusted
    ? html
    : (DOMPurify.sanitize(html, {
        ALLOWED_ATTR: SAFE_ATTRS,
        FORBID_TAGS: ['script', 'iframe', 'style'],
        RETURN_DOM: true // 返回 DOM 对象以优化性能
      }) as unknown as DocumentFragment);

  // 转换为数组并创建 VNode
  const elements = Array.from(sanitizedHtml.children);
  const children = elements.map((element, index) => {
    const tagName = element.tagName.toLowerCase();

    // 提取安全属性
    const attrs = Array.from(element.attributes)
      .filter(attr => {
        const name = attr.name.toLowerCase();
        return (SAFE_ATTRS.has(name) || (name.startsWith('data-') && !name.includes(':'))) && !name.startsWith('on');
      })
      .reduce(
        (acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        },
        {} as Record<string, string>
      );

    // 生成稳定 key
    const key = `html-node-${index}-${tagName}-${element.getAttribute('data-key') || ''}`;

    // 递归处理子元素（如果允许嵌套）
    const childNodes = element.childNodes.length > 0 ? createHtmlVNode(element.innerHTML, isTrusted).children : [];

    return createVNode(tagName, { ...attrs, key }, childNodes);
  });

  return createVNode(Fragment, { key: `html-fragment-${Date.now()}` }, children);
}
