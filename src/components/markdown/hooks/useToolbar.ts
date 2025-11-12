/**
 * Markdown 工具栏相关 Hooks
 * @module useToolbar
 */

import { computed, onUnmounted, ref } from 'vue';
import type { Ref } from 'vue';
import { useClipboard } from '@vueuse/core';

/** SVG 信息接口 */
interface SVGInfo {
  /** viewBox 属性 */
  viewBox: string;
  /** SVG 内容 */
  content: string;
}

/** 复制反馈配置 */
const COPY_FEEDBACK_CONFIG = {
  /** 反馈显示时长（毫秒） */
  DURATION: 2000
} as const;

/** 缩放配置 */
const ZOOM_CONFIG = {
  /** 最大缩放比例 */
  MAX_SCALE: 3,
  /** 最小缩放比例 */
  MIN_SCALE: 0.5,
  /** 缩放步进 */
  STEP: 0.1
} as const;

/**
 * 代码工具 Hook
 * 提供代码复制功能
 *
 * @returns 代码工具相关的方法和状态
 *
 * @example
 * ```typescript
 * const { copyCode, copyFeedback, isSupported } = useCodeTools();
 *
 * await copyCode('console.log("hello")');
 * if (copyFeedback.value) {
 *   console.log('复制成功');
 * }
 * ```
 */
export function useCodeTools() {
  const { copy, isSupported } = useClipboard();
  const copyFeedback = ref(false);
  let feedbackTimer: number | null = null;

  /**
   * 清除反馈定时器
   */
  const clearFeedbackTimer = (): void => {
    if (feedbackTimer !== null) {
      clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
  };

  /**
   * 复制代码到剪贴板
   * @param content - 要复制的内容
   * @param errorMessage - 可选的错误信息引用
   */
  const copyCode = async (
    content: string,
    errorMessage?: Ref<string | null> | null | undefined
  ): Promise<void> => {
    // 检查浏览器支持
    if (!isSupported.value) {
      if (errorMessage) {
        errorMessage.value = '当前浏览器不支持剪贴板功能';
      }
      console.warn('剪贴板 API 不支持');
      return;
    }

    // 检查内容是否为空
    if (!content || !content.trim()) {
      if (errorMessage) {
        errorMessage.value = '复制内容为空';
      }
      return;
    }

    try {
      await copy(content);

      // 清除之前的定时器
      clearFeedbackTimer();

      // 显示复制成功反馈
      copyFeedback.value = true;

      // 设置自动隐藏
      feedbackTimer = setTimeout(() => {
        copyFeedback.value = false;
        feedbackTimer = null;
      }, COPY_FEEDBACK_CONFIG.DURATION) as unknown as number;
    } catch (err) {
      if (errorMessage) {
        errorMessage.value = `复制失败: ${err instanceof Error ? err.message : '未知错误'}`;
      }
      console.error('复制失败:', err);
    }
  };

  /**
   * 手动清除复制反馈
   */
  const clearFeedback = (): void => {
    clearFeedbackTimer();
    copyFeedback.value = false;
  };

  // 组件卸载时清理
  onUnmounted(() => {
    clearFeedbackTimer();
  });

  return {
    copyCode,
    copyFeedback,
    clearFeedback,
    isSupported
  };
}

/**
 * SVG 工具 Hook
 * 提供 SVG 缩放、拖拽、下载和复制功能
 *
 * @param containerRef - 容器元素引用
 * @param svgValue - SVG 值引用
 * @returns SVG 工具相关的方法和状态
 *
 * @example
 * ```typescript
 * const { zoom, downloadSVG, copySvg, scale, position } = useSvgTools(containerRef, svgValue);
 *
 * // 缩放
 * zoom('in');  // 放大
 * zoom('out'); // 缩小
 * zoom('reset'); // 重置
 *
 * // 下载
 * downloadSVG('my-diagram');
 * ```
 */
export function useSvgTools(
  containerRef: Ref<HTMLElement | undefined> | undefined,
  svgValue: Ref<SVGInfo | SVGElement | null>
) {
  // ==================== 状态管理 ====================
  const scale = ref(1);
  const position = ref({ x: 0, y: 0 });
  const isDragging = ref(false);
  const startPos = ref({ x: 0, y: 0 });
  const errorMessage = ref<string | null>(null);

  // 剪贴板工具
  const { copy, isSupported: isClipboardSupported } = useClipboard();

  // ==================== 辅助函数 ====================
  /**
   * 获取 SVG 内容字符串
   * @returns SVG 内容或 null
   */
  const getSvgContent = (): string | null => {
    if (!svgValue.value) {
      return null;
    }

    try {
      if ('content' in svgValue.value) {
        return svgValue.value.content;
      } else if (svgValue.value instanceof SVGElement) {
        return new XMLSerializer().serializeToString(svgValue.value);
      }
    } catch (err) {
      console.error('获取 SVG 内容失败:', err);
      errorMessage.value = '获取 SVG 内容失败';
    }

    return null;
  };

  /**
   * 验证容器是否可用
   */
  const validateContainer = (): boolean => {
    if (!containerRef || !containerRef.value) {
      console.warn('容器元素未定义');
      return false;
    }
    return true;
  };

  /**
   * 限制数值在指定范围内
   */
  const clamp = (value: number, min: number, max: number): number => {
    return Math.min(max, Math.max(min, value));
  };

  // ==================== 缩放功能 ====================
  /**
   * 计算拖拽边界
   */
  const boundary = computed(() => {
    if (!validateContainer()) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const rect = containerRef!.value!.getBoundingClientRect();
    const scaledWidth = rect.width * scale.value;
    const scaledHeight = rect.height * scale.value;

    return {
      minX: rect.width - scaledWidth,
      maxX: 0,
      minY: rect.height - scaledHeight,
      maxY: 0
    };
  });

  /**
   * 缩放控制
   * @param direction - 缩放方向
   */
  const zoom = (direction: 'in' | 'out' | 'reset'): void => {
    const oldScale = scale.value;
    let newScale = oldScale;

    // 计算新的缩放比例
    if (direction === 'in') {
      newScale = Math.min(ZOOM_CONFIG.MAX_SCALE, oldScale + ZOOM_CONFIG.STEP);
    } else if (direction === 'out') {
      newScale = Math.max(ZOOM_CONFIG.MIN_SCALE, oldScale - ZOOM_CONFIG.STEP);
    } else if (direction === 'reset') {
      scale.value = 1;
      position.value = { x: 0, y: 0 };
      return;
    }

    // 如果缩放比例没有变化，直接返回
    if (newScale === oldScale) {
      return;
    }

    scale.value = newScale;

    // 更新位置以保持缩放中心点
    if (!validateContainer()) {
      return;
    }

    const rect = containerRef!.value!.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    position.value = {
      x: (position.value.x - centerX) * (newScale / oldScale) + centerX,
      y: (position.value.y - centerY) * (newScale / oldScale) + centerY
    };
  };

  /**
   * 放大
   */
  const zoomIn = (): void => zoom('in');

  /**
   * 缩小
   */
  const zoomOut = (): void => zoom('out');

  /**
   * 重置缩放
   */
  const zoomReset = (): void => zoom('reset');

  // ==================== 拖拽功能 ====================
  /**
   * 处理拖拽移动
   */
  const handleDrag = (e: MouseEvent | TouchEvent): void => {
    if (!isDragging.value) {
      return;
    }

    e.preventDefault();

    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

    let newX = clientX - startPos.value.x;
    let newY = clientY - startPos.value.y;

    // 限制在边界内
    const b = boundary.value;
    newX = clamp(newX, b.minX, b.maxX);
    newY = clamp(newY, b.minY, b.maxY);

    position.value = { x: newX, y: newY };
  };

  /**
   * 结束拖拽
   */
  const endDrag = (): void => {
    isDragging.value = false;
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('touchmove', handleDrag);
    window.removeEventListener('touchend', endDrag);
  };

  /**
   * 开始拖拽
   */
  const startDrag = (e: MouseEvent | TouchEvent): void => {
    isDragging.value = true;

    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

    startPos.value = {
      x: clientX - position.value.x,
      y: clientY - position.value.y
    };

    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', handleDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
  };

  // ==================== SVG 操作 ====================
  /**
   * 下载 SVG 文件
   * @param filename - 可选的文件名（不含扩展名）
   */
  const downloadSVG = (filename?: string): void => {
    const svgContent = getSvgContent();

    if (!svgContent) {
      errorMessage.value = 'SVG 内容为空，无法下载';
      console.warn('SVG 内容为空');
      return;
    }

    try {
      // 创建 Blob
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename || `diagram-${Date.now()}`}.svg`;

      // 触发下载
      document.body.appendChild(a);
      a.click();

      // 清理
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      errorMessage.value = null;
    } catch (err) {
      errorMessage.value = `下载失败: ${err instanceof Error ? err.message : '未知错误'}`;
      console.error('下载 SVG 失败:', err);
    }
  };

  /**
   * 复制 SVG 到剪贴板
   */
  const copySvg = async (): Promise<void> => {
    if (!isClipboardSupported.value) {
      errorMessage.value = '当前浏览器不支持剪贴板功能';
      console.warn('剪贴板 API 不支持');
      return;
    }

    const svgContent = getSvgContent();

    if (!svgContent) {
      errorMessage.value = 'SVG 内容为空，无法复制';
      console.warn('SVG 内容为空');
      return;
    }

    try {
      await copy(svgContent);
      errorMessage.value = null;
      console.log('SVG 已复制到剪贴板');
    } catch (err) {
      errorMessage.value = `复制失败: ${err instanceof Error ? err.message : '未知错误'}`;
      console.error('复制 SVG 失败:', err);
    }
  };

  /**
   * 重置所有状态
   */
  const reset = (): void => {
    scale.value = 1;
    position.value = { x: 0, y: 0 };
    isDragging.value = false;
    errorMessage.value = null;
  };

  // ==================== 计算属性 ====================
  /**
   * 是否可以缩放
   */
  const canZoom = computed(() => {
    return svgValue.value !== null && validateContainer();
  });

  /**
   * 是否可以下载
   */
  const canDownload = computed(() => {
    return svgValue.value !== null;
  });

  /**
   * 是否可以复制
   */
  const canCopy = computed(() => {
    return svgValue.value !== null && isClipboardSupported.value;
  });

  /**
   * 变换样式
   */
  const transformStyle = computed(() => ({
    transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
    cursor: isDragging.value ? 'grabbing' : 'grab',
    transition: isDragging.value ? 'none' : 'transform 0.1s ease-out'
  }));

  // ==================== 生命周期 ====================
  onUnmounted(() => {
    endDrag();
  });

  // ==================== 返回 ====================
  return {
    // 缩放相关
    scale,
    zoom,
    zoomIn,
    zoomOut,
    zoomReset,

    // 拖拽相关
    position,
    isDragging,
    startDrag,

    // SVG 操作
    downloadSVG,
    copySvg,
    reset,

    // 状态
    errorMessage,
    canZoom,
    canDownload,
    canCopy,
    transformStyle
  };
}
