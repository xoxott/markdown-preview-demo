/**
 * Markmap 思维导图渲染 Hook
 *
 * @module useMindmap
 */

import type { Ref } from 'vue';
import { computed, nextTick, onUnmounted, ref, shallowRef } from 'vue';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import type { IMarkmapOptions } from 'markmap-view';
import * as d3 from 'd3';

/** 缩放方向类型 */
type ZoomDirection = 'in' | 'out' | 'reset';

/** 渲染状态 */
interface RenderState {
  /** 是否正在渲染 */
  isRendering: boolean;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 渲染ID */
  currentRenderId: string | null;
}

/** Markmap 配置常量 */
const MARKMAP_CONFIG_DEFAULTS = {
  /** 缩放比例因子 */
  SCALE_FACTOR: 1.2,
  /** 缩放动画持续时间（毫秒） */
  ZOOM_DURATION: 300,
  /** 渲染超时时间（毫秒） */
  RENDER_TIMEOUT: 5000,
  /** 默认 padding */
  DEFAULT_PADDING_X: 20
} as const;

/** Markmap 默认配置 */
const DEFAULT_MARKMAP_OPTIONS: Partial<IMarkmapOptions> = {
  autoFit: true,
  paddingX: MARKMAP_CONFIG_DEFAULTS.DEFAULT_PADDING_X,
  duration: MARKMAP_CONFIG_DEFAULTS.ZOOM_DURATION
};

/**
 * Markmap 思维导图渲染 Hook
 *
 * @param content - 思维导图内容（响应式）
 * @param svgRef - SVG 元素引用
 * @returns Markmap 渲染相关的状态和方法
 */
export const useMindmap = (content: Ref<string>, svgRef: Ref<SVGElement | null>) => {
  // ==================== 状态管理 ====================
  const errorMessage = ref<string | null>(null);
  const instance = shallowRef<Markmap | null>(null);
  const renderState = ref<RenderState>({
    isRendering: false,
    isInitialized: false,
    currentRenderId: null
  });

  // Transformer 实例（复用）
  const transformer = new Transformer();

  // 渲染计数器
  let renderCounter = 0;

  // ==================== 辅助函数 ====================
  /** 生成唯一的渲染ID */
  const generateRenderId = (): string => {
    renderCounter++;
    return `markmap-${Date.now()}-${renderCounter}`;
  };

  /**
   * 格式化错误信息
   *
   * @param error - 错误对象
   * @param context - 错误上下文
   * @returns 格式化后的错误信息
   */
  const formatError = (error: unknown, context: string): string => {
    if (error instanceof Error) {
      return `${context}: ${error.message}`;
    }
    return `${context}: 未知错误`;
  };

  /**
   * 验证 SVG 元素是否可用
   *
   * @returns 是否可用
   */
  const validateSvgElement = (): boolean => {
    if (!svgRef.value) {
      errorMessage.value = 'SVG 元素未挂载';
      return false;
    }
    if (!svgRef.value.isConnected) {
      errorMessage.value = 'SVG 元素未连接到 DOM';
      return false;
    }
    return true;
  };

  /** 清理 SVG 元素内容 */
  const cleanSvgElement = (): void => {
    if (svgRef.value) {
      // 简单清空内容即可，不需要克隆节点
      // 克隆会导致 D3 的缩放状态丢失
      svgRef.value.innerHTML = '';
    }
  };

  // ==================== 核心功能 ====================
  /** 渲染思维导图 */
  const renderMindmap = async (): Promise<void> => {
    // 防止重复渲染
    if (renderState.value.isRendering) {
      return;
    }

    // 检查内容是否为空
    if (!content.value || !content.value.trim()) {
      errorMessage.value = '思维导图内容为空';
      return;
    }

    const renderId = generateRenderId();
    renderState.value.isRendering = true;
    renderState.value.currentRenderId = renderId;
    errorMessage.value = null;

    try {
      // 超时控制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('渲染超时')), MARKMAP_CONFIG_DEFAULTS.RENDER_TIMEOUT);
      });

      // 渲染逻辑
      const renderPromise = (async () => {
        // 如果存在旧实例，先销毁
        if (instance.value) {
          try {
            instance.value.destroy?.();
          } catch (err) {
            console.warn('销毁旧实例时出错:', err);
          }
          instance.value = null;
        }

        // 转换 Markdown 为思维导图数据
        const { root } = transformer.transform(content.value);

        // 等待 DOM 更新
        await nextTick();

        // 验证 SVG 元素
        if (!validateSvgElement()) {
          throw new Error('SVG 元素不可用');
        }

        // 清理旧内容（现在更安全了，因为实例已销毁）
        cleanSvgElement();

        // 检查是否已被新的渲染请求取消
        if (renderState.value.currentRenderId !== renderId) {
          return;
        }

        // 创建新的 Markmap 实例
        const newInstance = Markmap.create(svgRef.value!, DEFAULT_MARKMAP_OPTIONS, root);

        return newInstance;
      })();

      const newInstance = await Promise.race([renderPromise, timeoutPromise]);

      // 检查是否已被取消
      if (renderState.value.currentRenderId === renderId && newInstance) {
        instance.value = newInstance;
        renderState.value.isInitialized = true;
      }
    } catch (err) {
      // 只在当前渲染未被取消时更新错误信息
      if (renderState.value.currentRenderId === renderId) {
        errorMessage.value = formatError(err, '思维导图渲染失败');
        console.error('Markmap 渲染错误:', err);
      }
    } finally {
      // 只在当前渲染未被取消时更新状态
      if (renderState.value.currentRenderId === renderId) {
        renderState.value.isRendering = false;
        renderState.value.currentRenderId = null;
      }
    }
  };

  /**
   * 缩放控制
   *
   * @param direction - 缩放方向
   */
  const zoom = (direction: ZoomDirection): void => {
    const inst = instance.value;
    if (!inst) {
      console.warn('Markmap 实例未初始化');
      return;
    }

    try {
      const svgNode = inst.svg?.node?.();
      const gNode = inst.g?.node?.();

      if (!svgNode || !gNode) {
        console.warn('SVG 节点不可用');
        return;
      }

      // 重置缩放
      if (direction === 'reset') {
        inst.fit();
        return;
      }

      // 获取当前变换
      const currentTransform = d3.zoomTransform(svgNode);
      const { SCALE_FACTOR, ZOOM_DURATION } = MARKMAP_CONFIG_DEFAULTS;

      // 计算新的缩放比例
      let k = currentTransform.k;
      if (direction === 'in') {
        k *= SCALE_FACTOR;
      } else if (direction === 'out') {
        k /= SCALE_FACTOR;
      }

      // 限制缩放范围（可选）
      k = Math.max(0.1, Math.min(10, k));

      // 创建新的变换
      const newTransform = d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(k);

      // 应用变换动画
      d3.select(gNode).transition().duration(ZOOM_DURATION).attr('transform', newTransform.toString());

      // 同步内部状态
      (svgNode as any).__zoom = newTransform;
    } catch (err) {
      console.error('缩放操作失败:', err);
    }
  };

  /** 放大 */
  const zoomIn = (): void => zoom('in');

  /** 缩小 */
  const zoomOut = (): void => zoom('out');

  /** 重置缩放 */
  const zoomReset = (): void => zoom('reset');

  /** 适应视图 */
  const fit = (): void => {
    if (instance.value) {
      instance.value.fit();
    }
  };

  /** 取消当前渲染 */
  const cancelRender = (): void => {
    renderState.value.currentRenderId = null;
    renderState.value.isRendering = false;
  };

  /** 销毁实例 */
  const destroy = (): void => {
    cancelRender();

    if (instance.value) {
      try {
        // 销毁 Markmap 实例（会自动清理事件监听器）
        instance.value.destroy?.();
      } catch (err) {
        console.error('销毁 Markmap 实例失败:', err);
      }
      instance.value = null;
    }

    // 只有在销毁时才清空内容
    if (svgRef.value) {
      svgRef.value.innerHTML = '';
    }

    renderState.value.isInitialized = false;
  };

  /** 重置状态 */
  const reset = (): void => {
    destroy();
    errorMessage.value = null;
  };

  // ==================== 计算属性 ====================
  /** 是否有错误 */
  const hasError = computed(() => errorMessage.value !== null);

  /** 是否正在加载 */
  const isLoading = computed(() => renderState.value.isRendering);

  /** 是否已初始化 */
  const isReady = computed(() => renderState.value.isInitialized && instance.value !== null);

  /** 是否可以进行缩放操作 */
  const canZoom = computed(() => isReady.value && !isLoading.value);

  // ==================== 生命周期 ====================
  onUnmounted(() => {
    destroy();
  });

  // ==================== 返回 ====================
  return {
    // 核心方法
    renderMindmap,
    zoom,

    // 便捷方法
    zoomIn,
    zoomOut,
    zoomReset,
    fit,

    // 控制方法
    cancelRender,
    destroy,
    reset,

    // 状态
    errorMessage,
    hasError,
    isLoading,
    isReady,
    canZoom,
    instance
  };
};
