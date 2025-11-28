/**
 * 文件处理服务
 * 整合文件验证、压缩、预览生成等功能
 */
import type { UploadConfig, FileUploadOptions } from '../types';
import { validateFileType, validateFileSize } from '../utils/validation';
import { formatFileSize } from '../utils/format';
import { calculateFileMD5 } from '../utils/hash';
import { calculateFileMD5Smart } from '../utils/hash-worker';

/**
 * 文件压缩器（静态方法）
 */
class FileCompressor {
  /**
   * 压缩图片文件
   */
  static async compressImage(
    file: File,
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080
  ): Promise<File> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // 计算压缩后的尺寸
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制并压缩
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => {
            const compressedFile = new File([blob!], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

/**
 * 预览生成器（静态方法）
 */
class PreviewGenerator {
  /**
   * 生成图片预览
   */
  static async generateImagePreview(
    file: File,
    maxWidth: number = 200,
    maxHeight: number = 200
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        const img = new Image();

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              reject(new Error('无法获取 Canvas 上下文'));
              return;
            }

            // 计算缩放比例
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            // 绘制缩略图
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 转换为 Base64
            const preview = canvas.toDataURL('image/jpeg', 0.8);
            resolve(preview);
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error('图片加载失败'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * 生成视频预览（截取第一帧）
   */
  static async generateVideoPreview(
    file: File,
    maxWidth: number = 200,
    maxHeight: number = 200,
    timeOffset: number = 1
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.remove();
      };

      // 超时处理
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('视频预览生成超时'));
      }, 10000);

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(timeOffset, video.duration);
      };

      video.onseeked = () => {
        try {
          clearTimeout(timeoutId);

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            cleanup();
            reject(new Error('无法获取 Canvas 上下文'));
            return;
          }

          // 计算缩放比例
          const scale = Math.min(maxWidth / video.videoWidth, maxHeight / video.videoHeight, 1);

          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;

          // 绘制视频帧
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 转换为 Base64
          const preview = canvas.toDataURL('image/jpeg', 0.8);

          cleanup();
          resolve(preview);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error('视频加载失败'));
      };

      video.src = url;
    });
  }

  /** 验证文件是否支持预览 */
  static canGeneratePreview(file: File): boolean {
    return file.type.startsWith('image/') || file.type.startsWith('video/');
  }
}

/**
 * 文件处理服务
 */
export class FileService {
  constructor(private config: UploadConfig) {}

  /**
   * 批量验证文件列表（优化：使用 reduce）
   */
  validate(
    files: File[],
    existingCount: number = 0
  ): { valid: File[]; errors: Array<{ file: File; reason: string }> } {
    return files.reduce(
      (acc, file) => {
        const totalCount = existingCount + acc.valid.length;
        const error = this.validateSingleFile(file, totalCount);

        if (error) {
          acc.errors.push({ file, reason: error });
        } else {
          acc.valid.push(file);
        }

        return acc;
      },
      { valid: [] as File[], errors: [] as Array<{ file: File; reason: string }> }
    );
  }

  /**
   * 验证单个文件
   */
  private validateSingleFile(file: File, totalCount: number): string | null {
    // 检查文件是否为空
    if (file.size === 0) {
      return '文件为空';
    }

    // 检查文件大小
    if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
      return `文件大小超限: ${formatFileSize(file.size)} > ${formatFileSize(this.config.maxFileSize)}`;
    }

    // 检查文件类型
    if (this.config.accept && this.config.accept.length > 0) {
      if (!validateFileType(file, this.config.accept)) {
        return `文件类型不支持。支持: ${this.config.accept.join(', ')}`;
      }
    }

    // 检查文件数量
    if (this.config.maxFiles && totalCount >= this.config.maxFiles) {
      return `已达到最大文件数量限制: ${this.config.maxFiles} (当前: ${totalCount})`;
    }

    return null;
  }

  /**
   * 压缩文件（如果是图片）
   */
  async compressFile(file: File): Promise<File> {
    if (!this.config.enableCompression || !file.type.startsWith('image/')) {
      return file;
    }

    try {
      return await FileCompressor.compressImage(
        file,
        this.config.compressionQuality,
        this.config.previewMaxWidth,
        this.config.previewMaxHeight
      );
    } catch (error) {
      // 压缩失败不影响上传，静默处理
      if (import.meta.env.DEV) {
        console.warn('文件压缩失败:', error);
      }
      return file;
    }
  }

  /**
   * 生成预览
   */
  async generatePreview(file: File): Promise<string | undefined> {
    if (!this.config.enablePreview || !PreviewGenerator.canGeneratePreview(file)) {
      return undefined;
    }

    try {
      if (file.type.startsWith('image/')) {
        return await PreviewGenerator.generateImagePreview(
          file,
          this.config.previewMaxWidth,
          this.config.previewMaxHeight
        );
      }
      if (file.type.startsWith('video/')) {
        return await PreviewGenerator.generateVideoPreview(
          file,
          this.config.previewMaxWidth,
          this.config.previewMaxHeight
        );
      }
      return undefined;
    } catch (error) {
      // 预览生成失败不影响上传，静默处理
      if (import.meta.env.DEV) {
        console.warn('生成预览失败:', error);
      }
      return undefined;
    }
  }

  /**
   * 计算文件 MD5（支持 Worker）
   */
  async calculateMD5(file: File, onProgress?: (progress: number) => void): Promise<string> {
    if (this.config.useWorker) {
      return calculateFileMD5Smart(file, true, onProgress);
    }
    return calculateFileMD5(file, onProgress);
  }

  /**
   * 处理文件（验证、压缩、生成预览、计算 MD5）
   * 优化：并行处理可以并行的步骤
   */
  async processFile(
    file: File,
    options: FileUploadOptions
  ): Promise<{
    file: File;
    originalFile: File;
    preview?: string;
    md5?: string;
  }> {
    // 验证文件
    const { valid } = this.validate([file]);
    if (valid.length === 0) {
      throw new Error(`文件验证失败: ${file.name}`);
    }

    // 压缩文件（必须先完成，因为后续步骤依赖压缩后的文件）
    const processedFile = await this.compressFile(file);

    // 并行处理预览和 MD5（它们互不依赖）
    const [preview, md5] = await Promise.all([
      // 生成预览
      this.generatePreview(processedFile),
      // 计算 MD5（如果需要）
      this.config.enableDeduplication ? this.calculateMD5(processedFile) : Promise.resolve(undefined)
    ]);

    return {
      file: processedFile,
      originalFile: file,
      preview,
      md5
    };
  }
}

