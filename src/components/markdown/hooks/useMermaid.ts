/**
 * Mermaid 图表渲染 Hook
 * @module useMermaid
 */

import type { Ref } from 'vue';
import { computed, onUnmounted, ref, shallowRef } from 'vue';
import type { MermaidConfig } from 'mermaid';
import mermaid from 'mermaid';

/** SVG 信息接口 */
interface SVGInfo {
  /** SVG viewBox 属性 */
  viewBox: string;
  /** SVG 内容 */
  content: string;
}

/** 渲染状态 */
interface RenderState {
  /** 是否正在渲染 */
  isRendering: boolean;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 当前渲染ID */
  currentRenderId: string | null;
}

/** Mermaid 配置常量 */
const MERMAID_CONFIG_DEFAULTS = {
  DEFAULT_VIEW_BOX: '0 0 100 100',
  DEFAULT_ASPECT_RATIO: 0.8 as number,
  RENDER_TIMEOUT: 5000,
  LOG_LEVEL: 5
} as const;

/**
 * Mermaid 图表渲染 Hook
 * @param content - 图表内容（响应式）
 * @param darkMode - 是否为暗色模式
 * @returns Mermaid 渲染相关的状态和方法
 */
export const useMermaid = (content: Ref<string>, darkMode: boolean) => {
  // ==================== 状态管理 ====================
  const errorMessage = ref<string | null>(null);
  const svgValue = shallowRef<SVGInfo>({
    content: '',
    viewBox: MERMAID_CONFIG_DEFAULTS.DEFAULT_VIEW_BOX
  });
  const svgAspectRatio = ref(MERMAID_CONFIG_DEFAULTS.DEFAULT_ASPECT_RATIO);
  const renderState = ref<RenderState>({
    isRendering: false,
    isInitialized: false,
    currentRenderId: null
  });

  // 渲染计数器，用于生成唯一ID
  let renderCounter = 0;

  // ==================== 配置 ====================
  /**
   * Mermaid 配置项
   */
  const mermaidConfig: MermaidConfig = {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: darkMode ? 'dark' : 'default',
    fontFamily: 'Arial, sans-serif',
    arrowMarkerAbsolute: true,
    themeVariables: {
      primaryColor: '#42b883',
      secondaryColor: '#35495e',
      tertiaryColor: '#fff',
      quaternaryColor: '#ccc'
    },
    logLevel: MERMAID_CONFIG_DEFAULTS.LOG_LEVEL,
    flowchart: {
      curve: 'basis',
      htmlLabels: true
    },
    sequence: {
      diagramMarginX: 30,
      diagramMarginY: 10
    }
  };

  // ==================== 辅助函数 ====================
  /**
   * 生成唯一的渲染ID
   */
  const generateRenderId = (): string => {
    renderCounter++;
    return `mermaid-${Date.now()}-${renderCounter}`;
  };

  /**
   * 解析 SVG 字符串并提取信息
   * @param svgString - SVG 字符串
   * @returns SVG 信息对象
   */
  const parseSVG = (svgString: string): SVGInfo => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svg = doc.documentElement;

      // 检查是否有解析错误
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('SVG 解析失败');
      }

      // 获取并计算 viewBox
      const viewBoxAttr = svg.getAttribute('viewBox');
      const viewBox = viewBoxAttr?.split(/\s+/).map(Number) || [];
      const [, , vw, vh] = viewBox;

      // 更新宽高比（带有效性检查）
      if (vw && vh && vw > 0 && vh > 0) {
        svgAspectRatio.value = vh / vw;
      }

      return {
        viewBox: viewBoxAttr || MERMAID_CONFIG_DEFAULTS.DEFAULT_VIEW_BOX,
        content: new XMLSerializer().serializeToString(svg)
      };
    } catch (error) {
      console.error('SVG 解析错误:', error);
      return {
        viewBox: MERMAID_CONFIG_DEFAULTS.DEFAULT_VIEW_BOX,
        content: svgString
      };
    }
  };

  /**
   * 清理 SVG 中的错误信息
   * @param svg - SVG 字符串
   * @returns 清理后的 SVG 字符串
   */
  const cleanErrorSVG = (svg: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const texts = doc.querySelectorAll('text');

      // 移除错误信息文本
      texts.forEach(el => {
        const text = el.textContent;
        if (text && (text.includes('Syntax error') || text.includes('mermaid version'))) {
          el.remove();
        }
      });

      return new XMLSerializer().serializeToString(doc);
    } catch (error) {
      console.warn('SVG 清理失败，返回原始内容:', error);
      return svg;
    }
  };

  /**
   * 格式化错误信息
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

  // ==================== 核心功能 ====================
  /**
   * 初始化 Mermaid
   */
  const initMermaid = (): void => {
    if (renderState.value.isInitialized) {
      return;
    }

    try {
      mermaid.initialize(mermaidConfig);
      renderState.value.isInitialized = true;
      errorMessage.value = null;
    } catch (err) {
      errorMessage.value = formatError(err, 'Mermaid 初始化失败');
      console.error('Mermaid 初始化错误:', err);
    }
  };

  /**
   * 渲染 Mermaid 图表
   */
  const renderDiagram = async (): Promise<void> => {
    // 防止重复渲染
    if (renderState.value.isRendering) {
      return;
    }

    // 检查内容是否为空
    if (!content.value || !content.value.trim()) {
      errorMessage.value = '图表内容为空';
      return;
    }

    const renderId = generateRenderId();
    renderState.value.isRendering = true;
    renderState.value.currentRenderId = renderId;
    errorMessage.value = null;

    try {
      // 超时控制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('渲染超时')), MERMAID_CONFIG_DEFAULTS.RENDER_TIMEOUT);
      });

      // 渲染图表
      const renderPromise = (async () => {
        await mermaid.parse(content.value);
        const { svg } = await mermaid.render(renderId, content.value);
        return svg;
      })();

      const svg = await Promise.race([renderPromise, timeoutPromise]);

      // 检查是否已被新的渲染请求取消
      if (renderState.value.currentRenderId !== renderId) {
        return;
      }

      // 解析并更新 SVG
      const cleanedSvg = cleanErrorSVG(svg);
      svgValue.value = parseSVG(cleanedSvg);
    } catch (err) {
      // 只在当前渲染未被取消时更新错误信息
      if (renderState.value.currentRenderId === renderId) {
        errorMessage.value = formatError(err, '图表渲染失败');
        console.error('Mermaid 渲染错误:', err);
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
   * 取消当前渲染
   */
  const cancelRender = (): void => {
    renderState.value.currentRenderId = null;
    renderState.value.isRendering = false;
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    cancelRender();
    errorMessage.value = null;
    svgValue.value = {
      content: '',
      viewBox: MERMAID_CONFIG_DEFAULTS.DEFAULT_VIEW_BOX
    };
    svgAspectRatio.value = MERMAID_CONFIG_DEFAULTS.DEFAULT_ASPECT_RATIO;
  };

  // ==================== 计算属性 ====================
  /**
   * 容器样式（基于宽高比）
   */
  const containerStyle = computed(() => ({
    paddingBottom: `${svgAspectRatio.value * 100}%`,
    maxHeight: svgAspectRatio.value > 0 ? `${(1 / svgAspectRatio.value) * 100}px` : 'none'
  }));

  /**
   * 是否有错误
   */
  const hasError = computed(() => errorMessage.value !== null);

  /**
   * 是否正在加载
   */
  const isLoading = computed(() => renderState.value.isRendering);

  // ==================== 生命周期 ====================
  onUnmounted(() => {
    cancelRender();
  });

  // ==================== 返回 ====================
  return {
    // 方法
    initMermaid,
    renderDiagram,
    cancelRender,
    reset,

    // 状态
    svgValue,
    svgAspectRatio,
    errorMessage,
    hasError,
    isLoading,

    // 样式
    containerStyle
  };
};
