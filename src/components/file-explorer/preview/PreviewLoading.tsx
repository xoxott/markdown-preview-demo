import { defineComponent } from 'vue';
import { NSpin, NText, useThemeVars } from 'naive-ui';

/** 预览加载状态组件 */
export const PreviewLoading = defineComponent({
  name: 'PreviewLoading',
  props: {
    tip: {
      type: String,
      default: '正在加载文件...'
    }
  },
  setup(props) {
    const themeVars = useThemeVars();

    return () => (
      <div
        class="h-full flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: themeVars.value.bodyColor }}
      >
        <NSpin size="large" />
        <NText depth={3} class="text-sm">
          {props.tip}
        </NText>
      </div>
    );
  }
});
