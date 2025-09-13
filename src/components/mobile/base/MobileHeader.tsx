import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { NIcon } from 'naive-ui';
import { ChevronBack } from '@vicons/ionicons5';
import type { HeaderConfig } from '../types/mobile';

export const MobileHeader = defineComponent({
  name: 'MobileHeader',
  props: {
    config: {
      type: Object as PropType<HeaderConfig>,
      default: () => ({})
    }
  },
  emits: ['back', 'action'],
  setup(props, { emit, slots }) {
    const defaultConfig = {
      show: true,
      showBack: true,
      title: '',
      backgroundColor: 'transparent',
      textColor: '#000',
      height: 'auto',
      ...props.config
    };

    const handleBack = () => {
      emit('back');
    };

    const handleAction = (action: string, data?: any) => {
      emit('action', { action, data });
    };

    return () => {
      if (!defaultConfig.show) return null;

      const headerStyle = {
        backgroundColor: defaultConfig.backgroundColor,
        color: defaultConfig.textColor,
        height: defaultConfig.height
      };

      return (
        <div class="flex items-center justify-between py-2" style={headerStyle}>
          {/* 左侧内容 */}
          <div class="min-w-0 flex flex-1 items-center">
            {defaultConfig.leftContent ? (
              <div onClick={() => handleAction('left')}>{defaultConfig.leftContent}</div>
            ) : defaultConfig.showBack ? (
              <div class="cursor-pointer rounded-full p-1 transition-colors" onClick={handleBack}>
                <NIcon size={20}>{defaultConfig.backIcon || <ChevronBack />}</NIcon>
              </div>
            ) : (
              <div class="w-6" />
            )}
          </div>

          {/* 中间标题 */}
          <div class="flex-1 text-center">
            {slots.title ? slots.title() : <div class="truncate px-4 text-lg font-semibold">{defaultConfig.title}</div>}
          </div>

          {/* 右侧内容 */}
          <div class="min-w-0 flex flex-1 items-center justify-end">
            {defaultConfig.rightContent ? (
              <div onClick={() => handleAction('right')}>{defaultConfig.rightContent}</div>
            ) : slots.right ? (
              slots.right()
            ) : (
              <div class="w-6" />
            )}
          </div>
        </div>
      );
    };
  }
});
