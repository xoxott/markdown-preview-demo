/* eslint-disable no-multi-assign */
import type { VNode } from 'vue';
import { computed, createApp, defineComponent, h, nextTick, ref } from 'vue';
import {
  NButton,
  NConfigProvider,
  NDialogProvider,
  NDrawer,
  NDrawerContent,
  NMessageProvider,
  NNotificationProvider,
  NSpace
} from 'naive-ui';
import MarkdownIt from 'markdown-it';
import type { DrawerInstance, DrawerOptions } from '@/typings/drawer';
import { useModalProvider } from './useModalProvider';
const { theme, themeOverrides, locale, dateLocale } = useModalProvider();

const md = MarkdownIt({
  html: true, // 允许HTML标签（注意：这可能会带来XSS风险，请确保内容安全）
  linkify: true, // 自动将URL转换为链接
  typographer: true // 启用一些语言相关的替换和文本格式
});
const DrawerContainer = defineComponent({
  name: 'DrawerContainer',
  props: {
    options: {
      type: Object as () => DrawerOptions,
      required: true
    }
  },
  setup(props, { expose }) {
    const visible = ref(true);
    const loading = ref(false);
    const disabled = ref(false);

    // 计算属性：是否显示底部按钮
    const showFooter = computed(() => props.options.showFooter);

    // 处理关闭
    const handleClose = () => {
      visible.value = false;
      props.options.onClose?.();
    };

    // 处理确认
    const handleConfirm = async () => {
      if (!props.options.onConfirm) return;
      loading.value = disabled.value = true;
      try {
        await props.options.onConfirm();
        handleClose();
      } catch (error) {
        console.error('Drawer confirm error:', error);
        // 可以在这里添加错误提示
      } finally {
        loading.value = disabled.value = false;
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
    const handleButtonClick = async (button: any) => {
      if (!button.onClick) return;
      try {
        await button.onClick();
      } catch (error) {
        console.error('Drawer button click error:', error);
      }
    };

    // 暴露方法给父组件
    expose({
      handleClose,
      handleConfirm,
      handleCancel,
      handleButtonClick
    });

    return {
      visible,
      disabled,
      loading,
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
      if (typeof options.content === 'string') {
        return h('div', { innerHTML: md.render(options.content) });
      }
      if (options.content) {
        return h(options.content);
      }
      return null;
    };

    // 渲染标题 - 支持字符串、VNode、JSX和函数
    const renderTitle = (): VNode | string | null => {
      if (typeof options.title === 'string') {
        return options.title;
      }
      if (typeof options.title === 'function') {
        return h(options.title);
      }
      if (options.title) {
        return h(options.title);
      }
      return null;
    };

    // 渲染底部按钮
    const renderFooter = (): VNode | null => {
      if (!this.showFooter) return null;

      const buttons: VNode[] = [];

      // 自定义按钮
      options.customButtons?.forEach((button, index) => {
        buttons.push(
          h(
            NButton,
            {
              key: `custom-${index}`,
              type: button.type || 'default',
              loading: button.loading,
              disabled: button.disabled,
              size: button.size || 'small',
              onClick: () => this.handleButtonClick(button)
            },
            () => button.text
          )
        );
      });
      // 取消按钮
      if (options.cancelButton) {
        const cancelConfig = options.cancelButton || { text: '取消' };
        buttons.push(
          h(
            NButton,
            {
              key: 'cancel',
              type: cancelConfig.type || 'default',
              loading: cancelConfig.loading,
              disabled: cancelConfig.disabled,
              size: cancelConfig.size || 'small',
              onClick: this.handleCancel
            },
            () => cancelConfig.text
          )
        );
      }
      // 确认按钮
      if (options.confirmButton) {
        const confirmConfig = options.confirmButton || { text: '确定' };
        buttons.push(
          h(
            NButton,
            {
              key: 'confirm',
              type: confirmConfig.type || 'primary',
              loading: confirmConfig.loading || this.loading,
              disabled: confirmConfig.disabled || this.disabled,
              onClick: this.handleConfirm,
              size: confirmConfig.size || 'small'
            },
            () => confirmConfig.text
          )
        );
      }

      return h(NSpace, { justify: 'end' }, () => buttons);
    };
    const renderDrawer = (): VNode =>
      h(
        NDrawer,
        {
          show: this.visible,
          height: options.height,
          placement: options.placement || 'right',
          maskClosable: options.maskClosable ?? true,
          closeOnEsc: options.closeOnEsc ?? true,
          autoFocus: options.autoFocus ?? true,
          defaultWidth: options.width || 400,
          showMask: options.showMask ?? true,
          trapFocus: options.trapFocus ?? true,
          resizable: options.resizable ?? true,
          onUpdateShow: (show: boolean) => {
            if (!show) {
              this.handleClose();
            }
          },
          onAfterEnter: options.onAfterEnter,
          onAfterLeave: options.onAfterLeave,
          onMaskClick: options.onMaskClick
        },
        () =>
          h(
            NDrawerContent,
            {
              closable: options.closable ?? true,
              bodyStyle: options.bodyStyle,
              headerStyle: options.headerStyle,
              footerStyle: options.footerStyle
            },
            {
              default: renderContent,
              footer: renderFooter,
              header: renderTitle() ? renderTitle : undefined
            }
          )
      );

    const renderWithProviders = (): VNode =>
      h(
        NConfigProvider,
        {
          theme: theme.value,
          themeOverrides: themeOverrides.value,
          locale: locale.value,
          dateLocale: dateLocale.value
        },
        {
          default: () =>
            h(
              NMessageProvider,
              {},
              {
                default: () =>
                  h(
                    NDialogProvider,
                    {},
                    {
                      default: () =>
                        h(
                          NNotificationProvider,
                          {},
                          {
                            default: renderDrawer
                          }
                        )
                    }
                  )
              }
            )
        }
      );

    return renderWithProviders();
  }
});

// 抽屉管理器（单例模式）
class DrawerManager {
  private instances: Set<DrawerInstance> = new Set();

  // 创建抽屉实例
  createDrawer(options: DrawerOptions): DrawerInstance {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp(DrawerContainer, { options });
    const instance = app.mount(container) as any;
    const drawerInstance: DrawerInstance = {
      close: () => {
        instance.handleClose();
      },

      destroy: () => {
        this.instances.delete(drawerInstance);
        setTimeout(() => {
          try {
            app.unmount();
            if (document.body.contains(container)) {
              document.body.removeChild(container);
            }
          } catch (error) {
            console.error('Error destroying drawer:', error);
          }
        }, 300); // 等待动画完成
      },

      updateOptions: (newOptions: Partial<DrawerOptions>) => {
        Object.assign(options, newOptions);
      }
    };

    // 监听关闭事件，自动销毁
    const originalOnClose = options.onClose;
    options.onClose = () => {
      originalOnClose?.();
      drawerInstance.destroy();
    };

    this.instances.add(drawerInstance);
    return drawerInstance;
  }

  // 关闭所有抽屉
  closeAll() {
    this.instances.forEach(instance => instance.close());
  }

  // 销毁所有抽屉
  destroyAll() {
    this.instances.forEach(instance => instance.destroy());
    this.instances.clear();
  }
}

// 全局抽屉管理器实例
const drawerManager = new DrawerManager();

// 导出创建抽屉的函数
export function createDrawer(options: DrawerOptions): DrawerInstance {
  return drawerManager.createDrawer(options);
}

// 导出管理器方法
export const closeAllDrawers = () => drawerManager.closeAll();
export const destroyAllDrawers = () => drawerManager.destroyAll();

// 便捷方法
export const useDrawer = () => {
  const open = (options: DrawerOptions) => {
    return createDrawer(options);
  };

  const confirm = (options: Omit<DrawerOptions, 'showFooter'>) => {
    return createDrawer({
      cancelButton: { text: '取消', type: 'default' },
      confirmButton: { text: '确定', type: 'info' },
      ...options,
      showFooter: true
    });
  };

  const info = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      confirmButton: { text: '知道了', type: 'info' }
    });
  };

  const success = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      confirmButton: { text: '确定', type: 'success' }
    });
  };

  const warning = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      confirmButton: { text: '确定', type: 'warning' }
    });
  };

  const error = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      confirmButton: { text: '确定', type: 'error' }
    });
  };

  return {
    open,
    confirm,
    info,
    success,
    warning,
    error,
    closeAll: closeAllDrawers,
    destroyAll: destroyAllDrawers
  };
};
