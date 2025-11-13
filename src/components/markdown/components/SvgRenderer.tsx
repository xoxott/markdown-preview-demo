import { type PropType, Transition, computed, defineComponent, ref } from 'vue';
import { NCard } from 'naive-ui';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useCodeTools, useSvgTools } from '../hooks/useToolbar';
import { copySvgToClipboard, downloadSvg, extractSvgMeta, isValidSvg } from '../utils/svg-utils';
import type { CodeBlockMeta, SvgMeta } from '../plugins/types';
import { ToolBar } from './ToolBar';
import { useToggle } from '@/hooks/customer/useToggle';

export interface SvgRendererProps {
  /** 代码块元数据（可选，用于 Markdown 集成） */
  meta?: CodeBlockMeta;
  /** SVG 内容（独立使用时） */
  content?: string;
  /** 语言名称 */
  langName?: string;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否显示边框 */
  bordered?: boolean;
}

/** SVG 渲染器组件 支持 SVG 内容的显示、缩放、拖拽、下载和复制 */
export const SvgRenderer = defineComponent({
  name: 'SvgRenderer',
  props: {
    meta: {
      type: Object as PropType<CodeBlockMeta>,
      default: undefined
    },
    content: {
      type: String,
      default: undefined
    },
    langName: {
      type: String,
      default: 'svg'
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
    const { darkMode, themeVars, cssVars, errorStyle, codeBlockStyle, containerBgStyle } = useMarkdownTheme();
    const { copyCode, copyFeedback } = useCodeTools();
    const { state: showCode, toggle: toggleCode } = useToggle(false);

    const containerRef = ref<HTMLElement | undefined>(undefined);
    const errorMessage = ref<string | null>(null);

    // ==================== 计算属性 ====================
    // 获取实际的 SVG 内容
    const svgContent = computed(() => {
      return props.meta?.content || props.content || '';
    });

    // 显示的语言名称
    const displayLangName = computed(() => props.meta?.langName || props.langName);

    // 验证 SVG
    const isValid = computed(() => isValidSvg(svgContent.value));

    // 提取 SVG 元数据
    const svgMeta = computed<SvgMeta | null>(() => {
      if (!isValid.value) return null;
      return extractSvgMeta(svgContent.value);
    });

    const svgInfo = computed(() => {
      if (!svgMeta.value) return null;
      return {
        viewBox: svgMeta.value.viewBox || '0 0 100 100',
        content: svgMeta.value.content
      };
    });

    // ==================== Hooks ====================
    // 使用 SVG 工具（缩放、拖拽等）
    const { downloadSVG, startDrag, scale, zoom, position, isDragging, transformStyle } = useSvgTools(
      containerRef,
      svgInfo
    );

    // ==================== 事件处理 ====================
    // 处理复制
    const handleCopy = async () => {
      try {
        await copyCode(svgContent.value, errorMessage);
      } catch (err) {
        errorMessage.value = '复制失败';
        console.error(err);
      }
    };

    // 处理下载
    const handleDownload = () => {
      try {
        downloadSVG('svg-diagram');
      } catch (err) {
        errorMessage.value = '下载失败';
        console.error(err);
      }
    };

    // 处理缩放
    const handleZoom = (direction: 'in' | 'out' | 'reset') => {
      zoom(direction);
    };

    // ==================== 渲染 ====================
    return () => {
      // 无效的 SVG 内容
      if (!isValid.value) {
        return (
          <NCard bordered={props.bordered} class="mb-2 mt-4">
            <div class="flex flex-col items-center justify-center p-12 text-gray-400">
              <div class="text-5xl mb-4 opacity-50">⚠️</div>
              <div class="text-sm">无效的 SVG 内容</div>
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
            />
          )}

          {/* 错误提示 */}
          {errorMessage.value && !showCode.value && (
            <div class="flex items-center gap-2 p-4 mt-4 rounded border" style={errorStyle.value}>
              <span class="shrink-0">❌</span>
              <span class="flex-1 leading-relaxed">{errorMessage.value}</span>
            </div>
          )}

          {/* 内容区域 */}
          <div class="relative mt-4 min-h-[200px]">
            <Transition name="fade-bottom" mode="out-in">
              {showCode.value ? (
                <div key="code">
                  <pre class="m-0 p-3 rounded overflow-auto text-sm leading-relaxed" style={codeBlockStyle.value}>
                    {svgContent.value}
                  </pre>
                </div>
              ) : (
                <div
                  key="svg"
                  ref={containerRef}
                  class="relative w-full min-h-[200px] overflow-hidden rounded-md flex items-center justify-center touch-none select-none"
                  style={containerBgStyle.value}
                >
                  <div style={transformStyle.value} onMousedown={startDrag} onTouchstart={startDrag}>
                    <div innerHTML={svgContent.value} />
                  </div>
                </div>
              )}
            </Transition>
          </div>
        </NCard>
      );
    };
  }
});

