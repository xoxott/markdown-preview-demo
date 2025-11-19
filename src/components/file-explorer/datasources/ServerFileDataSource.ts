import type { FileItem } from '../types/file-explorer';
import type { IFileDataSource, ServerFileDataSourceConfig } from './types';

/** 服务器文件数据源实现 */
export class ServerFileDataSource implements IFileDataSource {
  readonly type = 'server' as const;
  rootPath: string = '/';
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ServerFileDataSourceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    if (config.token) {
      this.headers['Authorization'] = `Bearer ${config.token}`;
    }
  }

  /** 规范化路径 */
  private normalizePath(path: string): string {
    return path.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  /** 构建 API URL */
  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  /** 发送请求 */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return (await response.text()) as T;
  }

  /** 将服务器文件对象转换为 FileItem */
  private serverFileToFileItem(file: any, parentPath: string = ''): FileItem {
    const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
    return {
      id: file.id || fullPath,
      name: file.name,
      type: file.type === 'directory' || file.isDirectory ? 'folder' : 'file',
      path: `/${fullPath}`,
      size: file.size,
      extension: file.extension || this.getExtension(file.name),
      modifiedAt: file.modifiedAt ? new Date(file.modifiedAt) : undefined,
      createdAt: file.createdAt ? new Date(file.createdAt) : undefined,
      mimeType: file.mimeType,
      ...file
    };
  }

  /** 获取文件扩展名 */
  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  async listFiles(path: string = '/'): Promise<FileItem[]> {
    const normalizedPath = this.normalizePath(path);
    const endpoint = normalizedPath ? `/api/files/list?path=${encodeURIComponent(normalizedPath)}` : '/api/files/list';

    const response = await this.request<{ files: any[] }>(endpoint);
    const parentPath = normalizedPath || '';

    return response.files.map(file => this.serverFileToFileItem(file, parentPath));
  }

  async readFile(path: string): Promise<string | Blob> {
    const normalizedPath = this.normalizePath(path);
    const endpoint = `/api/files/read?path=${encodeURIComponent(normalizedPath)}`;

    const response = await fetch(this.buildUrl(endpoint), {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`读取文件失败: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isText = contentType.includes('text/') ||
      contentType.includes('application/json') ||
      contentType.includes('application/javascript') ||
      contentType.includes('application/xml');

    if (isText) {
      return await response.text();
    }

    return await response.blob();
  }

  async writeFile(path: string, content: string | Blob): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const endpoint = '/api/files/write';

    const formData = new FormData();
    formData.append('path', normalizedPath);

    if (typeof content === 'string') {
      formData.append('content', new Blob([content], { type: 'text/plain' }));
    } else {
      formData.append('content', content);
    }

    await this.request(endpoint, {
      method: 'POST',
      headers: {
        // 移除 Content-Type，让浏览器自动设置 multipart/form-data
        ...Object.fromEntries(
          Object.entries(this.headers).filter(([key]) => key.toLowerCase() !== 'content-type')
        )
      },
      body: formData
    });
  }

  async createFolder(path: string, name: string): Promise<FileItem> {
    const normalizedPath = this.normalizePath(path);
    const fullPath = normalizedPath ? `${normalizedPath}/${name}` : name;
    const endpoint = '/api/files/create-folder';

    const response = await this.request<{ file: any }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        path: normalizedPath,
        name
      })
    });

    return this.serverFileToFileItem(response.file, normalizedPath);
  }

  async deleteFile(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const endpoint = '/api/files/delete';

    await this.request(endpoint, {
      method: 'DELETE',
      body: JSON.stringify({ path: normalizedPath })
    });
  }

  async renameFile(path: string, newName: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const endpoint = '/api/files/rename';

    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        path: normalizedPath,
        newName
      })
    });
  }

  async copyFile(srcPath: string, destPath: string): Promise<void> {
    const normalizedSrcPath = this.normalizePath(srcPath);
    const normalizedDestPath = this.normalizePath(destPath);
    const endpoint = '/api/files/copy';

    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        srcPath: normalizedSrcPath,
        destPath: normalizedDestPath
      })
    });
  }

  async moveFile(srcPath: string, destPath: string): Promise<void> {
    const normalizedSrcPath = this.normalizePath(srcPath);
    const normalizedDestPath = this.normalizePath(destPath);
    const endpoint = '/api/files/move';

    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        srcPath: normalizedSrcPath,
        destPath: normalizedDestPath
      })
    });
  }

  async exists(path: string): Promise<boolean> {
    try {
      const info = await this.getFileInfo(path);
      return info !== null;
    } catch {
      return false;
    }
  }

  async getFileInfo(path: string): Promise<FileItem | null> {
    try {
      const normalizedPath = this.normalizePath(path);
      const endpoint = `/api/files/info?path=${encodeURIComponent(normalizedPath)}`;

      const response = await this.request<{ file: any }>(endpoint);
      if (!response.file) {
        return null;
      }

      const parts = normalizedPath.split('/').filter(Boolean);
      const parentPath = parts.slice(0, -1).join('/');

      return this.serverFileToFileItem(response.file, parentPath);
    } catch (error) {
      console.warn('获取文件信息失败:', path, error);
      return null;
    }
  }
}

