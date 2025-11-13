import { type PropType, defineComponent } from 'vue';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';

export interface ErrorMessageProps {
  /** 错误信息 */
  message: string | null;
  /** 是否显示 */
  show?: boolean;
  /** 是否为绝对定位覆盖层 */
  overlay?: boolean;
}

/** 统一的错误提示组件 用于所有 Markdown 渲染器的错误显示 */
export const ErrorMessage = defineComponent({
  name: 'ErrorMessage',
  props: {
    message: {
      type: String as PropType<string | null>,
      default: null
    },
    show: {
      type: Boolean,
      default: true
    },
    overlay: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const { themeVars } = useMarkdownTheme();

    return () => {
      if (!props.show || !props.message) {
        return null;
      }

      const baseClasses = 'flex items-center gap-2 p-4 rounded-md border';
      const overlayClasses = props.overlay ? 'absolute inset-0 justify-center' : 'mt-4';

      return (
        <div
          class={`${baseClasses} ${overlayClasses}`}
          style={{
            color: themeVars.value.errorColor,
            backgroundColor: themeVars.value.cardColor,
            borderColor: themeVars.value.errorColor,
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <span class="shrink-0 text-lg">❌</span>
          <span class="flex-1 text-sm leading-relaxed">{props.message}</span>
        </div>
      );
    };
  }
});
