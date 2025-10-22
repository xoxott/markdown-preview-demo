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

/**
 * 文件验证器，用于在上传前对文件进行合法性检查。
 * 支持验证：
 *  - 文件大小
 *  - 文件类型
 *  - 文件数量限制
 */
export default class FileValidator {
  /**
   * @param config - 上传配置对象，用于控制文件大小、类型和数量限制
   */
  constructor(private config: UploadConfig) {
       console.log('实例化');
  }

  /**
   * 批量验证文件列表
   * 
   * @param files - 待验证的文件数组
   * @returns 对象包含两个字段：
   *  - valid: 验证通过的文件数组
   *  - errors: 验证失败的文件及失败原因
   */
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
        console.log(valid.length,'添加进校验通过的数组');
      }
    }

    return { valid, errors };
  }

  /**
   * 验证单个文件是否合法
   * 
   * @param file - 待验证的文件对象
   * @param currentCount - 当前已验证通过的文件数量（用于判断最大文件数量限制）
   * @returns 错误原因字符串，如果合法则返回 null
   */
  private validateSingleFile(file: File, currentCount: number): string | null {
    if (file.size === 0) {
      return '文件为空';
    }
   console.log('配置的最大数量:',this.config.maxFiles,'当前数量',currentCount);
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

  /**
   * 判断文件类型是否被允许
   * 
   * 支持根据文件扩展名或 MIME 类型进行验证。
   * 如果配置中未指定 accept 列表，则默认允许所有类型。
   * 
   * @param file - 待验证的文件对象
   * @returns 是否被允许上传（true/false）
   */
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
