/**
 * EditorToolbar — 独立的编辑器工具栏组件
 *
 * 纯 UI 组件，通过回调 props 驱动，不持有编辑器状态。 通过 `actions` prop 控制显示哪些按钮，灵活适配不同场景。
 */
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { NButton, NIcon, NSpace, NTooltip } from 'naive-ui';
import {
  ArrowsMaximize,
  ArrowsMinimize,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  FileCode
} from '@vicons/tabler';

export type ToolbarAction = 'copy' | 'format' | 'fold' | 'fullscreen';

export interface EditorToolbarProps {
  language?: string;
  readonly?: boolean;
  folding?: boolean;
  actions?: ToolbarAction[];
  isFolded?: boolean;
  isFullscreen?: boolean;
  onCopy?: () => void;
  onFormat?: () => void;
  onToggleFold?: () => void;
  onToggleFullscreen?: () => void;
}

export const EditorToolbar = defineComponent({
  name: 'EditorToolbar',
  props: {
    language: { type: String, default: '' },
    readonly: { type: Boolean, default: false },
    folding: { type: Boolean, default: true },
    actions: {
      type: Array as PropType<ToolbarAction[]>,
      default: () => ['copy', 'fullscreen'] as ToolbarAction[]
    },
    isFolded: { type: Boolean, default: false },
    isFullscreen: { type: Boolean, default: false },
    onCopy: { type: Function as PropType<() => void>, default: undefined },
    onFormat: { type: Function as PropType<() => void>, default: undefined },
    onToggleFold: { type: Function as PropType<() => void>, default: undefined },
    onToggleFullscreen: { type: Function as PropType<() => void>, default: undefined }
  },
  setup(props) {
    const showAction = (action: ToolbarAction) => props.actions.includes(action);

    return () => (
      <div class="flex items-center justify-between border-b border-gray-200 from-gray-50 to-gray-100 bg-gradient-to-r px-3 py-2 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
        {/* 左侧：语言标签 + 只读标识 */}
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 border border-gray-200 rounded-md bg-white px-2.5 py-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <NIcon size={16} class="text-blue-500 dark:text-blue-400">
              <Code />
            </NIcon>
            <span class="text-xs text-gray-700 font-medium tracking-wide uppercase dark:text-gray-300">
              {props.language}
            </span>
          </div>
          {props.readonly && (
            <div class="flex items-center gap-1 border border-blue-200 rounded-md bg-blue-50 px-2 py-1 dark:border-blue-800 dark:bg-blue-900/30">
              <div class="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
              <span class="text-xs text-blue-600 font-medium dark:text-blue-400">只读</span>
            </div>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <NSpace size={4}>
          {/* 折叠 */}
          {showAction('fold') && props.readonly && props.folding && (
            <NTooltip>
              {{
                trigger: () => (
                  <NButton quaternary size="small" onClick={props.onToggleFold}>
                    <NIcon size={16}>{props.isFolded ? <ChevronRight /> : <ChevronDown />}</NIcon>
                  </NButton>
                ),
                default: () => (props.isFolded ? '展开所有' : '折叠所有')
              }}
            </NTooltip>
          )}

          {/* 格式化 */}
          {showAction('format') && !props.readonly && (
            <NTooltip>
              {{
                trigger: () => (
                  <NButton quaternary size="small" onClick={props.onFormat}>
                    <NIcon size={16}>
                      <FileCode />
                    </NIcon>
                  </NButton>
                ),
                default: () => '格式化代码'
              }}
            </NTooltip>
          )}

          {/* 复制 */}
          {showAction('copy') && (
            <NTooltip>
              {{
                trigger: () => (
                  <NButton quaternary size="small" onClick={props.onCopy}>
                    <NIcon size={16}>
                      <Copy />
                    </NIcon>
                  </NButton>
                ),
                default: () => '复制代码'
              }}
            </NTooltip>
          )}

          {/* 全屏 */}
          {showAction('fullscreen') && (
            <NTooltip>
              {{
                trigger: () => (
                  <NButton quaternary size="small" onClick={props.onToggleFullscreen}>
                    <NIcon size={16}>
                      {props.isFullscreen ? <ArrowsMinimize /> : <ArrowsMaximize />}
                    </NIcon>
                  </NButton>
                ),
                default: () => (props.isFullscreen ? '退出全屏' : '全屏')
              }}
            </NTooltip>
          )}
        </NSpace>
      </div>
    );
  }
});
