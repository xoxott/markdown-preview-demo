/** 预览生成器 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class PreviewGenerator {
  /**
   * 生成图片预览
   *
   * @param file - 图片文件
   * @param maxWidth - 最大宽度
   * @param maxHeight - 最大高度
   * @returns Base64 格式的预览图
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
            const scale = Math.min(
              maxWidth / img.width,
              maxHeight / img.height,
              1 // 不放大，只缩小
            );

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
   *
   * @param file - 视频文件
   * @param maxWidth - 最大宽度
   * @param maxHeight - 最大高度
   * @param timeOffset - 截取时间点（秒）
   * @returns Base64 格式的预览图
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
        // 设置到指定时间点
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

  /**
   * 批量生成预览图
   *
   * @param files - 文件数组
   * @param maxWidth - 最大宽度
   * @param maxHeight - 最大高度
   * @returns 预览图数组（失败的为 null）
   */
  static async batchGenerate(
    files: File[],
    maxWidth: number = 200,
    maxHeight: number = 200
  ): Promise<Array<string | null>> {
    const promises = files.map(async file => {
      try {
        if (file.type.startsWith('image/')) {
          return await this.generateImagePreview(file, maxWidth, maxHeight);
        } else if (file.type.startsWith('video/')) {
          return await this.generateVideoPreview(file, maxWidth, maxHeight);
        }
        return null;
      } catch (error) {
        console.warn(`生成预览失败: ${file.name}`, error);
        return null;
      }
    });

    return Promise.all(promises);
  }

  /** 获取文件的默认图标/预览 用于不支持预览的文件类型 */
  static getFileIcon(file: File): string {
    const type = file.type.toLowerCase();
    const _extension = file.name.split('.').pop()?.toLowerCase() || '';

    // 根据 MIME 类型或扩展名返回对应的图标 URL 或 Base64
    const iconMap: Record<string, string> = {
      // 文档类型
      'application/pdf': '📄',
      'application/msword': '📝',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'application/vnd.ms-excel': '📊',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',

      // 压缩文件
      'application/zip': '🗜️',
      'application/x-rar-compressed': '🗜️',
      'application/x-7z-compressed': '🗜️',

      // 音频
      'audio': '🎵',

      // 默认
      'default': '📎'
    };

    // 检查完整 MIME 类型
    if (iconMap[type]) return iconMap[type];

    // 检查 MIME 类型前缀
    const typePrefix = type.split('/')[0];
    if (iconMap[typePrefix]) return iconMap[typePrefix];

    // 返回默认图标
    return iconMap.default;
  }

  /** 验证文件是否支持预览 */
  static canGeneratePreview(file: File): boolean {
    return file.type.startsWith('image/') || file.type.startsWith('video/');
  }
}

export default PreviewGenerator;
