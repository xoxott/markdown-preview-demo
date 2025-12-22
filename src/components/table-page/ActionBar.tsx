import { defineComponent, type PropType } from 'vue';
import { NButton, NSpace, NBadge, NText } from 'naive-ui';
import { $t } from '@/locales';
import type { ActionBarProps, PresetButtonType } from './types';

export default defineComponent({
  name: 'ActionBar',
  props: {
    config: {
      type: Object as PropType<ActionBarProps['config']>,
      required: true
    },
    selectedKeys: {
      type: Array as PropType<(string | number)[]>,
      required: true
    },
    total: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const presetButtonMap: Record<PresetButtonType, {
      label: string;
      icon: string;
      type: 'default' | 'primary' | 'error';
      needSelection?: boolean;
    }> = {
      add: {
        label: $t('common.add'),
        icon: 'i-carbon-add',
        type: 'primary'
      },
      batchDelete: {
        label: $t('common.batchDelete'),
        icon: 'i-carbon-trash-can',
        type: 'error',
        needSelection: true
      },
      refresh: {
        label: $t('common.refresh'),
        icon: 'i-carbon-renew',
        type: 'default'
      },
      export: {
        label: '导出',
        icon: 'i-carbon-download',
        type: 'default'
      }
    };

    const renderPresetButton = (buttonType: PresetButtonType, buttonConfig: any) => {
      const preset = presetButtonMap[buttonType];
      const {
        label = preset.label,
        icon = preset.icon,
        onClick,
        disabled,
        loading
      } = buttonConfig;

      const isDisabled = disabled || (preset.needSelection && props.selectedKeys.length === 0);

      return (
        <NButton
          type={preset.type}
          disabled={isDisabled}
          loading={loading}
          onClick={onClick}
        >
          <div class="flex items-center gap-4px">
            <div class={`${icon} text-16px`} />
            <span>{label}</span>
            {buttonType === 'batchDelete' && props.selectedKeys.length > 0 && (
              <NBadge value={props.selectedKeys.length} type="error" />
            )}
          </div>
        </NButton>
      );
    };

    const renderCustomButton = (buttonConfig: any, index: number) => {
      const {
        label,
        icon,
        type = 'default',
        secondary = false,
        onClick,
        disabled,
        loading
      } = buttonConfig;

      return (
        <NButton
          key={index}
          type={type}
          secondary={secondary}
          disabled={disabled}
          loading={loading}
          onClick={onClick}
        >
          <div class="flex items-center gap-4px">
            {icon && <div class={`${icon} text-16px`} />}
            <span>{label}</span>
          </div>
        </NButton>
      );
    };

    const renderStats = () => {
      const { showStats = true, statsRender } = props.config;

      if (!showStats) return null;

      if (statsRender) {
        const result = statsRender(props.total, props.selectedKeys.length);
        return typeof result === 'string' ? <NText depth={3} class="text-13px">{result}</NText> : result;
      }

      return (
        <NText depth={3} class="text-13px">
          共 {props.total} 条数据
          {props.selectedKeys.length > 0 && `, 已选择 ${props.selectedKeys.length} 条`}
        </NText>
      );
    };

    return () => (
      <div class="flex items-center justify-between">
        <NSpace size="small">
          {/* Preset buttons */}
          {props.config.preset && Object.entries(props.config.preset).map(([key, config]) => {
            if (config.show !== false) {
              return renderPresetButton(key as PresetButtonType, config);
            }
            return null;
          })}

          {/* Custom buttons */}
          {props.config.custom?.map((buttonConfig, index) => renderCustomButton(buttonConfig, index))}
        </NSpace>

        {/* Stats */}
        {renderStats()}
      </div>
    );
  }
});

