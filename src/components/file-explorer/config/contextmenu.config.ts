import type { Ref } from 'vue';
import type { MessageApiInjection } from 'naive-ui/es/message/src/MessageProvider';
import type { FileItem, SortField } from '../types/file-explorer';

/** 右键菜单处理器依赖项 */
export interface ContextMenuHandlerDeps {
  /** 文件操作方法集合 */
  fileOperations: {
    copyFiles: () => Promise<void>;
    cutFiles: () => Promise<void>;
    pasteFiles: (targetPath?: string) => Promise<void>;
    deleteFiles: () => Promise<void>;
    startRename: () => void;
    createFolder: () => Promise<void>;
    refresh: () => Promise<void>;
    showProperties: () => void;
  };
  /** 消息提示实例 */
  message: MessageApiInjection;
  /** 当前选中的文件列表 */
  selectedFiles: Ref<FileItem[]>;
  /** 打开文件的回调 */
  onOpen?: (file: FileItem) => void;
  /** 排序的回调 */
  onSort?: (field: SortField) => void;
  /** 切换信息面板的回调 */
  onToggleInfoPanel?: () => void;
}

/**
 * 创建右键菜单事件处理器
 *
 * 将右键菜单的 key 映射到对应的文件操作,实现统一管理
 *
 * @param deps 依赖项
 * @returns 统一的右键菜单处理函数
 */
export function createContextMenuHandler(deps: ContextMenuHandlerDeps) {
  const { fileOperations, message, selectedFiles, onOpen, onSort, onToggleInfoPanel } = deps;

  // 事件处理映射表
  const handlers: Record<string, () => void | Promise<void>> = {
    // ==================== 文件操作 ====================
    copy: () => fileOperations.copyFiles(),
    cut: () => fileOperations.cutFiles(),
    paste: () => fileOperations.pasteFiles(),
    delete: () => fileOperations.deleteFiles(),
    rename: () => fileOperations.startRename(),
    refresh: () => fileOperations.refresh(),
    properties: () => fileOperations.showProperties(),
    'new-folder': () => fileOperations.createFolder(),
    // ==================== 信息面板 ====================
    info: () => {
      if (onToggleInfoPanel) {
        onToggleInfoPanel();
      } else {
        message.info('信息面板功能未启用');
      }
    },

    // ==================== 打开操作 ====================
    open: () => {
      if (selectedFiles.value.length === 1) {
        onOpen?.(selectedFiles.value[0]);
      } else if (selectedFiles.value.length === 0) {
        message.warning('请先选择一个文件');
      } else {
        message.warning('只能打开一个文件');
      }
    },

    // 打开方式子菜单
    'open-default': () => {
      if (selectedFiles.value.length === 1) {
        message.info(`使用默认程序打开: ${selectedFiles.value[0].name}`);
      }
    },
    'open-text': () => {
      if (selectedFiles.value.length === 1) {
        message.info(`使用文本编辑器打开: ${selectedFiles.value[0].name}`);
      }
    },
    'open-code': () => {
      if (selectedFiles.value.length === 1) {
        message.info(`使用代码编辑器打开: ${selectedFiles.value[0].name}`);
      }
    },

    // ==================== 排序操作 ====================
    'sort-name': () => onSort?.('name'),
    'sort-size': () => onSort?.('size'),
    'sort-modified': () => onSort?.('modifiedAt'),
    'sort-created': () => onSort?.('createdAt'),

    // ==================== 其他操作 ====================
    download: () => {
      const count = selectedFiles.value.length;
      if (count > 0) {
        message.info(`下载 ${count} 个项目 (功能开发中)`);
      } else {
        message.warning('请先选择要下载的文件');
      }
    },
    share: () => {
      const count = selectedFiles.value.length;
      if (count > 0) {
        message.info(`分享 ${count} 个项目 (功能开发中)`);
      } else {
        message.warning('请先选择要分享的文件');
      }
    },
    favorite: () => {
      if (selectedFiles.value.length === 1) {
        message.info(`收藏: ${selectedFiles.value[0].name} (功能开发中)`);
      } else {
        message.warning('请先选择一个文件');
      }
    }
  };

  /**
   * 统一的右键菜单处理函数
   *
   * @param key 菜单项的 key
   */
  return (key: string) => {
    const handler = handlers[key];
    if (handler) {
      // 执行处理函数
      const result = handler();
      // 如果返回 Promise,处理错误
      if (result instanceof Promise) {
        result.catch(error => {
          console.error(`执行右键菜单操作 "${key}" 时出错:`, error);
          message.error(`操作失败: ${error.message || '未知错误'}`);
        });
      }
    } else {
      console.warn(`未找到右键菜单项 "${key}" 的处理函数`);
    }
  };
}
