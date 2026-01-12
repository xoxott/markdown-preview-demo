/**
 * 文件操作示例
 * 展示文件上传和下载功能
 */

import { createRequest } from '../request';

const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 60000, // 文件上传需要更长的超时时间
});

// ========== 文件上传 ==========

/**
 * 单文件上传
 */
async function uploadFile(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const result = await request.upload<{ url: string; filename: string }>('/upload', formData, {
    onUploadProgress: progressEvent => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / (progressEvent.total || 1),
      );
      console.log(`上传进度: ${percentCompleted}%`);
    },
  });

  return result;
}

/**
 * 多文件上传
 */
async function uploadMultipleFiles(
  files: File[],
): Promise<Array<{ url: string; filename: string }>> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const result = await request.upload<Array<{ url: string; filename: string }>>(
    '/upload/multiple',
    formData,
    {
      onUploadProgress: progressEvent => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1),
        );
        console.log(`上传进度: ${percentCompleted}%`);
      },
    },
  );

  return result;
}

/**
 * 带额外参数的文件上传
 */
async function uploadFileWithParams(
  file: File,
  params: { category: string; description?: string },
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', params.category);
  if (params.description) {
    formData.append('description', params.description);
  }

  const result = await request.upload<{ url: string; filename: string }>('/upload', formData);

  return result;
}

// ========== 文件下载 ==========

/**
 * 文件下载（Blob）
 */
async function downloadFile(url: string, filename: string): Promise<void> {
  await request.download(url, {}, filename, {
    onDownloadProgress: (progressEvent: any) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / (progressEvent.total || 1),
      );
      console.log(`下载进度: ${percentCompleted}%`);
    },
  });
}

/**
 * 文件下载（Base64）
 * 通过设置 responseType 为 'text' 并手动转换为 Base64
 */
async function downloadFileAsBase64(url: string): Promise<string> {
  const request = createRequest();
  const blob = await request.get<Blob>(
    url,
    {},
    {
      responseType: 'blob',
    },
  );

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 文件下载（ArrayBuffer）
 * 通过设置 responseType 为 'arraybuffer'
 */
async function downloadFileAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const request = createRequest();
  const arrayBuffer = await request.get<ArrayBuffer>(
    url,
    {},
    {
      responseType: 'arraybuffer',
    },
  );
  return arrayBuffer;
}

// ========== 使用示例 ==========

/**
 * 图片上传示例
 */
async function uploadImageExample() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.onchange = async e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const result = await uploadFile(file);
      console.log('上传成功:', result.url);
    } catch (error) {
      console.error('上传失败:', error);
    }
  };
  fileInput.click();
}

/**
 * 文件下载示例
 */
async function downloadFileExample() {
  try {
    await downloadFile('/api/files/document.pdf', 'document.pdf');
    console.log('下载完成');
  } catch (error) {
    console.error('下载失败:', error);
  }
}

/**
 * 批量上传示例
 */
async function batchUploadExample(files: File[]) {
  try {
    const results = await uploadMultipleFiles(files);
    console.log('批量上传成功:', results);
  } catch (error) {
    console.error('批量上传失败:', error);
  }
}

export {
  uploadFile,
  uploadMultipleFiles,
  uploadFileWithParams,
  downloadFile,
  downloadFileAsBase64,
  downloadFileAsArrayBuffer,
  uploadImageExample,
  downloadFileExample,
  batchUploadExample,
};
