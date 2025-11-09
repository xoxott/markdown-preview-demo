/**
 * useDialog - 弹窗管理 Hook
 * 提供命令式API来显示各种对话框
 */

import { ref, createVNode, render, App } from 'vue'
import RenameDialog from '../dialogs/RenameDialog'
import ConfirmDialog from '../dialogs/ConfirmDialog'
import {
  RenameDialogConfig,
  ConfirmDialogConfig,
  DialogInstance
} from '../types/dialog'

/**
 * 创建弹窗实例
 */
function createDialogInstance(
  component: any,
  config: any,
  app?: App
): DialogInstance {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const show = ref(false)

  // 创建虚拟节点
  const vnode = createVNode(component, {
    show: show.value,
    config,
    'onUpdate:show': (value: boolean) => {
      show.value = value
      if (!value) {
        // 延迟销毁,等待动画完成
        setTimeout(() => {
          instance.destroy()
        }, 300)
      }
    }
  })

  // 如果有 app 实例,使用其上下文
  if (app) {
    vnode.appContext = app._context
  }

  // 渲染到容器
  render(vnode, container)

  const instance: DialogInstance = {
    show: () => {
      show.value = true
      // 更新 vnode 的 props
      if (vnode.component) {
        vnode.component.props.show = true
      }
    },
    hide: () => {
      show.value = false
      if (vnode.component) {
        vnode.component.props.show = false
      }
    },
    destroy: () => {
      render(null, container)
      document.body.removeChild(container)
    }
  }

  // 立即显示
  setTimeout(() => {
    instance.show()
  }, 0)

  return instance
}

/**
 * useDialog Hook
 */
export function useDialog(app?: App) {
  /**
   * 显示重命名对话框
   */
  const rename = (config: RenameDialogConfig): DialogInstance => {
    return createDialogInstance(RenameDialog, config, app)
  }

  /**
   * 显示确认对话框
   */
  const confirm = (config: ConfirmDialogConfig): DialogInstance => {
    return createDialogInstance(ConfirmDialog, config, app)
  }

  /**
   * 显示信息对话框
   */
  const info = (content: string, title?: string): DialogInstance => {
    return confirm({
      title: title || '信息',
      content,
      type: 'info',
      showCancel: false,
      onConfirm: () => {}
    })
  }

  /**
   * 显示成功对话框
   */
  const success = (content: string, title?: string): DialogInstance => {
    return confirm({
      title: title || '成功',
      content,
      type: 'success',
      showCancel: false,
      onConfirm: () => {}
    })
  }

  /**
   * 显示警告对话框
   */
  const warning = (content: string, title?: string): DialogInstance => {
    return confirm({
      title: title || '警告',
      content,
      type: 'warning',
      showCancel: false,
      onConfirm: () => {}
    })
  }

  /**
   * 显示错误对话框
   */
  const error = (content: string, title?: string): DialogInstance => {
    return confirm({
      title: title || '错误',
      content,
      type: 'error',
      showCancel: false,
      onConfirm: () => {}
    })
  }

  /**
   * 显示删除确认对话框
   */
  const confirmDelete = (
    itemName: string,
    onConfirm: () => void | Promise<void>
  ): DialogInstance => {
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

