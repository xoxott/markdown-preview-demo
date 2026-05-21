import { type PropType, defineComponent } from 'vue';
import { NBadge, NButton, NSpace, NText, NTooltip } from 'naive-ui';
import TableColumnSetting from '@/components/advanced/table-column-setting';
import SvgIcon from '@/components/custom/svg-icon';
import { $t } from '@/locales';
import type { ActionBarColumnSetting, ActionBarProps, PresetButtonType } from './types';

/** Uno `i-carbon-*` 或 Iconify `carbon:*` 统一为 SvgIcon 可用的 Iconify 名 */
function resolveIconifyIcon(icon: string) {
  if (icon.includes(':')) return icon;
  if (icon.startsWith('i-carbon-')) return `carbon:${icon.slice('i-carbon-'.length)}`;
  return icon;
}

/**
 * 表格工具条：预设按钮（新增 / 批量删除 / 刷新 / 导出）、自定义按钮与可选列设置。 默认整体靠右；仅在 `config.showStats === true`
 * 时左侧展示统计、右侧为按钮组（两端对齐）。
 */
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
    },
    columnSetting: {
      type: Object as PropType<ActionBarColumnSetting | undefined>,
      default: undefined
    }
  },
  setup(props) {
    /** 在 render 内调用，切换语言时文案会随 locale 更新 */
    const getPresetButtonMap = (): Record<
      PresetButtonType,
      {
        label: string;
        icon: string;
        type: 'default' | 'primary' | 'error';
        needSelection?: boolean;
        iconOnly?: boolean;
      }
    > => ({
      add: {
        label: $t('common.add'),
        icon: 'carbon:add',
        type: 'primary'
      },
      batchDelete: {
        label: $t('common.batchDelete'),
        icon: 'carbon:trash-can',
        type: 'error',
        needSelection: true
      },
      refresh: {
        label: $t('common.refresh'),
        icon: 'carbon:renew',
        type: 'default',
        iconOnly: true
      },
      export: {
        label: $t('common.export'),
        icon: 'carbon:download',
        type: 'default',
        iconOnly: true
      }
    });

    const renderIconOnlyButton = (options: {
      label: string;
      icon: string;
      type: 'default' | 'primary' | 'error';
      disabled?: boolean;
      loading?: boolean;
      onClick?: () => void | Promise<void>;
    }) => (
      <NTooltip>
        {{
          trigger: () => (
            <NButton
              type={options.type}
              disabled={options.disabled}
              loading={options.loading}
              onClick={options.onClick}
              aria-label={options.label}
            >
              <SvgIcon icon={resolveIconifyIcon(options.icon)} class="text-16px" />
            </NButton>
          ),
          default: () => options.label
        }}
      </NTooltip>
    );

    const renderPresetButton = (buttonType: PresetButtonType, buttonConfig: any) => {
      const preset = getPresetButtonMap()[buttonType];
      const { label = preset.label, icon = preset.icon, onClick, disabled, loading } = buttonConfig;

      const isDisabled = disabled || (preset.needSelection && props.selectedKeys.length === 0);
      const iconifyIcon = resolveIconifyIcon(icon);

      if (preset.iconOnly) {
        return renderIconOnlyButton({
          label,
          icon: iconifyIcon,
          type: preset.type,
          disabled: isDisabled,
          loading,
          onClick
        });
      }

      return (
        <NButton type={preset.type} disabled={isDisabled} loading={loading} onClick={onClick}>
          <div class="flex items-center gap-4px">
            <SvgIcon icon={iconifyIcon} class="text-16px" />
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
            {icon ? <SvgIcon icon={resolveIconifyIcon(icon)} class="text-16px" /> : null}
            <span>{label}</span>
          </div>
        </NButton>
      );
    };

    const renderStats = () => {
      const showStats = props.config.showStats ?? false;
      if (!showStats) return null;

      const { statsRender } = props.config;

      if (statsRender) {
        const result = statsRender(props.total, props.selectedKeys.length);
        return typeof result === 'string' ? (
          <NText depth={3} class="text-13px">
            {result}
          </NText>
        ) : (
          result
        );
      }

      return (
        <NText depth={3} class="text-13px">
          共 {props.total} 条数据
          {props.selectedKeys.length > 0 && `，已选择 ${props.selectedKeys.length} 条`}
        </NText>
      );
    };

    return () => {
      const showStats = props.config.showStats ?? false;
      return (
        <div
          class={[
            'flex flex-wrap items-center gap-12px',
            showStats ? 'justify-between' : 'justify-end'
          ].join(' ')}
        >
          {renderStats()}
          <NSpace size="small" wrap={false}>
            {props.config.preset &&
              Object.entries(props.config.preset).map(([key, config]) => {
                if (config.show !== false) {
                  return renderPresetButton(key as PresetButtonType, config);
                }
                return null;
              })}

            {props.config.custom?.map((buttonConfig, index) =>
              renderCustomButton(buttonConfig, index)
            )}

            {props.columnSetting ? (
              <TableColumnSetting
                columns={props.columnSetting.checks}
                onUpdate:columns={props.columnSetting.onUpdateChecks}
              />
            ) : null}
          </NSpace>
        </div>
      );
    };
  }
});
