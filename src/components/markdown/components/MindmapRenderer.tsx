import { type PropType, computed, defineComponent, ref, watch } from 'vue';
import { NCard } from 'naive-ui';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useMindmap } from '../hooks/useMindmap';
import { useCodeTools, useSvgTools } from '../hooks/useToolbar';
import { debounce } from '../utils';
import type { CodeBlockMeta } from '../plugins/types';
import { ToolBar } from './ToolBar';

export interface MindmapRendererProps {
  /** 代码块元数据（可选，用于 Markdown 集成） */
  meta?: CodeBlockMeta;
  /** 直接传入的 Markmap 代码（独立使用时） */
  code?: string;
  /** 语言名称 */
  langName?: string;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否显示边框 */
  bordered?: boolean;
}

/** 思维导图渲染器（Markmap） 支持独立使用或通过 Markdown 集成使用 */
export const MindmapRenderer = defineComponent({
  name: 'MindmapRenderer',
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
      default: 'markmap'
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
    const svgRef = ref();

    // 计算实际使用的内容和语言名称
    const content = computed(() => props.meta?.content || props.code);
    const displayLangName = computed(() => props.meta?.langName || props.langName);

    // Mindmap 相关
    const { renderMindmap, errorMessage, zoom } = useMindmap(content, svgRef);

    // 工具函数
    const { copyCode, copyFeedback } = useCodeTools();
    const { downloadSVG } = useSvgTools(undefined, svgRef);

    // 防抖渲染
    const debouncedRender = debounce(renderMindmap, 100);

    // 监听内容和主题变化
    watch(content, debouncedRender, { immediate: true });
    watch(darkMode, debouncedRender);

    // 处理动画完成后的渲染
    const handleAfterEnter = () => {
      if (!showCode.value && !errorMessage.value) {
        debouncedRender();
      }
    };

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

    return () => (
      <NCard bordered={props.bordered} class="mb-2 mt-4">
        {props.showToolbar && (
          <ToolBar
            langName={displayLangName.value}
            showCode={showCode.value}
            errorMessage={errorMessage.value}
            copyFeedback={copyFeedback.value}
            isSvg={true}
            onToggleCode={handleToggleCode}
            onRetry={renderMindmap}
            onDownload={downloadSVG}
            onZoom={handleZoom}
            onCopy={handleCopy}
          />
        )}

        {errorMessage.value && !showCode.value && <div class="error-message">❌ {errorMessage.value}</div>}

        <transition name="mindmap-fade" mode="out-in" onAfterEnter={handleAfterEnter}>
          {showCode.value ? (
            <div key="code" class="code-block">
              <pre>{content.value}</pre>
            </div>
          ) : (
            !errorMessage.value && (
              <div key="svg" ref={containerRef} class="svg-container">
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  style={{ color: darkMode.value ? 'white' : 'black' }}
                  class="h-full w-full"
                />
              </div>
            )
          )}
        </transition>
      </NCard>
    );
  }
});

// 添加样式
const style = document.createElement('style');
style.textContent = `
.mindmap-fade-enter-active,
.mindmap-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.mindmap-fade-enter-from,
.mindmap-fade-leave-to {
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
  width: 100%;
  height: auto;
  overflow: hidden;
  border-radius: 6px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
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

if (typeof document !== 'undefined' && !document.getElementById('mindmap-renderer-styles')) {
  style.id = 'mindmap-renderer-styles';
  document.head.appendChild(style);
}
