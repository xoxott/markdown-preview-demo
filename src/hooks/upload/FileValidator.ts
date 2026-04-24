/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:09:01
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:09:11
 * @FilePath: \markdown-preview-demo\src\hooks\upload\FileValidator.ts
 * @Description: 文件验证器
 */
import type { UploadConfig } from './type';
import { formatFileSize } from './utils';

// ==================== 工具类:文件验证器 ====================

/**
 * 文件验证器,用于在上传前对文件进行合法性检查。 支持验证:
 *
 * - 文件大小
 * - 文件类型
 * - 文件数量限制
 */
export default class FileValidator {
  /** @param config - 上传配置对象,用于控制文件大小、类型和数量限制 */
  constructor(private config: UploadConfig) {}

  /**
   * 批量验证文件列表
   *
   * @param files - 待验证的文件数组
   * @param existingCount - 🔥 新增：已存在的文件数量（队列中 + 上传中的文件总数）
   * @returns 对象包含两个字段:
   *
   *   - valid: 验证通过的文件数组
   *   - errors: 验证失败的文件及失败原因
   */
  validate(
    files: File[],
    existingCount: number = 0
  ): { valid: File[]; errors: Array<{ file: File; reason: string }> } {
    const valid: File[] = [];
    const errors: Array<{ file: File; reason: string }> = [];

    console.log(`📝 开始验证 ${files.length} 个文件，当前已有 ${existingCount} 个文件`);

    for (const file of files) {
      const totalCount = existingCount + valid.length;
      const error = this.validateSingleFile(file, totalCount);

      if (error) {
        errors.push({ file, reason: error });
        console.warn(`❌ 文件 ${file.name} 验证失败: ${error}`);
      } else {
        valid.push(file);
        console.log(`✅ 文件 ${file.name} 验证通过 (${valid.length}/${files.length})`);
      }
    }

    console.log(`📊 验证结果: 通过 ${valid.length} 个，失败 ${errors.length} 个`);

    return { valid, errors };
  }

  /**
   * 验证单个文件是否合法
   *
   * @param file - 待验证的文件对象
   * @param totalCount - 🔥 修改：总文件数量（已有的 + 当前批次已验证的）
   * @returns 错误原因字符串,如果合法则返回 null
   */
  private validateSingleFile(file: File, totalCount: number): string | null {
    // 1. 检查文件是否为空
    if (file.size === 0) {
      return '文件为空';
    }

    // 2. 检查文件大小
    if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
      return `文件大小超限: ${formatFileSize(file.size)} > ${formatFileSize(this.config.maxFileSize)}`;
    }

    // 3. 检查文件类型
    if (!this.isAcceptedType(file)) {
      return `文件类型不支持。支持: ${this.config.accept?.join(', ')}`;
    }

    // 4. 🔥 检查文件数量（考虑已存在的文件）
    if (this.config.maxFiles && totalCount >= this.config.maxFiles) {
      return `已达到最大文件数量限制: ${this.config.maxFiles} (当前: ${totalCount})`;
    }

    return null;
  }

  /**
   * 判断文件类型是否被允许
   *
   * 支持根据文件扩展名或 MIME 类型进行验证。 如果配置中未指定 accept 列表,则默认允许所有类型。
   *
   * @param file - 待验证的文件对象
   * @returns 是否被允许上传(true/false)
   */
  private isAcceptedType(file: File): boolean {
    if (!this.config.accept?.length) return true;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    const isValidExtension =
      extension &&
      this.config.accept.some(
        accept => accept.toLowerCase() === `.${extension}` || accept.toLowerCase() === extension
      );

    const isValidMimeType = this.config.accept.some(
      accept =>
        accept.toLowerCase() === mimeType ||
        (accept.includes('/') && mimeType.startsWith(accept.split('/')[0]))
    );

    return isValidExtension || isValidMimeType;
  }
}
