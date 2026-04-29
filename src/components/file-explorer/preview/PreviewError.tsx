import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { NButton, NIcon, NText, useThemeVars } from 'naive-ui';
import { RefreshOutline, WarningOutline } from '@vicons/ionicons5';

/** 预览错误状态组件 — 显示错误消息和重试按钮 */
export const PreviewError = defineComponent({
  name: 'PreviewError',
  props: {
    message: {
      type: String,
      default: '文件预览失败'
    },
    showRetry: {
      type: Boolean,
      default: true
    },
    onRetry: {
      type: Function as PropType<() => void>,
      default: undefined
    }
  },
  setup(props) {
    const themeVars = useThemeVars();

    return () => (
      <div
        class="h-full flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: themeVars.value.bodyColor }}
      >
        <NIcon size={48} style={{ color: themeVars.value.warningColor }}>
          <WarningOutline />
        </NIcon>

        <div class="text-center">
          <NText depth={2} class="text-sm font-medium">
            {props.message}
          </NText>
        </div>

        {props.showRetry && props.onRetry && (
          <NButton size="small" type="primary" onClick={props.onRetry}>
            <NIcon size={16}>
              <RefreshOutline />
            </NIcon>
            重新加载
          </NButton>
        )}
      </div>
    );
  }
});
