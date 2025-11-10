import { type Ref, createVNode, getCurrentInstance, nextTick, readonly, ref, render, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { NConfigProvider, darkTheme } from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';
import type { DrawerInstance, DrawerOptions } from '@/typings/drawer';
import { DrawerContainer } from './DrawerContainer';

/** 抽屉管理器（单例模式） 支持嵌套抽屉和多实例管理 */
class DrawerManager {
  private instances: Map<symbol, DrawerInstance> = new Map();
  private instanceStack: symbol[] = []; // 用于管理嵌套层级

  /** 创建抽屉实例 */
  async createDrawer(options: DrawerOptions): Promise<DrawerInstance> {
    const container = document.createElement('div');
    document.body.appendChild(container);

    // 获取主题配置
    const themeStore = useThemeStore();
    const { naiveTheme, darkMode } = storeToRefs(themeStore);

    // 获取父组件上下文
    const parent = getCurrentInstance();

    // 创建响应式状态
    const visible = ref(false);
    const loading = ref(false);
    const disabled = ref(false);
    let destroyed = false;

    const instanceId = Symbol('drawer-instance');

    // 销毁逻辑
    const destroyDom = () => {
      if (destroyed) return;
      destroyed = true;

      this.instances.delete(instanceId);
      this.instanceStack = this.instanceStack.filter(id => id !== instanceId);

      setTimeout(() => {
        render(null, container);
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }, 300);
    };

    // 用于存储暴露的方法引用
    let exposedMethods: any = null;

    // 使用 watchEffect 实现响应式渲染
    watchEffect(() => {
      const drawerVNode = createVNode(DrawerContainer, {
        options,
        visible: visible.value,
        loading: loading.value,
        disabled: disabled.value,
        'onUpdate:visible': (val: boolean) => {
          visible.value = val;
        },
        'onUpdate:loading': (val: boolean) => {
          loading.value = val;
        },
        'onUpdate:disabled': (val: boolean) => {
          disabled.value = val;
        },
        ref: (el: any) => {
          if (el) {
            exposedMethods = el;
          }
        }
      });

      // 包裹主题配置
      const vnode = createVNode(
        NConfigProvider,
        {
          theme: darkMode.value ? darkTheme : null,
          themeOverrides: naiveTheme.value
        },
        { default: () => drawerVNode }
      );

      // 继承上下文
      if (parent) {
        vnode.appContext = parent.appContext;
      }

      render(vnode, container);
    });

    // 创建增强的抽屉实例
    const drawerInstance: DrawerInstance = {
      // 基础方法
      close: () => {
        visible.value = false;
      },

      destroy: destroyDom,

      updateOptions: (newOptions: Partial<DrawerOptions>) => {
        Object.assign(options, newOptions);
      },

      // 响应式状态（只读）
      state: {
        visible: readonly(visible) as Ref<boolean>,
        loading: readonly(loading) as Ref<boolean>,
        disabled: readonly(disabled) as Ref<boolean>
      },

      // 手动控制方法
      setLoading: (val: boolean) => {
        loading.value = val;
      },

      setDisabled: (val: boolean) => {
        disabled.value = val;
      },

      // 确认和取消方法
      confirm: async () => {
        if (exposedMethods?.handleConfirm) {
          await exposedMethods.handleConfirm();
        }
      },

      cancel: async () => {
        if (exposedMethods?.handleCancel) {
          await exposedMethods.handleCancel();
        }
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

    // 添加到管理器
    this.instances.set(instanceId, drawerInstance);
    this.instanceStack.push(instanceId);

    // 等待 DOM 挂载后再显示，触发打开动画
    await nextTick();
    visible.value = true;

    return drawerInstance;
  }

  /** 关闭所有抽屉 */
  closeAll() {
    this.instances.forEach(instance => instance.close());
  }

  /** 销毁所有抽屉 */
  destroyAll() {
    this.instances.forEach(instance => instance.destroy());
    this.instances.clear();
    this.instanceStack = [];
  }

  /** 关闭最顶层的抽屉（用于嵌套场景） */
  closeTop() {
    const topId = this.instanceStack[this.instanceStack.length - 1];
    if (topId) {
      const instance = this.instances.get(topId);
      instance?.close();
    }
  }

  /** 获取当前打开的抽屉数量 */
  get count() {
    return this.instances.size;
  }

  /** 获取所有抽屉实例 */
  getInstances() {
    return Array.from(this.instances.values());
  }

  /** 获取最顶层的抽屉实例 */
  getTopInstance() {
    const topId = this.instanceStack[this.instanceStack.length - 1];
    return topId ? this.instances.get(topId) : undefined;
  }
}

// 全局抽屉管理器实例
const drawerManager = new DrawerManager();

/** 创建抽屉 */
export function createDrawer(options: DrawerOptions): Promise<DrawerInstance> {
  return drawerManager.createDrawer(options);
}

/** 导出管理器方法 */
export const closeAllDrawers = () => drawerManager.closeAll();
export const destroyAllDrawers = () => drawerManager.destroyAll();
export const closeTopDrawer = () => drawerManager.closeTop();
export const getDrawerCount = () => drawerManager.count;
export const getDrawerInstances = () => drawerManager.getInstances();
export const getTopDrawerInstance = () => drawerManager.getTopInstance();

/** useDrawer Hook 提供便捷的抽屉操作方法 */
export const useDrawer = () => {
  /** 打开普通抽屉 */
  const open = (options: DrawerOptions) => {
    return createDrawer(options);
  };

  /** 打开确认抽屉（带确认和取消按钮） */
  const confirm = (options: Omit<DrawerOptions, 'showFooter'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: options.cancelButton ?? { text: '取消', type: 'default' },
      confirmButton: options.confirmButton ?? { text: '确定', type: 'primary' }
    });
  };

  /** 打开信息抽屉（仅确认按钮） */
  const info = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: false,
      confirmButton: { text: '知道了', type: 'info' }
    });
  };

  /** 打开成功抽屉 */
  const success = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: false,
      confirmButton: { text: '确定', type: 'success' }
    });
  };

  /** 打开警告抽屉 */
  const warning = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: false,
      confirmButton: { text: '确定', type: 'warning' }
    });
  };

  /** 打开错误抽屉 */
  const error = (options: Omit<DrawerOptions, 'showFooter' | 'confirmButton'>) => {
    return createDrawer({
      ...options,
      showFooter: true,
      cancelButton: false,
      confirmButton: { text: '确定', type: 'error' }
    });
  };

  return {
    // 创建方法
    open,
    confirm,
    info,
    success,
    warning,
    error,

    // 管理方法
    closeAll: closeAllDrawers,
    destroyAll: destroyAllDrawers,
    closeTop: closeTopDrawer,
    getCount: getDrawerCount,
    getInstances: getDrawerInstances,
    getTopInstance: getTopDrawerInstance
  };
};
