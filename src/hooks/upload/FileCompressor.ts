/**
 * 文件压缩器
 *
 * 提供文件压缩功能，主要用于图片压缩。 支持设置压缩质量和最大尺寸。
 */
export default class FileCompressor {
  /**
   * 压缩图片文件
   *
   * @example
   *   ```ts
   *   const compressedFile = await FileCompressor.compressImage(file, 0.7, 1280, 720);
   *   ```;
   *
   * @param file - 待压缩的图片文件（File 对象）
   * @param quality - 压缩质量，取值范围 0~1，默认 0.8（越小压缩越明显，质量越低）
   * @param maxWidth - 压缩后最大宽度，默认 1920px
   * @param maxHeight - 压缩后最大高度，默认 1080px
   * @returns 压缩后的文件（Promise<File>）
   */
  static async compressImage(file: File, quality = 0.8, maxWidth = 1920, maxHeight = 1080): Promise<File> {
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
