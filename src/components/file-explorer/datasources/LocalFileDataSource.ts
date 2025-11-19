import type { FileItem } from '../types/file-explorer';
import type { IFileDataSource, LocalFileDataSourceConfig, PaginationParams, PaginationResult } from './types';

/** 本地文件数据源实现（使用 File System Access API） */
export class LocalFileDataSource implements IFileDataSource {
  readonly type = 'local' as const;
  rootPath: string = '/';
  private rootHandle: FileSystemDirectoryHandle | null = null;

  constructor(config?: LocalFileDataSourceConfig) {
    if (config?.rootHandle) {
      this.rootHandle = config.rootHandle;
      this.rootPath = config.rootHandle.name;
    }
  }

  /** 打开文件夹选择器 */
  async openFolder(): Promise<FileSystemDirectoryHandle | null> {
    if (!('showDirectoryPicker' in window) || !window.showDirectoryPicker) {
      throw new Error('File System Access API 不支持，请使用 Chrome/Edge 浏览器');
    }

    try {
      const handle = await window.showDirectoryPicker();
      this.rootHandle = handle;
      this.rootPath = handle.name;
      return handle;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null; // 用户取消
      }
      throw error;
    }
  }

  /** 设置根目录句柄 */
  setRootHandle(handle: FileSystemDirectoryHandle) {
    this.rootHandle = handle;
    this.rootPath = handle.name;
  }

  /** 检查是否已选择文件夹 */
  hasRootHandle(): boolean {
    return this.rootHandle !== null;
  }

  /** 获取文件句柄 */
  private async getFileHandle(path: string): Promise<FileSystemFileHandle> {
    if (!this.rootHandle) {
      throw new Error('未选择文件夹，请先调用 openFolder()');
    }

    const parts = this.normalizePath(path).split('/').filter(Boolean);
    let currentHandle: FileSystemDirectoryHandle = this.rootHandle;

    // 遍历路径获取文件句柄
    for (let i = 0; i < parts.length - 1; i++) {
      currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
    }

    return await currentHandle.getFileHandle(parts[parts.length - 1]);
  }

  /** 获取目录句柄 */
  private async getDirectoryHandle(path: string): Promise<FileSystemDirectoryHandle> {
    if (!this.rootHandle) {
      throw new Error('未选择文件夹，请先调用 openFolder()');
    }

    const parts = this.normalizePath(path).split('/').filter(Boolean);
    let currentHandle: FileSystemDirectoryHandle = this.rootHandle;

    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }

    return currentHandle;
  }

  /** 规范化路径 */
  private normalizePath(path: string): string {
    return path.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  /** 构建完整路径 */
  private buildFullPath(relativePath: string): string {
    if (relativePath.startsWith('/')) {
      return relativePath;
    }
    return `/${this.rootPath}/${relativePath}`;
  }

  /** 将 FileSystemHandle 转换为 FileItem */
  private handleToFileItem(
    handle: FileSystemFileHandle | FileSystemDirectoryHandle,
    parentPath: string = ''
  ): FileItem {
    // 构建相对于根目录的路径
    // parentPath 是相对于根目录的路径（不包含根目录名称）
    const relativePath = parentPath ? `${parentPath}/${handle.name}` : handle.name;
    // 完整路径以 / 开头
    const fullPath = `/${relativePath}`;
    return {
      id: fullPath,
      name: handle.name,
      type: handle.kind === 'file' ? 'file' : 'folder',
      path: fullPath,
      extension: handle.kind === 'file' ? this.getExtension(handle.name) : undefined
    };
  }

  /** 获取文件扩展名 */
  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  async listFiles(path: string = '/'): Promise<FileItem[]> {
    // 如果没有选择文件夹，返回空数组（而不是抛出错误）
    // 这样可以在切换模式时更友好地处理
    if (!this.rootHandle) {
      return [];
    }

    const normalizedPath = this.normalizePath(path);
    let dirHandle: FileSystemDirectoryHandle;

    if (normalizedPath === '') {
      dirHandle = this.rootHandle;
    } else {
      dirHandle = await this.getDirectoryHandle(normalizedPath);
    }

    const items: FileItem[] = [];
    // parentPath 用于构建子项的完整路径
    // 如果是根目录，parentPath 为空字符串（相对于根目录）
    // 否则使用规范化后的路径
    const parentPath = normalizedPath === '' ? '' : normalizedPath;

    for await (const handle of dirHandle.values()) {
      const fileItem = this.handleToFileItem(handle as FileSystemDirectoryHandle | FileSystemFileHandle, parentPath);

      // 获取文件大小和修改时间
      if (handle.kind === 'file') {
        try {
          const file = await (handle as FileSystemFileHandle).getFile();
          fileItem.size = file.size;
          fileItem.modifiedAt = new Date(file.lastModified);
          fileItem.createdAt = new Date(file.lastModified);
        } catch (error) {
          console.warn('无法获取文件信息:', handle.name, error);
        }
      }

      items.push(fileItem);
    }

    return items;
  }

  async listFilesWithPagination(params: PaginationParams): Promise<PaginationResult> {
    // 先获取所有文件
    const allFiles = await this.listFiles(params.path);
    const total = allFiles.length;
    const { page, pageSize } = params;

    // 计算分页范围
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // 切片获取当前页的文件
    const items = allFiles.slice(startIndex, endIndex);

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async readFile(path: string): Promise<string | Blob> {
    const fileHandle = await this.getFileHandle(path);
    const file = await fileHandle.getFile();

    // 根据文件类型返回文本或 Blob
    const extension = this.getExtension(file.name);
    const textExtensions = ['txt', 'md', 'js', 'ts', 'json', 'html', 'css', 'vue', 'tsx', 'jsx', 'xml', 'yaml', 'yml'];

    if (textExtensions.includes(extension.toLowerCase())) {
      return await file.text();
    }

    return file;
  }

  async writeFile(path: string, content: string | Blob): Promise<void> {
    const fileHandle = await this.getFileHandle(path);
    const writable = await fileHandle.createWritable();

    try {
      if (typeof content === 'string') {
        await writable.write(content);
      } else {
        await writable.write(content);
      }
    } finally {
      await writable.close();
    }
  }

  async createFolder(path: string, name: string): Promise<FileItem> {
    if (!this.rootHandle) {
      throw new Error('未选择文件夹，请先调用 openFolder()');
    }

    const normalizedPath = this.normalizePath(path);
    let parentHandle: FileSystemDirectoryHandle;

    if (normalizedPath === '') {
      parentHandle = this.rootHandle;
    } else {
      parentHandle = await this.getDirectoryHandle(normalizedPath);
    }

    const newDirHandle = await parentHandle.getDirectoryHandle(name, { create: true });
    const fullPath = normalizedPath === '' ? name : `${normalizedPath}/${name}`;

    return {
      id: fullPath,
      name,
      type: 'folder',
      path: `/${fullPath}`,
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.rootHandle) {
      throw new Error('未选择文件夹，请先调用 openFolder()');
    }

    const normalizedPath = this.normalizePath(path);
    const parts = normalizedPath.split('/').filter(Boolean);
    const fileName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parentHandle = parentPath === '' ? this.rootHandle : await this.getDirectoryHandle(parentPath);

    await parentHandle.removeEntry(fileName, { recursive: true });
  }

  async renameFile(path: string, newName: string): Promise<void> {
    // File System Access API 不直接支持重命名，需要复制后删除
    const fileItem = await this.getFileInfo(path);
    if (!fileItem) {
      throw new Error('文件不存在');
    }

    const normalizedPath = this.normalizePath(path);
    const parts = normalizedPath.split('/').filter(Boolean);
    const parentPath = parts.slice(0, -1).join('/');
    const newPath = parentPath === '' ? newName : `${parentPath}/${newName}`;

    // 读取原文件
    const content = await this.readFile(path);

    // 创建新文件
    if (fileItem.type === 'file') {
      await this.writeFile(newPath, content as string | Blob);
    } else {
      await this.createFolder(parentPath, newName);
      // TODO: 复制文件夹内容
    }

    // 删除原文件
    await this.deleteFile(path);
  }

  async copyFile(srcPath: string, destPath: string): Promise<void> {
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content);
  }

  async moveFile(srcPath: string, destPath: string): Promise<void> {
    await this.copyFile(srcPath, destPath);
    await this.deleteFile(srcPath);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.getFileInfo(path);
      return true;
    } catch {
      return false;
    }
  }

  async getFileInfo(path: string): Promise<FileItem | null> {
    try {
      const normalizedPath = this.normalizePath(path);
      const parts = normalizedPath.split('/').filter(Boolean);

      if (parts.length === 0) {
        // 根目录
        return {
          id: this.rootPath,
          name: this.rootPath,
          type: 'folder',
          path: '/',
          createdAt: new Date(),
          modifiedAt: new Date()
        };
      }

      const fileName = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const parentHandle = parentPath === '' ? this.rootHandle! : await this.getDirectoryHandle(parentPath);

      let handle: FileSystemFileHandle | FileSystemDirectoryHandle;
      try {
        handle = await parentHandle.getFileHandle(fileName);
      } catch {
        handle = await parentHandle.getDirectoryHandle(fileName);
      }

      const fileItem = this.handleToFileItem(handle, parentPath);

      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        fileItem.size = file.size;
        fileItem.modifiedAt = new Date(file.lastModified);
        fileItem.createdAt = new Date(file.lastModified);
      }

      return fileItem;
    } catch (error) {
      console.warn('获取文件信息失败:', path, error);
      return null;
    }
  }
}

