import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { NButton, NIcon, NTooltip, useThemeVars } from 'naive-ui';
import { ArrowsMaximize, ArrowsMinimize, Copy } from '@vicons/tabler';
import { Save } from '@vicons/ionicons5';

export default defineComponent({
  name: 'FileEditorToolbar',
  props: {
    isDirty: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    onSave: { type: Function as PropType<() => void>, required: true },
    onCopy: { type: Function as PropType<() => void>, default: undefined },
    onToggleFullscreen: { type: Function as PropType<() => void>, default: undefined },
    isFullscreen: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    const themeVars = useThemeVars();

    return () => (
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5"
        style={{
          borderColor: themeVars.value.dividerColor,
          backgroundColor: themeVars.value.cardColor
        }}
      >
        <div class="min-w-0 flex flex-wrap items-center gap-2">
          {slots.default?.()}
          {props.isDirty && (
            <span class="shrink-0 text-xs" style={{ color: themeVars.value.warningColor }}>
              未保存
            </span>
          )}
        </div>

        <div class="flex items-center gap-1">
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

          <NTooltip>
            {{
              trigger: () => (
                <NButton
                  quaternary
                  size="small"
                  loading={props.saving}
                  disabled={!props.isDirty}
                  onClick={props.onSave}
                >
                  <NIcon size={16}>
                    <Save />
                  </NIcon>
                </NButton>
              ),
              default: () => '保存'
            }}
          </NTooltip>
        </div>
      </div>
    );
  }
});
