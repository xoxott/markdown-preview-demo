/**
 * useDialog - 弹窗管理 Hook
 * 提供命令式API来显示各种对话框
 */

import { ref, createVNode, render, App, nextTick, watchEffect } from 'vue'
import { NConfigProvider } from 'naive-ui'
import RenameDialog from '../dialogs/RenameDialog'
import ConfirmDialog from '../dialogs/ConfirmDialog'
import {
  RenameDialogConfig,
  ConfirmDialogConfig,
  DialogInstance
} from '../types/dialog'

// 全局主题配置存储
let globalThemeConfig: {
  theme?: any;
  themeOverrides?: any;
} = {};

/**
 * 设置全局主题配置
 * 应在应用初始化时调用，通常在 main.ts 或 App.vue 中
 */
export function setDialogTheme(config: {
  theme?: any;
  themeOverrides?: any;
}) {
  globalThemeConfig = config;
}

/**
 * 创建弹窗实例
 */
async function createDialogInstance(component: any, config: any, app?: App): Promise<DialogInstance> {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const show = ref(false)
  let destroyed = false

  const destroyDom = () => {
    if (destroyed) return
    destroyed = true
    setTimeout(() => {
      render(null, container)
      container.remove()
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    }, 300)
  }

  const handleAfterLeave = () => {
    destroyDom()
  }

  const handleUpdateShow = (val: boolean) => {
    show.value = val
  }

  watchEffect(() => {
    const dialogVNode = createVNode(component, {
      show: show.value,
      config,
      'onUpdate:show': handleUpdateShow,
      onAfterLeave: handleAfterLeave,
      onClose: config?.onClose
    })

    const vnode = createVNode(
      NConfigProvider,
      {
        theme: globalThemeConfig?.theme,
        themeOverrides: globalThemeConfig?.themeOverrides
      },
      { default: () => dialogVNode }
    )

    if (app) vnode.appContext = app._context

    render(vnode, container)
  })

  const instance: DialogInstance = {
    show: () => (show.value = true),
    hide: () => (show.value = false),
    destroy: () => destroyDom()
  }

  await nextTick()
  instance.show()
  return instance
}

/**
 * useDialog Hook
 */
export function useDialog(app?: App) {
  /**
   * 显示重命名对话框
   */
  const rename = (config: RenameDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(RenameDialog, config, app)
  }

  /**
   * 显示确认对话框
   */
  const confirm = (config: ConfirmDialogConfig): Promise<DialogInstance> => {
    return createDialogInstance(ConfirmDialog, config, app)
  }

  /**
   * 显示信息对话框
   */
  const info = (content: string, title?: string): Promise<DialogInstance> => {
    return confirm({
      title: title || '信息',
      content,
      type: 'info',
      showCancel: false,
      onConfirm: () => { }
    })
  }

  /**
   * 显示成功对话框
   */
  const success = (content: string, title?: string): Promise<DialogInstance> => {
    return confirm({
      title: title || '成功',
      content,
      type: 'success',
      showCancel: false,
      onConfirm: () => { }
    })
  }

  /**
   * 显示警告对话框
   */
  const warning = (content: string, title?: string): Promise<DialogInstance> => {
    return confirm({
      title: title || '警告',
      content,
      type: 'warning',
      showCancel: false,
      onConfirm: () => { }
    })
  }

  /**
   * 显示错误对话框
   */
  const error = (content: string, title?: string): Promise<DialogInstance> => {
    return confirm({
      title: title || '错误',
      content,
      type: 'error',
      showCancel: false,
      onConfirm: () => { }
    })
  }

  /**
   * 显示删除确认对话框
   */
  const confirmDelete = (
    itemName: string,
    onConfirm: () => void | Promise<void>
  ): Promise<DialogInstance> => {
    return confirm({
      title: '确认删除',
      content: `确定要删除 "${itemName}" 吗?此操作无法撤销。`,
      type: 'warning',
      confirmText: '删除',
      onConfirm
    })
  }

  return {
    rename,
    confirm,
    info,
    success,
    warning,
    error,
    confirmDelete
  }
}

/**
 * 导出类型
 */
export type UseDialogReturn = ReturnType<typeof useDialog>
