import { type PropType, defineComponent } from 'vue';
import { NButton, NIcon, NSpace, NTag, NTooltip } from 'naive-ui';
import {
  Check,
  Code,
  Copy,
  Download,
  LayoutBoard,
  PlayerPlay,
  Refresh,
  RotateClockwise2,
  ZoomIn,
  ZoomOut
} from '@vicons/tabler';

export type ZoomDirection = 'in' | 'out' | 'reset';

export interface ToolBarProps {
  /** 是否显示代码 */
  showCode?: boolean;
  /** 复制反馈状态 */
  copyFeedback: boolean;
  /** 语言名称 */
  langName: string;
  /** 错误信息 */
  errorMessage?: string | null;
  /** 是否为 SVG */
  isSvg: boolean;
}

export interface ToolBarEmits {
  (e: 'toggleCode'): void;
  (e: 'zoom', direction: ZoomDirection): void;
  (e: 'download'): void;
  (e: 'copy'): void;
  (e: 'retry'): void;
  (e: 'run'): void;
}

/** 工具栏组件 用于代码块、图表等的操作工具栏 */
export const ToolBar = defineComponent({
  name: 'ToolBar',
  props: {
    showCode: {
      type: Boolean,
      default: false
    },
    copyFeedback: {
      type: Boolean,
      required: true
    },
    langName: {
      type: String,
      required: true
    },
    errorMessage: {
      type: String as PropType<string | null>,
      default: null
    },
    isSvg: {
      type: Boolean,
      required: true
    },
    canRun: {
      type: Boolean,
      default: false
    }
  },
  emits: {
    toggleCode: () => true,
    zoom: (_direction: ZoomDirection) => true,
    download: () => true,
    copy: () => true,
    retry: () => true,
    run: () => true
  },
  setup(props, { emit }) {
    const handleToggleCode = () => emit('toggleCode');
    const handleZoom = (direction: ZoomDirection) => emit('zoom', direction);
    const handleDownload = () => emit('download');
    const handleCopy = () => emit('copy');
    const handleRetry = () => emit('retry');
    const handleRun = () => emit('run');

    // 判断是否可以运行代码

    return () => (
      <div class="mb-4 flex items-center justify-between">
        <NTag size="small" type="info">
          {props.langName.toLocaleUpperCase()}
        </NTag>

        <NSpace size={4}>
          {/* SVG 显示/代码切换按钮 */}
          {props.isSvg && (
            <NButton size="small" onClick={handleToggleCode}>
              <NIcon>{props.showCode ? <LayoutBoard /> : <Code />}</NIcon>
            </NButton>
          )}

          {/* SVG 操作按钮组（仅在非代码模式、无错误且是 SVG 时显示） */}
          {!props.showCode && !props.errorMessage && props.isSvg && (
            <>
              <NTooltip>
                {{
                  trigger: () => (
                    <NButton size="small" onClick={() => handleZoom('in')}>
                      <NIcon>
                        <ZoomIn />
                      </NIcon>
                    </NButton>
                  ),
                  default: () => '放大'
                }}
              </NTooltip>
              <NTooltip>
                {{
                  trigger: () => (
                    <NButton size="small" onClick={() => handleZoom('out')}>
                      <NIcon>
                        <ZoomOut />
                      </NIcon>
                    </NButton>
                  ),
                  default: () => '缩小'
                }}
              </NTooltip>
              <NTooltip>
                {{
                  trigger: () => (
                    <NButton size="small" onClick={() => handleZoom('reset')}>
                      <NIcon>
                        <Refresh />
                      </NIcon>
                    </NButton>
                  ),
                  default: () => '重置缩放'
                }}
              </NTooltip>
              <NTooltip>
                {{
                  trigger: () => (
                    <NButton size="small" onClick={handleDownload}>
                      <NIcon>
                        <Download />
                      </NIcon>
                    </NButton>
                  ),
                  default: () => '下载SVG'
                }}
              </NTooltip>
            </>
          )}

          {/* 复制按钮 */}
          <NTooltip>
            {{
              trigger: () => (
                <NButton size="small" onClick={handleCopy}>
                  <NIcon>{props.copyFeedback ? <Check /> : <Copy />}</NIcon>
                </NButton>
              ),
              default: () => '复制代码'
            }}
          </NTooltip>

          {/* 运行按钮 */}
          {props.canRun && (
            <NTooltip>
              {{
                trigger: () => (
                  <NButton size="small" onClick={handleRun}>
                    <NIcon>
                      <PlayerPlay />
                    </NIcon>
                  </NButton>
                ),
                default: () => '运行代码'
              }}
            </NTooltip>
          )}

          {/* 重试按钮 */}
          {props.errorMessage && (
            <NTooltip>
              {{
                trigger: () => (
                  <NButton size="small" onClick={handleRetry}>
                    <NIcon>
                      <RotateClockwise2 />
                    </NIcon>
                  </NButton>
                ),
                default: () => '重试'
              }}
            </NTooltip>
          )}
        </NSpace>
      </div>
    );
  }
});
