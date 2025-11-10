import { useThemeStore } from '@/store/modules/theme';
import type { DrawerInstance, DrawerOptions } from '@/typings/drawer';
import {
  darkTheme,
  NButton,
  NDrawer,
  NDrawerContent,
  NScrollbar,
  NSpace
} from 'naive-ui';
import { storeToRefs } from 'pinia';
import type { VNode } from 'vue';
import { computed, createApp, defineComponent, h, nextTick, ref } from 'vue';

const DrawerContainer = defineComponent({
  name: 'DrawerContainer',
  props: {
    options: {
      type: Object as () => DrawerOptions,
      required: true
    }
  },
  setup(props, { expose }) {
    const visible = ref(false); // 初始设置为 false，等待 DOM 挂载后再显示
    const loading = ref(false);
    const disabled = ref(false);

    // 计算属性：是否显示底部按钮
    const showFooter = computed(() => props.options.showFooter);

    // 处理关闭
    const handleClose = () => {
      visible.value = false;
      // 不在这里调用 onClose，等待动画结束后在 onAfterLeave 中调用
    };

    // 处理确认
    const handleConfirm = async () => {
      if (!props.options.onConfirm) {
        handleClose();
        return;
      }

      loading.value = disabled.value = true;
      try {
        await props.options.onConfirm();
        handleClose();
      } catch (error) {
        console.error('Drawer confirm error:', error);
        // 确认失败时不关闭抽屉，继续显示
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

    // 显示抽屉（用于触发打开动画）
    const show = () => {
      visible.value = true;
    };

    // 暴露方法给父组件
    expose({
      show,
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
      let content: VNode | null = null;

      if (typeof options.content === 'string') {
        content = h('div', options.content);
      } else if (typeof options.content === 'function') {
        content = h(options.content);
      } else if (options.content) {
        content = h(options.content);
      }

      if (!content) return null;

      // 使用 NScrollbar 包裹内容
      return h(
        NScrollbar,
        {
          style: { maxHeight: '100%' },
          xScrollable: options.xScrollable ?? false
        },
        () => content
      );
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

      // 自定义按钮（在左侧）
      options.customButtons?.forEach((button, index) => {
        buttons.push(
          h(
            NButton,
            {
              key: `custom-${index}`,
              type: button.type || 'default',
              loading: button.loading,
              disabled: button.disabled || this.disabled,
              size: button.size || 'small',
              onClick: () => this.handleButtonClick(button)
            },
            () => button.text
          )
        );
      });

      // 取消按钮
      if (options.cancelButton !== false) {
        const cancelConfig = typeof options.cancelButton === 'object'
          ? options.cancelButton
          : { text: '取消' };

        buttons.push(
          h(
            NButton,
            {
              key: 'cancel',
              type: cancelConfig.type || 'default',
              loading: cancelConfig.loading,
              disabled: cancelConfig.disabled || this.disabled,
              size: cancelConfig.size || 'small',
              onClick: this.handleCancel
            },
            () => cancelConfig.text
          )
        );
      }

      // 确认按钮
      if (options.confirmButton !== false) {
        const confirmConfig = typeof options.confirmButton === 'object'
          ? options.confirmButton
          : { text: '确定' };

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

    const renderDrawer = (): VNode => {
      const titleContent = renderTitle();
      const isStringTitle = typeof titleContent === 'string';

      return h(
        NDrawer,
        {
          show: this.visible,
          width: options.width || 400,
          height: options.height,
          placement: options.placement || 'right',
          maskClosable: options.maskClosable ?? true,
          closeOnEsc: options.closeOnEsc ?? true,
          autoFocus: options.autoFocus ?? true,
          showMask: options.showMask ?? true,
          trapFocus: options.trapFocus ?? true,
          resizable: options.resizable ?? false,
          onUpdateShow: (show: boolean) => {
            if (!show) {
              this.handleClose();
            }
          },
          onAfterEnter: options.onAfterEnter,
          onAfterLeave: () => {
            // 动画结束后调用 onClose 和 onAfterLeave
            options.onClose?.();
            options.onAfterLeave?.();
          },
          onMaskClick: options.onMaskClick
        },
        () =>
          h(
            NDrawerContent,
            {
              closable: options.closable ?? true,
              title: isStringTitle ? (titleContent as string) : undefined,
              bodyStyle: options.bodyStyle,
              headerStyle: options.headerStyle,
              footerStyle: options.footerStyle
            },
            {
              default: renderContent,
              footer: this.showFooter ? renderFooter : undefined,
              // 如果标题不是字符串，使用 header 插槽
              header: !isStringTitle && titleContent ? () => titleContent : undefined
            }
          )
      );
    };

   return renderDrawer();
  }
});


// 抽屉管理器（单例模式）
class DrawerManager {
  private instances: Set<DrawerInstance> = new Set();

  // 创建抽屉实例
  async createDrawer(options: DrawerOptions): Promise<DrawerInstance> {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const themeStore = useThemeStore()
    const { naiveTheme, darkMode } = storeToRefs(themeStore)
    const app = createApp(DrawerContainer, {
      options,
      theme: darkMode.value ? darkTheme : naiveTheme.value.Drawer,
      themeOverrides: naiveTheme.value
    });
    const instance = app.mount(container) as any;

    const drawerInstance: DrawerInstance = {
      close: () => {
        instance.handleClose();
      },

      destroy: () => {
        this.instances.delete(drawerInstance);
        // 等待关闭动画完成后再销毁
        setTimeout(() => {
          try {
            app.unmount();
            if (document.body.contains(container)) {
              document.body.removeChild(container);
            }
          } catch (error) {
            console.error('Error destroying drawer:', error);
          }
        }, 300);
      },

      updateOptions: (newOptions: Partial<DrawerOptions>) => {
        Object.assign(options, newOptions);
      }
    };

    // 重写 onClose，在关闭时自动销毁实例
    const originalOnClose = options.onClose;
    options.onClose = () => {
      originalOnClose?.();
      // 延迟销毁，确保动画完成
      setTimeout(() => {
        drawerInstance.destroy();
      }, 300);
    };

    this.instances.add(drawerInstance);

    // 等待 DOM 挂载后再显示，触发打开动画
    await nextTick();
    instance.show();

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

  // 获取当前打开的抽屉数量
  get count() {
    return this.instances.size;
  }
}

// 全局抽屉管理器实例
const drawerManager = new DrawerManager();

// 导出创建抽屉的函数
export function createDrawer(options: DrawerOptions): Promise<DrawerInstance> {
  return drawerManager.createDrawer(options);
}

// 导出管理器方法
export const closeAllDrawers = () => drawerManager.closeAll();
export const destroyAllDrawers = () => drawerManager.destroyAll();
export const getDrawerCount = () => drawerManager.count;

// 便捷方法
export const useDrawer = () => {
  const open = (options: DrawerOptions) => {
    return createDrawer(options);
  };

  const confirm = (options: Omit<DrawerOptions, 'showFooter'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: options.cancelButton ?? { text: '取消', type: 'default' },
      confirmButton: options.confirmButton ?? { text: '确定', type: 'primary' }
    });
  };

  const info = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: false,
      confirmButton: { text: '知道了', type: 'info' }
    });
  };

  const success = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: false,
      confirmButton: { text: '确定', type: 'success' }
    });
  };

  const warning = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: false,
      confirmButton: { text: '确定', type: 'warning' }
    });
  };

  const error = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: false,
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
    destroyAll: destroyAllDrawers,
    getCount: getDrawerCount
  };
};
