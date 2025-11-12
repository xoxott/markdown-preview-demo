/**
 * Mermaid 图表渲染器组件
 * @module MermaidRenderer
 */

import { type CSSProperties, type PropType, computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue';
import { NCard } from 'naive-ui';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useMermaid } from '../hooks/useMermaid';
import { useCodeTools, useSvgTools } from '../hooks/useToolbar';
import { debounce } from '../utils';
import type { CodeBlockMeta } from '../plugins/types';
import { ToolBar } from './ToolBar';
import { useToggle } from '@/hooks/customer/useToggle';

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
 * Mermaid 图表渲染器
 * 支持独立使用或通过 Markdown 集成使用
 *
 * @example
 * ```tsx
 * // Markdown 集成
 * <MermaidRenderer meta={codeBlockMeta} />
 *
 * // 独立使用
 * <MermaidRenderer code="graph TD; A-->B;" />
 * ```
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
    const { darkMode, themeVars, cssVars } = useMarkdownTheme();
    const { state:showCode,toggle:toggleCode } = useToggle(false);
    const containerRef = ref<HTMLElement>();
    const isRendering = ref(false);

    // ==================== 计算属性 ====================
    /**
     * 实际使用的内容
     */
    const content = computed(() => props.meta?.content || props.code);

    /**
     * 显示的语言名称
     */
    const displayLangName = computed(() => props.meta?.langName || props.langName);

    /**
     * 内容是否为空
     */
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

    const {
      downloadSVG,
      startDrag,
      scale,
      zoom,
      position,
      isDragging,
      transformStyle
    } = useSvgTools(containerRef, svgValue);

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
    /**
     * 监听内容变化，自动重新渲染
     */
    watch(
      content,
      (newVal, oldVal) => {
        if (newVal !== oldVal && newVal) {
          debouncedRender();
        }
      },
      { immediate: true }
    );

    /**
     * 监听主题变化，重新初始化
     */
    watch(darkMode, () => {
      initMermaid();
      if (content.value) {
        debouncedRender();
      }
    });

    /**
     * 监听 SVG 变化，调整容器高度
     */
    watch(svgValue, () => {
      nextTick(() => {
        if (containerRef.value && svgValue.value) {
          try {
            const { width } = containerRef.value.getBoundingClientRect();
            const height = width * svgAspectRatio.value;
            containerRef.value.style.height = `${height}px`;
          } catch (err) {
            console.warn('调整容器高度失败:', err);
          }
        }
      });
    });

    /**
     * 监听缩放变化，重置位置
     */
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
    /**
     * 处理复制
     */
    const handleCopy = async (): Promise<void> => {
      try {
        await copyCode(content.value, errorMessage);
      } catch (err) {
        console.error('复制失败:', err);
      }
    };


    /**
     * 处理缩放
     */
    const handleZoom = (direction: 'in' | 'out' | 'reset'): void => {
      zoom(direction);
    };

    /**
     * 处理下载
     */
    const handleDownload = (): void => {
      try {
        downloadSVG('mermaid-diagram');
      } catch (err) {
        console.error('下载失败:', err);
      }
    };

    /**
     * 处理重试
     */
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
          <NCard bordered={props.bordered} class="mb-2 mt-4">
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
          class={`mb-2 mt-4 ${darkMode.value ? 'color-mode-dark' : 'color-mode-light'}`}
          style={cssVars.value as any}
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
          {hasError.value && !showCode.value && (
            <div class="error-message">
              <span class="error-icon">❌</span>
              <span class="error-text">{errorMessage.value}</span>
            </div>
          )}

          {/* 加载提示 */}
          {isLoading.value && !showCode.value && (
            <div class="loading-message">
              <div class="loading-spinner"></div>
              <span>正在渲染图表...</span>
            </div>
          )}

          {/* 内容区域 */}
          <div class="content-wrapper">
            <div
              class="code-block code-view"
              style={{
                display: showCode.value ? 'block' : 'none'
              }}
            >
              <pre style={{
                margin: 0,
                padding: '12px',
                backgroundColor: themeVars.value.codeColor,
                color: themeVars.value.textColor2,
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {content.value}
              </pre>
            </div>

            {svgValue.value && !hasError.value && (
              <div
                ref={containerRef}
                class="svg-container svg-view"
                style={{
                  ...containerStyle.value,
                  display: showCode.value ? 'none' : 'block'
                }}
              >
                <div
                  class="svg-wrapper"
                  style={transformStyle.value}
                  onMousedown={startDrag}
                  onTouchstart={startDrag}
                  innerHTML={svgValue.value.content}
                />
              </div>
            )}
          </div>
        </NCard>
      );
    };
  }
});

// ==================== 样式 ====================
const style = document.createElement('style');
style.textContent = `
/* 空内容提示 */
.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #9ca3af;
  font-size: 14px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* 错误提示 */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
  background: #fef2f2;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border: 1px solid #fecaca;
  font-size: 14px;
}

.error-icon {
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  line-height: 1.5;
}

/* 加载提示 */
.loading-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  color: #6b7280;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 内容包裹器 */
.content-wrapper {
  position: relative;
  margin-top: 1rem;
  min-height: 200px;
}

/* 代码视图和 SVG 视图的淡入动画 */
.code-view,
.svg-view {
  animation: fadeInUp 0.3s ease-out;
}

/* 隐藏时不显示 */
.code-view[style*="display: none"],
.svg-view[style*="display: none"] {
  display: none !important;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* SVG 容器 */
.svg-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  background: var(--n-color-base, #fafafa);
  transition: height 0.3s ease;
}

.color-mode-dark .svg-container {
  background: var(--n-color-base, #1a1a1a);
}

.svg-container:active {
  cursor: grabbing;
}

/* SVG 包裹器 */
.svg-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
}

/* SVG 包裹器内的 SVG 元素 */
.svg-wrapper > svg {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

/* 代码块 */
.code-block pre {
  margin: 0 !important;
  white-space: pre;
  word-wrap: normal;
  overflow-x: auto;
}

/* 响应式 */
@media (max-width: 640px) {
  .svg-container {
    max-height: 30vh;
  }

  .empty-message {
    padding: 2rem 1rem;
  }

  .empty-icon {
    font-size: 2rem;
  }
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .svg-container {
    background: #1a1a1a;
  }
}
`;

// 注入样式
if (typeof document !== 'undefined' && !document.getElementById('mermaid-renderer-styles')) {
  style.id = 'mermaid-renderer-styles';
  document.head.appendChild(style);
}
