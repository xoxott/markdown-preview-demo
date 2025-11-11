import { type PropType, computed, defineComponent, ref } from 'vue';
import { NCard } from 'naive-ui';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useCodeTools, useSvgTools } from '../hooks/useToolbar';
import { copySvgToClipboard, downloadSvg, extractSvgMeta, isValidSvg } from '../utils/svg-utils';
import type { CodeBlockMeta, SvgMeta } from '../plugins/types';
import { ToolBar } from './ToolBar';

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
    const { darkMode } = useMarkdownTheme();
    const { copyCode, copyFeedback } = useCodeTools();

    const containerRef = ref<HTMLElement | undefined>(undefined);
    const showCode = ref(false);
    const errorMessage = ref<string | null>(null);

    // 获取实际的 SVG 内容
    const svgContent = computed(() => {
      return props.meta?.content || props.content || '';
    });

    // 验证 SVG
    const isValid = computed(() => isValidSvg(svgContent.value));

    // 提取 SVG 元数据
    const svgMeta = computed<SvgMeta | null>(() => {
      if (!isValid.value) return null;
      return extractSvgMeta(svgContent.value);
    });

    // 使用 SVG 工具（缩放、拖拽等）
    const { downloadSVG, startDrag, scale, zoom, position, isDragging } = useSvgTools(containerRef, svgMeta);

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
        downloadSVG();
      } catch (err) {
        errorMessage.value = '下载失败';
        console.error(err);
      }
    };

    // 处理缩放
    const handleZoom = (direction: 'in' | 'out' | 'reset') => {
      zoom(direction);
    };

    // 切换代码显示
    const handleToggleCode = () => {
      showCode.value = !showCode.value;
    };

    return () => {
      if (!isValid.value) {
        return (
          <NCard class="mb-2 mt-4" bordered={props.bordered}>
            <div style={{ color: 'var(--n-color-error)', padding: '20px', textAlign: 'center' }}>无效的 SVG 内容</div>
          </NCard>
        );
      }

      return (
        <NCard class="mb-2 mt-4" bordered={props.bordered}>
          {props.showToolbar && (
            <ToolBar
              langName={props.langName}
              copyFeedback={copyFeedback.value}
              errorMessage={errorMessage.value}
              showCode={showCode.value}
              theme={darkMode.value ? 'dark' : 'light'}
              isSvg={true}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onToggleCode={handleToggleCode}
              onZoom={handleZoom}
            />
          )}

          {/* 错误提示 */}
          {errorMessage.value && !showCode.value && (
            <div style={{ color: 'var(--n-color-error)', fontSize: '12px', marginTop: '8px' }}>
              ❌ {errorMessage.value}
            </div>
          )}

          {/* 代码或 SVG 显示 */}
          {showCode.value ? (
            <div class="code-block" style={{ marginTop: '12px' }}>
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  backgroundColor: darkMode.value ? '#2d2d2d' : '#f6f8fa',
                  borderRadius: '4px',
                  overflow: 'auto'
                }}
              >
                {svgContent.value}
              </pre>
            </div>
          ) : (
            <div
              ref={containerRef}
              class="svg-container"
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                backgroundColor: darkMode.value ? '#1a1a1a' : '#f5f5f5',
                borderRadius: '4px',
                overflow: 'hidden',
                marginTop: '12px',
                minHeight: '200px'
              }}
            >
              <div
                class="svg-wrapper"
                style={{
                  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
                  cursor: isDragging.value ? 'grabbing' : 'grab',
                  transition: isDragging.value ? 'none' : 'transform 0.2s ease'
                }}
                onMousedown={startDrag}
                onTouchstart={startDrag}
                innerHTML={svgContent.value}
              />
            </div>
          )}
        </NCard>
      );
    };
  }
});
