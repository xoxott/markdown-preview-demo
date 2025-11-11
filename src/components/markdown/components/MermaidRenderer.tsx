import { type CSSProperties, type PropType, computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue';
import { NCard } from 'naive-ui';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useMermaid } from '../hooks/useMermaid';
import { useCodeTools, useSvgTools } from '../hooks/useToolbar';
import { debounce } from '../utils';
import type { CodeBlockMeta } from '../plugins/types';
import { ToolBar } from './ToolBar';

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

/** Mermaid 图表渲染器 支持独立使用或通过 Markdown 集成使用 */
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
    const { darkMode } = useMarkdownTheme();
    const showCode = ref(false);
    const containerRef = ref<HTMLElement>();

    // 计算实际使用的内容和语言名称
    const content = computed(() => props.meta?.content || props.code);
    const displayLangName = computed(() => props.meta?.langName || props.langName);

    // 工具函数
    const { copyCode, copyFeedback } = useCodeTools();

    // Mermaid 相关
    const { svgValue, svgAspectRatio, initMermaid, renderDiagram, containerStyle, errorMessage } = useMermaid(
      content,
      darkMode.value
    );

    // SVG 工具
    const { downloadSVG, startDrag, scale, zoom, position, isDragging } = useSvgTools(containerRef, svgValue);

    // 监听缩放变化，自动居中
    watch(scale, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        position.value = { x: 0, y: 0 };
      }
    });

    // 防抖渲染
    const debouncedRender = debounce(renderDiagram, 100);

    // 监听内容变化
    watch(
      content,
      (newVal, oldVal) => {
        if (newVal !== oldVal) debouncedRender();
      },
      { immediate: true }
    );

    // 监听主题变化
    watch(darkMode, () => {
      initMermaid();
    });

    // 监听 SVG 变化，调整容器高度
    watch(svgValue, () => {
      nextTick(() => {
        if (containerRef.value) {
          const { width } = containerRef.value.getBoundingClientRect();
          containerRef.value.style.height = `${width * svgAspectRatio.value}px`;
        }
      });
    });

    onMounted(() => {
      initMermaid();
    });

    // 事件处理
    const handleCopy = () => {
      copyCode(content.value, errorMessage);
    };

    const handleToggleCode = () => {
      showCode.value = !showCode.value;
    };

    const handleZoom = (direction: 'in' | 'out' | 'reset') => {
      zoom(direction);
    };

    // 计算 SVG 包裹器样式
    const svgWrapperStyle = computed<CSSProperties>(() => ({
      transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
      cursor: isDragging.value ? 'grabbing' : 'grab'
    }));

    return () => (
      <NCard bordered={props.bordered} class="mb-2 mt-4">
        {props.showToolbar && (
          <ToolBar
            langName={displayLangName.value}
            copyFeedback={copyFeedback.value}
            errorMessage={errorMessage.value}
            showCode={showCode.value}
            theme={darkMode.value ? 'dark' : 'light'}
            isSvg={true}
            onCopy={handleCopy}
            onDownload={downloadSVG}
            onToggleCode={handleToggleCode}
            onZoom={handleZoom}
            onRetry={renderDiagram}
          />
        )}

        {errorMessage.value && !showCode.value && <div class="error-message">❌ {errorMessage.value}</div>}

        <transition name="mermaid-fade" mode="out-in">
          {showCode.value ? (
            <div key="code" class="code-block">
              <pre>{content.value}</pre>
            </div>
          ) : (
            svgValue.value &&
            !errorMessage.value && (
              <div key="svg" ref={containerRef} class="svg-container" style={containerStyle.value}>
                <div
                  class="svg-wrapper"
                  style={svgWrapperStyle.value}
                  onMousedown={startDrag}
                  onTouchstart={startDrag}
                >
                  <svg
                    viewBox={svgValue.value.viewBox}
                    class="scalable-svg"
                    innerHTML={svgValue.value.content}
                  />
                </div>
              </div>
            )
          )}
        </transition>
      </NCard>
    );
  }
});

// 添加样式（可以移到独立的 CSS 文件）
const style = document.createElement('style');
style.textContent = `
.mermaid-fade-enter-active,
.mermaid-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.mermaid-fade-enter-from,
.mermaid-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.error-message {
  color: #dc2626;
  background: #fef2f2;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border: 1px solid #fecaca;
}

.svg-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.svg-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  transition: transform 0.2s ease-out;
  will-change: transform;
  transform-origin: top left;
  width: 100%;
  height: 100%;
}

.scalable-svg {
  transform-origin: center center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  width: auto;
  height: auto;
}

@media (max-width: 640px) {
  .svg-container {
    max-height: 30vh;
  }
}

.code-block pre {
  margin: 0 !important;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('mermaid-renderer-styles')) {
  style.id = 'mermaid-renderer-styles';
  document.head.appendChild(style);
}
