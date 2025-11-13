import { type PropType, type VNode, computed, defineComponent } from 'vue';
import { NButton, NDrawer, NDrawerContent, NScrollbar, NSpace } from 'naive-ui';
import type { DrawerButtonConfig, DrawerOptions } from '@/typings/drawer';

export const DrawerContainer = defineComponent({
  name: 'DrawerContainer',
  props: {
    options: {
      type: Object as PropType<DrawerOptions>,
      required: true
    },
    visible: {
      type: Boolean,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:visible', 'update:loading', 'update:disabled'],
  setup(props, { emit, expose }) {
    // 计算属性
    const showFooter = computed(() => props.options.showFooter);

    // 处理关闭
    const handleClose = () => {
      emit('update:visible', false);
    };

    // 处理确认
    const handleConfirm = async () => {
      if (!props.options.onConfirm) {
        handleClose();
        return;
      }

      emit('update:loading', true);
      emit('update:disabled', true);
      try {
        await props.options.onConfirm();
        handleClose();
      } catch (error) {
        console.error('Drawer confirm error:', error);
      } finally {
        emit('update:loading', false);
        emit('update:disabled', false);
      }
    };

    // 处理取消
    const handleCancel = async () => {
      if (props.options.onCancel) {
        try {
          await props.options.onCancel();
        } catch (error) {
          console.error('Drawer cancel error:', error);
        }
      }
      handleClose();
    };

    // 处理自定义按钮点击
    const handleButtonClick = async (button: DrawerButtonConfig) => {
      if (!button.onClick) return;

      const shouldClose = button.closeOnClick ?? false;

      try {
        await button.onClick();
        if (shouldClose) {
          handleClose();
        }
      } catch (error) {
        console.error('Drawer button click error:', error);
      }
    };

    // 暴露方法
    expose({
      handleClose,
      handleConfirm,
      handleCancel,
      handleButtonClick
    });

    return {
      showFooter,
      handleClose,
      handleConfirm,
      handleCancel,
      handleButtonClick
    };
  },
  render() {
    const { options } = this.$props;

    // 渲染内容
    const renderContent = (): VNode | null => {
      let content: VNode | null = null;

      if (typeof options.content === 'string') {
        content = <div>{options.content}</div>;
      } else if (typeof options.content === 'function') {
        const ContentComponent = options.content;
        content = <ContentComponent />;
      } else if (options.content) {
        const ContentComponent = options.content as any;
        content = <ContentComponent />;
      }

      if (!content) return null;

      return (
        <NScrollbar style={{ maxHeight: '100%' }} xScrollable={options.xScrollable ?? false}>
          {content}
        </NScrollbar>
      );
    };

    // 渲染标题
    const renderTitle = (): VNode | string | null => {
      if (typeof options.title === 'string') {
        return options.title;
      }
      if (typeof options.title === 'function') {
        const TitleComponent = options.title;
        return <TitleComponent />;
      }
      if (options.title) {
        const TitleComponent = options.title as any;
        return <TitleComponent />;
      }
      return null;
    };

    // 渲染底部按钮
    const renderFooter = (): VNode | null => {
      if (!this.showFooter) return null;

      const buttons: VNode[] = [];

      // 自定义按钮（在左侧）
      options.customButtons?.forEach((button, index) => {
        buttons.push(
          <NButton
            key={`custom-${index}`}
            type={button.type || 'default'}
            loading={button.loading}
            disabled={button.disabled || this.$props.disabled}
            size={button.size || 'small'}
            onClick={() => this.handleButtonClick(button)}
          >
            {button.text}
          </NButton>
        );
      });

      // 取消按钮
      if (options.cancelButton !== false) {
        const cancelConfig = typeof options.cancelButton === 'object' ? options.cancelButton : { text: '取消' };

        buttons.push(
          <NButton
            key="cancel"
            type={cancelConfig.type || 'default'}
            loading={cancelConfig.loading}
            disabled={cancelConfig.disabled || this.$props.disabled}
            size={cancelConfig.size || 'small'}
            onClick={this.handleCancel}
          >
            {cancelConfig.text}
          </NButton>
        );
      }

      // 确认按钮
      if (options.confirmButton !== false) {
        const confirmConfig = typeof options.confirmButton === 'object' ? options.confirmButton : { text: '确定' };

        buttons.push(
          <NButton
            key="confirm"
            type={confirmConfig.type || 'primary'}
            loading={confirmConfig.loading || this.$props.loading}
            disabled={confirmConfig.disabled || this.$props.disabled}
            onClick={this.handleConfirm}
            size={confirmConfig.size || 'small'}
          >
            {confirmConfig.text}
          </NButton>
        );
      }

      return <NSpace justify="end">{buttons}</NSpace>;
    };

    const titleContent = renderTitle();
    const isStringTitle = typeof titleContent === 'string';

    return (
      <NDrawer
        show={this.$props.visible}
        width={options.width || 400}
        height={options.height}
        placement={options.placement || 'right'}
        maskClosable={options.maskClosable ?? true}
        closeOnEsc={options.closeOnEsc ?? true}
        autoFocus={options.autoFocus ?? true}
        showMask={options.showMask ?? true}
        trapFocus={options.trapFocus ?? true}
        resizable={options.resizable ?? false}
        onUpdateShow={(show: boolean) => {
          if (!show) {
            this.handleClose();
          }
        }}
        onAfterEnter={options.onAfterEnter}
        onAfterLeave={() => {
          options.onClose?.();
          options.onAfterLeave?.();
        }}
        onMaskClick={options.onMaskClick}
      >
        <NDrawerContent
          closable={options.closable ?? true}
          title={isStringTitle ? (titleContent as string) : undefined}
          bodyStyle={options.bodyStyle}
          headerStyle={options.headerStyle}
          footerStyle={options.footerStyle}
          v-slots={{
            default: renderContent,
            footer: this.showFooter ? renderFooter : undefined,
            header: !isStringTitle && titleContent ? () => titleContent : undefined
          }}
        />
      </NDrawer>
    );
  }
});
