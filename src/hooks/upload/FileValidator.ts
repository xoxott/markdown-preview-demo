/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:09:01
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:09:11
 * @FilePath: \markdown-preview-demo\src\hooks\upload\FileValidator.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { UploadConfig } from "./type";
import { formatFileSize } from "./utils";

// ==================== 工具类：文件验证器 ====================
export default class FileValidator {
  constructor(private config: UploadConfig) {}

  validate(files: File[]): { valid: File[]; errors: Array<{ file: File; reason: string }> } {
    const valid: File[] = [];
    const errors: Array<{ file: File; reason: string }> = [];
    
    for (const file of files) {
      const error = this.validateSingleFile(file, valid.length);
      if (error) {
        errors.push({ file, reason: error });
        console.warn(`文件 ${file.name} 验证失败: ${error}`);
      } else {
        valid.push(file);
      }
    }

    return { valid, errors };
  }

  private validateSingleFile(file: File, currentCount: number): string | null {
    if (file.size === 0) {
      return '文件为空';
    }

    if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
      return `文件大小超限: ${formatFileSize(file.size)} > ${formatFileSize(this.config.maxFileSize)}`;
    }

    if (!this.isAcceptedType(file)) {
      return `文件类型不支持。支持: ${this.config.accept?.join(', ')}`;
    }

    if (this.config.maxFiles && currentCount >= this.config.maxFiles) {
      return `已达到最大文件数量: ${this.config.maxFiles}`;
    }

    return null;
  }

  private isAcceptedType(file: File): boolean {
    if (!this.config.accept?.length) return true;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    const isValidExtension = extension && this.config.accept.some(accept =>
      accept.toLowerCase() === `.${extension}` || accept.toLowerCase() === extension
    );

    const isValidMimeType = this.config.accept.some(accept =>
      accept.toLowerCase() === mimeType ||
      (accept.includes('/') && mimeType.startsWith(accept.split('/')[0]))
    );

    return isValidExtension || isValidMimeType;
  }
}