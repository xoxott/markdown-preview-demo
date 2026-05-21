import { computed, defineComponent, useAttrs } from 'vue';
import { Icon } from '@iconify/vue';

/**
 * Svg icon
 *
 * - Support iconify and local svg icon
 * - If icon and localIcon are passed at the same time, localIcon will be rendered first
 */
export default defineComponent({
  name: 'SvgIcon',
  inheritAttrs: false,
  props: {
    /** Iconify icon name */
    icon: String,
    /** Local svg icon name */
    localIcon: String
  },
  setup(props) {
    const attrs = useAttrs();

    const bindAttrs = computed<{ class: string; style: string }>(() => ({
      class: (attrs.class as string) || '',
      style: (attrs.style as string) || ''
    }));

    const symbolId = computed(() => {
      const { VITE_ICON_LOCAL_PREFIX: prefix } = import.meta.env;
      const defaultLocalIcon = 'no-icon';
      const icon = props.localIcon || defaultLocalIcon;
      return `#${prefix}-${icon}`;
    });

    const renderLocalIcon = computed(() => props.localIcon || !props.icon);

    return () => {
      if (renderLocalIcon.value) {
        return (
          <svg aria-hidden="true" width="1em" height="1em" {...bindAttrs.value}>
            <use xlinkHref={symbolId.value} fill="currentColor" />
          </svg>
        );
      }
      if (props.icon) {
        return <Icon icon={props.icon} {...bindAttrs.value} />;
      }
      return null;
    };
  }
});
