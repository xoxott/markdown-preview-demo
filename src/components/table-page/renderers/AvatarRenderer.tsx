import { defineComponent, type PropType } from 'vue';
import { NSpace, NText } from 'naive-ui';
import type { AvatarRendererConfig } from '../types';

export default defineComponent({
  name: 'AvatarRenderer',
  props: {
    row: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    config: {
      type: Object as PropType<AvatarRendererConfig>,
      required: true
    }
  },
  setup(props) {
    return () => {
      const { row, config } = props;
      const { avatarField, nameField, size = 28, showOnlineStatus, onlineStatusField } = config;

      const name = row[nameField] || '';
      const avatar = avatarField ? row[avatarField] : null;
      const isOnline = showOnlineStatus && onlineStatusField ? row[onlineStatusField] : false;

      return (
        <NSpace size="small" align="center">
          <div class="flex items-center gap-6px">
            <div class="relative">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  class="rounded-full object-cover"
                  style={{ width: `${size}px`, height: `${size}px` }}
                />
              ) : (
                <div
                  class="rounded-full bg-primary text-white flex items-center justify-center font-500"
                  style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.4}px` }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              {showOnlineStatus && (
                <div
                  class={`absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-gray-800 ${
                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${size * 0.3}px`, height: `${size * 0.3}px` }}
                />
              )}
            </div>
            <NText strong>{name}</NText>
          </div>
        </NSpace>
      );
    };
  }
});

