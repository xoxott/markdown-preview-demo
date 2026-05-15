import type { PropType, VNode } from 'vue';
import { defineComponent } from 'vue';
import { NButton, NIcon, NTooltip, useThemeVars } from 'naive-ui';
import { ArrowsMaximize, ArrowsMinimize, Copy } from '@vicons/tabler';
import { Close, Save } from '@vicons/ionicons5';
import type { FileItem } from '../types/file-explorer';

export default defineComponent({
  name: 'FileEditorToolbar',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    isDirty: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    isFullscreen: { type: Boolean, default: false },
    showClose: { type: Boolean, default: true },
    onSave: { type: Function as PropType<() => void>, required: true },
    onClose: { type: Function as PropType<() => void>, default: undefined },
    onCopy: { type: Function as PropType<() => void>, default: undefined },
    onToggleFullscreen: { type: Function as PropType<() => void>, default: undefined }
  },
  setup(props, { slots }) {
    const themeVars = useThemeVars();

    return () => (
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2"
        style={{
          borderColor: themeVars.value.dividerColor,
          backgroundColor: themeVars.value.cardColor
        }}
      >
        <div class="min-w-0 flex items-center gap-2">
          <span class="truncate font-medium" style={{ color: themeVars.value.textColorBase }}>
            {props.file.name}
          </span>
          {props.isDirty && (
            <span class="shrink-0 text-xs" style={{ color: themeVars.value.warningColor }}>
              (已修改)
            </span>
          )}
        </div>

        <div class="flex items-center gap-1">
          {(slots.center as (() => VNode) | undefined)?.()}

          {props.onCopy && (
            <NTooltip>
              {{
                trigger: () => (
                  <NButton quaternary size="small" onClick={props.onCopy}>
                    <NIcon size={16}>
                      <Copy />
                    </NIcon>
                  </NButton>
                ),
                default: () => '复制内容'
              }}
            </NTooltip>
          )}

          {props.onToggleFullscreen && (
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

          <NButton
            type="primary"
            size="small"
            loading={props.saving}
            disabled={!props.isDirty}
            onClick={props.onSave}
          >
            <NIcon size={16}>
              <Save />
            </NIcon>
            <span class="ml-1">保存</span>
          </NButton>

          {props.showClose && props.onClose && (
            <NButton size="small" onClick={props.onClose}>
              <NIcon size={16}>
                <Close />
              </NIcon>
            </NButton>
          )}
        </div>
      </div>
    );
  }
});
