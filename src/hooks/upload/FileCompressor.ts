/** 文件压缩器 */
export default class FileCompressor {
  static async compressImage(file: File, quality = 0.8, maxWidth = 1920, maxHeight = 1080): Promise<File> {
    return new Promise((resolve) => {
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
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }
}