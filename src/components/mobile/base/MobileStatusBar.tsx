import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { NIcon } from 'naive-ui';
import { BatteryFullOutline, Cellular, Wifi } from '@vicons/ionicons5';
import type { StatusBarConfig } from '../types/mobile';

export const MobileStatusBar = defineComponent({
  name: 'MobileStatusBar',
  props: {
    config: {
      type: Object as PropType<StatusBarConfig>,
      default: () => ({})
    }
  },
  setup(props) {
    const defaultConfig = {
      show: true,
      showBattery: true,
      showWifi: true,
      showCellular: true,
      ...props.config
    };

    return () => {
      if (!defaultConfig.show) return null;

      return (
        <div class="flex items-center justify-between text-sm font-medium">
          <div class="font-bold">
            {defaultConfig.time ||
              new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
          </div>
          <div class="flex items-center gap-1">
            {defaultConfig.customIcons?.map((Icon, index) => (
              <NIcon key={index} size={18}>
                <Icon />
              </NIcon>
            ))}
            {defaultConfig.showCellular && (
              <NIcon size={18}>
                <Cellular />
              </NIcon>
            )}
            {defaultConfig.showWifi && (
              <NIcon size={18}>
                <Wifi />
              </NIcon>
            )}
            {defaultConfig.showBattery && (
              <NIcon size={18}>
                <BatteryFullOutline />
              </NIcon>
            )}
          </div>
        </div>
      );
    };
  }
});
