import type { MessageApiInjection } from 'naive-ui/es/message/src/MessageProvider';
import type { FileOperationsOptions } from '../hooks/useFileOperations';
import type { FileItem } from '../types/file-explorer';
import type { IFileDataSource } from '../datasources/types';
import type { Ref } from 'vue';

/**
 * 创建文件操作配置
 *
 * @param message 消息提示实例
 * @param setLoading 设置加载状态的函数
 * @param dataSource 数据源（可选）
 * @param refreshFileList 刷新文件列表的函数（可选）
 * @returns 文件操作配置对象
 */
export function createOperationsConfig(
  message: MessageApiInjection,
  setLoading?: (loading: boolean, tip?: string) => void,
  dataSource?: Ref<IFileDataSource | null>,
  refreshFileList?: () => Promise<void>
): FileOperationsOptions {
  return {
    /** 复制文件回调 */
    onCopy: async (items: FileItem[]) => {
      setLoading?.(true, '复制中...');
      try {
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 500));
        message.success(`已复制 ${items.length} 个项目`);
      } finally {
        setLoading?.(false);
      }
    },

    /** 剪切文件回调 */
    onCut: async (items: FileItem[]) => {
      setLoading?.(true, '剪切中...');
      try {
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 500));
        message.info(`已剪切 ${items.length} 个项目`);
      } finally {
        setLoading?.(false);
      }
    },

    /** 粘贴文件回调 */
    onPaste: async (items: FileItem[], operation, targetPath?: string) => {
      const opText = operation === 'copy' ? '复制' : '移动';
      setLoading?.(true, `${opText}中...`);
      try {
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 800));
        message.success(`已${opText} ${items.length} 个项目${targetPath ? ` 到 ${targetPath}` : ''}`);
      } finally {
        setLoading?.(false);
      }
    },

    /** 删除文件回调 */
    onDelete: async (items: FileItem[]) => {
      setLoading?.(true, '删除中...');
      try {
        if (dataSource?.value) {
          // 使用数据源删除文件
          for (const item of items) {
            await dataSource.value.deleteFile(item.path);
          }
          message.success(`已删除 ${items.length} 个项目`);
          await refreshFileList?.();
        } else {
          // 模拟异步操作
          await new Promise(resolve => setTimeout(resolve, 600));
          message.warning(`已删除 ${items.length} 个项目`);
        }
      } catch (error: any) {
        message.error(`删除失败: ${error.message}`);
        throw error;
      } finally {
        setLoading?.(false);
      }
    },

    /** 重命名文件回调 */
    onRename: async (item: FileItem, newName: string) => {
      setLoading?.(true, '重命名中...');
      try {
        if (dataSource?.value) {
          // 使用数据源重命名文件
          await dataSource.value.renameFile(item.path, newName);
          message.success(`重命名: ${item.name} -> ${newName}`);
          await refreshFileList?.();
        } else {
          // 模拟异步操作
          await new Promise(resolve => setTimeout(resolve, 400));
          message.info(`重命名: ${item.name} -> ${newName}`);
        }
      } catch (error: any) {
        message.error(`重命名失败: ${error.message}`);
        throw error;
      } finally {
        setLoading?.(false);
      }
    },

    /** 新建文件夹回调 */
    onCreateFolder: async (name: string, parentPath?: string) => {
      setLoading?.(true, '创建文件夹中...');
      try {
        if (dataSource?.value) {
          // 使用数据源创建文件夹
          const path = parentPath || '/';
          await dataSource.value.createFolder(path, name);
          message.success(`已创建文件夹: ${name}`);
          await refreshFileList?.();
        } else {
          // 模拟异步操作
          await new Promise(resolve => setTimeout(resolve, 400));
          message.success(`已创建文件夹: ${name}`);
        }
      } catch (error: any) {
        message.error(`创建文件夹失败: ${error.message}`);
        throw error;
      } finally {
        setLoading?.(false);
      }
    },

    /** 刷新视图回调 */
    onRefresh: async () => {
      setLoading?.(true, '刷新中...');
      try {
        if (refreshFileList) {
          await refreshFileList();
          message.success('已刷新');
        } else {
          // 模拟异步操作
          await new Promise(resolve => setTimeout(resolve, 600));
          message.info('已刷新');
        }
      } catch (error: any) {
        message.error(`刷新失败: ${error.message}`);
      } finally {
        setLoading?.(false);
      }
    },

    /** 显示文件属性回调 */
    onShowProperties: (item: FileItem) => {
      message.info(`显示属性: ${item.name}`);
    }
  };
}
