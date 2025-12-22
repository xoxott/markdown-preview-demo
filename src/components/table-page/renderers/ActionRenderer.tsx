import { defineComponent, type PropType } from 'vue';
import { NButton, NSpace, NPopconfirm, NDropdown } from 'naive-ui';
import type { ActionRendererConfig, ActionButtonItemConfig } from '../types';

export default defineComponent({
  name: 'ActionRenderer',
  props: {
    row: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    config: {
      type: Object as PropType<ActionRendererConfig>,
      required: true
    }
  },
  setup(props) {
    const renderButton = (button: ActionButtonItemConfig, row: any) => {
      // Check if button should be shown
      const show = typeof button.show === 'function' ? button.show(row) : button.show !== false;
      if (!show) return null;

      // Check if button should be disabled
      const disabled = typeof button.disabled === 'function' ? button.disabled(row) : button.disabled;

      const buttonNode = (
        <NButton
          size="small"
          type={button.type || 'default'}
          secondary={button.secondary !== false}
          disabled={disabled}
          onClick={() => button.onClick(row)}
        >
          <div class="flex items-center gap-4px">
            {button.icon && <div class={`${button.icon} text-14px`} />}
            <span>{button.label}</span>
          </div>
        </NButton>
      );

      // Wrap with confirm dialog if needed
      if (button.confirm) {
        return (
          <NPopconfirm onPositiveClick={() => button.onClick(row)}>
            {{
              trigger: () => buttonNode,
              default: () => button.confirm!.content || `确定要${button.label}吗？`
            }}
          </NPopconfirm>
        );
      }

      return buttonNode;
    };

    return () => {
      const { row, config } = props;
      const { buttons, maxShow = 3, moreText = '更多' } = config;

      const visibleButtons = buttons.filter(button => {
        const show = typeof button.show === 'function' ? button.show(row) : button.show !== false;
        return show;
      });

      if (visibleButtons.length === 0) {
        return null;
      }

      // If buttons count is within limit, show all
      if (visibleButtons.length <= maxShow) {
        return (
          <NSpace size="small">
            {visibleButtons.map((button, index) => (
              <div key={index}>{renderButton(button, row)}</div>
            ))}
          </NSpace>
        );
      }

      // Show some buttons + dropdown for more
      const displayButtons = visibleButtons.slice(0, maxShow - 1);
      const moreButtons = visibleButtons.slice(maxShow - 1);

      const dropdownOptions = moreButtons.map((button, index) => ({
        label: button.label,
        key: index,
        icon: button.icon
          ? () => <div class={`${button.icon} text-16px`} />
          : undefined,
        disabled: typeof button.disabled === 'function' ? button.disabled(row) : button.disabled,
        props: {
          onClick: () => {
            if (button.confirm) {
              // Handle confirm in dropdown
              window.$dialog?.warning({
                title: button.confirm.title,
                content: button.confirm.content || `确定要${button.label}吗？`,
                positiveText: '确定',
                negativeText: '取消',
                onPositiveClick: () => {
                  button.onClick(row);
                }
              });
            } else {
              button.onClick(row);
            }
          }
        }
      }));

      return (
        <NSpace size="small">
          {displayButtons.map((button, index) => (
            <div key={index}>{renderButton(button, row)}</div>
          ))}
          <NDropdown options={dropdownOptions} trigger="click">
            <NButton size="small" secondary>
              <div class="flex items-center gap-4px">
                <div class="i-carbon-overflow-menu-horizontal text-14px" />
                <span>{moreText}</span>
              </div>
            </NButton>
          </NDropdown>
        </NSpace>
      );
    };
  }
});

