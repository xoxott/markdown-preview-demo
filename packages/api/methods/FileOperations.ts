/**
 * 文件操作模块
 * 提供文件上传和下载功能
 */

import type { RequestConfig } from '../types';
import { internalError } from '../utils/common/internalLogger';

/**
 * 文件操作管理器
 */
export class FileOperations {
  /**
   * 文件上传
   * @param url 请求URL
   * @param file 文件或FormData
   * @param config 请求配置（支持 onUploadProgress 进度回调）
   * @param postMethod POST 方法
   * @returns Promise
   */
  upload<T = unknown>(
    url: string,
    file: File | FormData,
    config: RequestConfig | undefined,
    postMethod: <T = unknown>(url: string, data?: unknown, config?: RequestConfig) => Promise<T>,
  ): Promise<T> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    const uploadConfig: RequestConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config?.headers || {}),
      },
      // 确保进度回调被传递
      onUploadProgress: config?.onUploadProgress,
    };

    return postMethod<T>(url, formData, uploadConfig);
  }

  /**
   * 文件下载
   * @param url 请求URL
   * @param params 请求参数
   * @param filename 文件名
   * @param config 请求配置（支持 onDownloadProgress 进度回调）
   * @param getMethod GET 方法
   * @returns Promise
   */
  download(
    url: string,
    params: unknown | undefined,
    filename: string | undefined,
    config: RequestConfig | undefined,
    getMethod: <T = unknown>(url: string, params?: unknown, config?: RequestConfig) => Promise<T>,
  ): Promise<void> {
    const downloadConfig: RequestConfig = {
      ...config,
      responseType: 'blob',
      // 确保进度回调被传递
      onDownloadProgress: config?.onDownloadProgress,
    };

    return getMethod<Blob>(url, params, downloadConfig)
      .then(blob => {
        if (!blob || !(blob instanceof Blob)) {
          throw new Error('下载失败：响应数据格式错误');
        }

        // 检查是否在浏览器环境
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          throw new Error('下载功能仅在浏览器环境中可用');
        }

        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || `download_${Date.now()}`;
        link.style.display = 'none';

        try {
          document.body.appendChild(link);
          link.click();
        } finally {
          // 确保清理资源
          document.body.removeChild(link);
          // 延迟释放 URL，确保下载开始
          setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
          }, 100);
        }
      })
      .catch(error => {
        internalError('文件下载失败:', error);
        throw error;
      });
  }
}
