import { type PropType, Transition, computed, defineComponent, ref, watch } from 'vue';
import { NCard } from 'naive-ui';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useMindmap } from '../hooks/useMindmap';
import { useCodeTools, useSvgTools } from '../hooks/useToolbar';
import { debounce } from '../utils';
import type { CodeBlockMeta } from '../plugins/types';
import { ToolBar } from './ToolBar';
import { ErrorMessage } from './ErrorMessage';

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
    const { darkMode, themeVars, codeBlockStyle } = useMarkdownTheme();
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
      <NCard bordered={props.bordered} class="mb-4 mt-4">
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

        <ErrorMessage message={errorMessage.value} show={!showCode.value} />

        <Transition name="fade-bottom" mode="out-in" onAfterEnter={handleAfterEnter}>
          {showCode.value ? (
            <div key="code" class="mt-3">
              <pre
                class="m-0 p-3 rounded overflow-auto text-sm leading-relaxed"
                style={codeBlockStyle.value}
              >
                {content.value}
              </pre>
            </div>
          ) : (
            !errorMessage.value && (
              <div
                key="svg"
                ref={containerRef}
                class="w-full h-auto overflow-hidden rounded-md touch-none select-none"
              >
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
        </Transition>
      </NCard>
    );
  }
});
