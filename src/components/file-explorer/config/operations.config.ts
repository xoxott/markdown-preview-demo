import type { MessageApiInjection } from 'naive-ui/es/message/src/MessageProvider'
import { FileOperationsOptions } from '../hooks/useFileOperations'
import { FileItem } from '../types/file-explorer'

/**
 * 创建文件操作配置
 * @param message 消息提示实例
 * @returns 文件操作配置对象
 */
export function createOperationsConfig(message: MessageApiInjection): FileOperationsOptions {
  return {
    /**
     * 复制文件回调
     */
    onCopy: async (items: FileItem[]) => {
      message.success(`已复制 ${items.length} 个项目`)
    },

    /**
     * 剪切文件回调
     */
    onCut: async (items: FileItem[]) => {
      message.info(`已剪切 ${items.length} 个项目`)
    },

    /**
     * 粘贴文件回调
     */
    onPaste: async (items: FileItem[], operation, targetPath?: string) => {
      const opText = operation === 'copy' ? '复制' : '移动'
      message.success(`已${opText} ${items.length} 个项目${targetPath ? ` 到 ${targetPath}` : ''}`)
    },

    /**
     * 删除文件回调
     */
    onDelete: async (items: FileItem[]) => {
      message.warning(`已删除 ${items.length} 个项目`)
    },

    /**
     * 重命名文件回调
     */
    onRename: async (item: FileItem, newName: string) => {
      message.info(`重命名: ${item.name} -> ${newName}`)
    },

    /**
     * 新建文件夹回调
     */
    onCreateFolder: async (name: string, parentPath?: string) => {
      message.success(`已创建文件夹: ${name}`)
    },

    /**
     * 刷新视图回调
     */
    onRefresh: async () => {
      message.info('已刷新')
    },

    /**
     * 显示文件属性回调
     */
    onShowProperties: (item: FileItem) => {
      message.info(`显示属性: ${item.name}`)
    }
  }
}

