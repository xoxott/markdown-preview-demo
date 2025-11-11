import type { SvgMeta } from '../plugins/types';
import { sanitizeSvg as sanitizeSvgSecurity } from './security';

export { sanitizeSvgSecurity as sanitizeSvg };

/** SVG 工具函数 */

/**
 * 检测字符串是否为 SVG
 *
 * @param content - 内容字符串
 * @returns 是否为 SVG
 */
export function isSvgContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('<svg') && trimmed.includes('</svg>');
}

/**
 * 从 SVG 字符串中提取尺寸信息
 *
 * @param svg - SVG 字符串
 * @returns 尺寸对象
 */
export function extractSvgDimensions(svg: string): {
  width?: string | number;
  height?: string | number;
  viewBox?: string;
} {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      return {};
    }

    // 检查解析错误
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return {};
    }

    const width = svgElement.getAttribute('width');
    const height = svgElement.getAttribute('height');
    const viewBox = svgElement.getAttribute('viewBox');

    return {
      width: width || undefined,
      height: height || undefined,
      viewBox: viewBox || undefined
    };
  } catch (error) {
    console.error('Error extracting SVG dimensions:', error);
    return {};
  }
}

/**
 * 设置 SVG 尺寸
 *
 * @param svg - SVG 字符串
 * @param width - 宽度
 * @param height - 高度
 * @returns 修改后的 SVG 字符串
 */
export function setSvgDimensions(svg: string, width?: string | number, height?: string | number): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    return svg;
  }

  if (width !== undefined) {
    svgElement.setAttribute('width', String(width));
  }

  if (height !== undefined) {
    svgElement.setAttribute('height', String(height));
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}

/**
 * 优化 SVG 字符串
 *
 * @param svg - SVG 字符串
 * @param options - 优化选项
 * @returns 优化后的 SVG 字符串
 */
export function optimizeSvg(
  svg: string,
  options: {
    removeComments?: boolean;
    removeMetadata?: boolean;
    sanitize?: boolean;
  } = {}
): string {
  const { removeComments = true, removeMetadata = true, sanitize = true } = options;

  let result = svg;

  // 清理安全问题
  if (sanitize) {
    result = sanitizeSvgSecurity(result);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(result, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    return result;
  }

  // 移除注释
  if (removeComments) {
    const comments = doc.evaluate('//comment()', doc, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < comments.snapshotLength; i++) {
      const comment = comments.snapshotItem(i);
      comment?.parentNode?.removeChild(comment);
    }
  }

  // 移除元数据
  if (removeMetadata) {
    const metadata = svgElement.querySelector('metadata');
    metadata?.remove();
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}

/**
 * 将 SVG 转换为 Data URL
 *
 * @param svg - SVG 字符串
 * @returns Data URL
 */
export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * 下载 SVG 文件
 *
 * @param svg - SVG 字符串
 * @param filename - 文件名
 */
export function downloadSvg(svg: string, filename: string = 'image.svg'): void {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 复制 SVG 到剪贴板
 *
 * @param svg - SVG 字符串
 * @returns Promise
 */
export async function copySvgToClipboard(svg: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(svg);
  } catch (error) {
    console.error('Failed to copy SVG:', error);
    throw error;
  }
}

/**
 * 验证 SVG 格式
 *
 * @param svg - SVG 字符串
 * @returns 是否有效
 */
export function isValidSvg(svg: string): boolean {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const parserError = doc.querySelector('parsererror');
    return !parserError && Boolean(doc.querySelector('svg'));
  } catch {
    return false;
  }
}

/**
 * 安全地解析 SVG 尺寸属性
 *
 * @param value - 属性值
 * @returns 解析后的数值，如果无法解析则返回 undefined
 */
function parseSvgDimension(value: string | null): number | undefined {
  if (!value) return undefined;

  // 移除单位（px, em, rem, %, 等）
  const numericValue = value.replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(numericValue);

  // 只返回有效的正数
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * 提取 SVG 元数据
 *
 * @param svg - SVG 字符串
 * @param options - 选项
 * @returns SVG 元数据对象
 */
export function extractSvgMeta(svg: string, options?: { sanitize?: boolean }): SvgMeta | null {
  const { sanitize = true } = options || {};

  let result = svg;

  // 安全清理
  if (sanitize) {
    result = sanitizeSvgSecurity(result);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(result, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      return null;
    }

    // 检查解析错误
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.warn('SVG parsing error:', parserError.textContent);
      return null;
    }

    const viewBox = svgElement.getAttribute('viewBox') || undefined;
    const widthAttr = svgElement.getAttribute('width');
    const heightAttr = svgElement.getAttribute('height');

    return {
      content: result,
      viewBox,
      width: parseSvgDimension(widthAttr),
      height: parseSvgDimension(heightAttr)
    };
  } catch (error) {
    console.error('Error extracting SVG metadata:', error);
    return null;
  }
}
