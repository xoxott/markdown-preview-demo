import type { FileItem } from '../types/file-explorer';

/** 数据源类型 */
export type DataSourceType = 'local' | 'server';

/** 文件数据源接口 */
export interface IFileDataSource {
  /** 数据源类型 */
  readonly type: DataSourceType;

  /** 当前根路径 */
  readonly rootPath: string;

  /** 列出指定路径下的文件 */
  listFiles(path?: string): Promise<FileItem[]>;

  /** 读取文件内容 */
  readFile(path: string): Promise<string | Blob>;

  /** 写入文件内容 */
  writeFile(path: string, content: string | Blob): Promise<void>;

  /** 创建文件夹 */
  createFolder(path: string, name: string): Promise<FileItem>;

  /** 删除文件或文件夹 */
  deleteFile(path: string): Promise<void>;

  /** 重命名文件或文件夹 */
  renameFile(path: string, newName: string): Promise<void>;

  /** 复制文件或文件夹 */
  copyFile(srcPath: string, destPath: string): Promise<void>;

  /** 移动文件或文件夹 */
  moveFile(srcPath: string, destPath: string): Promise<void>;

  /** 检查文件是否存在 */
  exists(path: string): Promise<boolean>;

  /** 获取文件信息 */
  getFileInfo(path: string): Promise<FileItem | null>;
}

/** 本地文件数据源配置 */
export interface LocalFileDataSourceConfig {
  /** 根目录句柄 */
  rootHandle?: FileSystemDirectoryHandle;
}

/** 服务器文件数据源配置 */
export interface ServerFileDataSourceConfig {
  /** API 基础 URL */
  baseUrl: string;
  /** 认证 token */
  token?: string;
  /** 请求头 */
  headers?: Record<string, string>;
}

