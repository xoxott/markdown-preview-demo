/**
 * Mermaid 图表渲染器组件
 *
 * @module MermaidRenderer
 */

import {
  type PropType,
  Transition,
  computed,
  defineComponent,
  nextTick,
  onMounted,
  ref,
  watch
} from 'vue';
import { NCard } from 'naive-ui';
import type { CodeBlockMeta } from '@suga/markdown-it-render-vnode';
import { useToggle } from '@/hooks/customer/useToggle';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useMermaid } from '../hooks/useMermaid';
import { useCodeTools, useSvgTools } from '../hooks/useToolbar';
import { debounce } from '../utils';
import { ToolBar } from './ToolBar';
import { ErrorMessage } from './ErrorMessage';

/** Mermaid 渲染器属性 */
export interface MermaidRendererProps {
  /** 代码块元数据（可选，用于 Markdown 集成） */
  meta?: CodeBlockMeta;
  /** 直接传入的 Mermaid 代码（独立使用时） */
  code?: string;
  /** 语言名称 */
  langName?: string;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否显示边框 */
  bordered?: boolean;
}

/**
 * Mermaid 图表渲染器 支持独立使用或通过 Markdown 集成使用
 *
 * @example
 *   ```tsx
 *   // Markdown 集成
 *   <MermaidRenderer meta={codeBlockMeta} />
 *
 *   // 独立使用
 *   <MermaidRenderer code="graph TD; A-->B;" />
 *   ```;
 */
export const MermaidRenderer = defineComponent({
  name: 'MermaidRenderer',
  props: {
    meta: {
      type: Object as PropType<CodeBlockMeta>,
      default: undefined
    },
    code: {
      type: String,
      default: ''
    },
    langName: {
      type: String,
      default: 'mermaid'
    },
    showToolbar: {
      type: Boolean,
      default: true
    },
    bordered: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    // ==================== 状态管理 ====================
    const { darkMode, cssVars, codeBlockStyle, containerBgStyle } = useMarkdownTheme();
    const { state: showCode, toggle: toggleCode } = useToggle(false);
    const containerRef = ref<HTMLElement>();
    const isRendering = ref(false);

    // ==================== 计算属性 ====================
    /** 实际使用的内容 */
    const content = computed(() => props.meta?.content || props.code);

    /** 显示的语言名称 */
    const displayLangName = computed(() => props.meta?.langName || props.langName);

    /** 内容是否为空 */
    const isEmpty = computed(() => !content.value || !content.value.trim());

    // ==================== Hooks ====================
    const { copyCode, copyFeedback } = useCodeTools();

    const {
      svgValue,
      svgAspectRatio,
      initMermaid,
      renderDiagram,
      containerStyle,
      errorMessage,
      isLoading,
      hasError
    } = useMermaid(content, darkMode);

    const { downloadSVG, startDrag, scale, zoom, position, isDragging, transformStyle } =
      useSvgTools(containerRef, svgValue);

    // ==================== 防抖渲染 ====================
    const debouncedRender = debounce(async () => {
      if (isEmpty.value) {
        return;
      }
      isRendering.value = true;
      try {
        await renderDiagram();
      } finally {
        isRendering.value = false;
      }
    }, 100);

    // ==================== 监听器 ====================
    /** 监听内容变化，自动重新渲染 */
    watch(
      content,
      (newVal, oldVal) => {
        if (newVal !== oldVal && newVal) {
          debouncedRender();
        }
      },
      { immediate: true }
    );

    /** 监听主题变化，标记需要重新初始化（延迟到下次渲染时执行） */
    watch(darkMode, () => {
      // initMermaid 已由 useMermaid 的 renderDiagram 延迟调用
      if (content.value) {
        debouncedRender();
      }
    });

    /** 监听 SVG 变化，调整容器高度 */
    watch(svgValue, () => {
      nextTick(() => {
        if (containerRef.value && svgValue.value) {
          try {
            // 获取容器内的 SVG 元素
            const svgElement = containerRef.value.querySelector('svg');
            if (svgElement) {
              // 使用 SVG 的实际渲染尺寸（getBoundingClientRect 更准确）
              const svgRect = svgElement.getBoundingClientRect();
              let svgHeight = svgRect.height;
              let svgWidth = svgRect.width;

              // 如果 getBoundingClientRect 返回 0（SVG 还未渲染），尝试从 viewBox 获取
              if (svgWidth === 0 || svgHeight === 0) {
                const viewBox = svgElement.getAttribute('viewBox');
                if (viewBox) {
                  const [, , vw, vh] = viewBox.split(/\s+/).map(Number);
                  svgWidth = vw || svgElement.clientWidth || 100;
                  svgHeight = vh || svgElement.clientHeight || 100;
                } else {
                  // 最后的 fallback：使用 getBBox
                  try {
                    const bbox = svgElement.getBBox();
                    svgWidth = bbox.width || 100;
                    svgHeight = bbox.height || 100;
                  } catch {
                    svgWidth = 100;
                    svgHeight = 100;
                  }
                }
              }
              // 直接使用 SVG 的实际渲染高度，加上一些 padding
              const padding = 40; // 上下各 20px
              const calculatedHeight = svgHeight + padding;

              // 设置最小高度和最大高度
              const minHeight = 200;
              const maxHeight = 600;
              const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));

              containerRef.value.style.height = `${finalHeight}px`;
            }
          } catch (err) {
            console.warn('调整容器高度失败:', err);
            // 失败时使用默认高度
            if (containerRef.value) {
              containerRef.value.style.height = '400px';
            }
          }
        }
      });
    });

    /** 监听缩放变化，重置位置 */
    watch(scale, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        position.value = { x: 0, y: 0 };
      }
    });

    // ==================== 生命周期 ====================
    onMounted(() => {
      initMermaid();
    });

    // ==================== 事件处理 ====================
    /** 处理复制 */
    const handleCopy = async (): Promise<void> => {
      try {
        await copyCode(content.value, errorMessage);
      } catch (err) {
        console.error('复制失败:', err);
      }
    };

    /** 处理缩放 */
    const handleZoom = (direction: 'in' | 'out' | 'reset'): void => {
      zoom(direction);
    };

    /** 处理下载 */
    const handleDownload = (): void => {
      try {
        downloadSVG('mermaid-diagram');
      } catch (err) {
        console.error('下载失败:', err);
      }
    };

    /** 处理重试 */
    const handleRetry = async (): Promise<void> => {
      try {
        await renderDiagram();
      } catch (err) {
        console.error('重试失败:', err);
      }
    };

    // ==================== 渲染 ====================
    return () => {
      // 空内容提示
      if (isEmpty.value) {
        return (
          <NCard bordered={props.bordered} class="mb-4 mt-4">
            <div class="empty-message">
              <div class="empty-icon">📊</div>
              <div>Mermaid 图表内容为空</div>
            </div>
          </NCard>
        );
      }

      return (
        <NCard
          bordered={props.bordered}
          class={`mb-4 mt-4 ${darkMode.value ? 'color-mode-dark' : 'color-mode-light'}`}
          style={cssVars.value}
        >
          {/* 工具栏 */}
          {props.showToolbar && (
            <ToolBar
              langName={displayLangName.value}
              copyFeedback={copyFeedback.value}
              errorMessage={errorMessage.value}
              showCode={showCode.value}
              isSvg={true}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onToggleCode={toggleCode}
              onZoom={handleZoom}
              onRetry={handleRetry}
            />
          )}

          {/* 错误提示 */}
          <ErrorMessage message={errorMessage.value} show={hasError.value && !showCode.value} />

          {/* 加载提示 */}
          {isLoading.value && !showCode.value && (
            <div class="mt-4 flex items-center justify-center gap-3 p-8 text-sm text-gray-500">
              <div class="h-5 w-5 animate-spin border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
              <span>正在渲染图表...</span>
            </div>
          )}

          {/* 内容区域 */}
          <div class="relative mt-4">
            <Transition name="fade-bottom" mode="out-in">
              {showCode.value ? (
                <div key="code">
                  <pre
                    class="m-0 overflow-auto rounded p-3 text-sm leading-relaxed"
                    style={codeBlockStyle.value}
                  >
                    {content.value}
                  </pre>
                </div>
              ) : (
                svgValue.value &&
                !hasError.value && (
                  <div
                    key="svg"
                    ref={containerRef}
                    class="relative min-h-[200px] w-full flex touch-none select-none items-center justify-center overflow-hidden rounded-md transition-[height] duration-300"
                    style={containerBgStyle.value}
                  >
                    <div
                      style={transformStyle.value}
                      onMousedown={startDrag}
                      onTouchstart={startDrag}
                      innerHTML={svgValue.value.content}
                    />
                  </div>
                )
              )}
            </Transition>
          </div>
        </NCard>
      );
    };
  }
});
