import { type PropType, defineComponent, useAttrs } from 'vue';
import type { PopoverPlacement } from 'naive-ui';
import { NButton, NTooltip } from 'naive-ui';
import { twMerge } from 'tailwind-merge';
import SvgIcon from './svg-icon';

const DEFAULT_CLASS = 'h-[36px] text-icon';

export default defineComponent({
  name: 'ButtonIcon',
  inheritAttrs: false,
  props: {
    /** Button class */
    class: String,
    /** Iconify icon name */
    icon: String,
    /** Tooltip content */
    tooltipContent: String,
    /** Tooltip placement */
    tooltipPlacement: {
      type: String as PropType<PopoverPlacement>,
      default: 'bottom'
    },
    zIndex: {
      type: Number,
      default: 98
    }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();

    return () => (
      <NTooltip
        placement={props.tooltipPlacement}
        zIndex={props.zIndex}
        disabled={!props.tooltipContent}
      >
        {{
          trigger: () => (
            <NButton quaternary class={twMerge(DEFAULT_CLASS, props.class)} {...attrs}>
              <div class="flex-center gap-8px">
                {slots.default?.() ?? (props.icon ? <SvgIcon icon={props.icon} /> : null)}
              </div>
            </NButton>
          ),
          default: () => props.tooltipContent
        }}
      </NTooltip>
    );
  }
});
