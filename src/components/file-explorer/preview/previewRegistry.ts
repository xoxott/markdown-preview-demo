import type { FileCategory, PreviewerMatch, PreviewerRegistration } from './types';

/** 文件预览器注册表 — 集中管理文件类型与对应预览器的映射 */
class PreviewRegistry {
  /** 按扩展名索引的注册项 */
  private extensionMap = new Map<string, PreviewerRegistration[]>();
  /** 按 MIME 类型索引的注册项 */
  private mimeMap = new Map<string, PreviewerRegistration[]>();
  /** 所有已注册的分类 */
  private categories = new Set<FileCategory>();

  /** 注册一个预览器 */
  register(registration: PreviewerRegistration): void {
    this.categories.add(registration.category);

    for (const ext of registration.extensions) {
      const key = ext.toLowerCase();
      const existing = this.extensionMap.get(key) || [];
      existing.push(registration);
      // 按优先级排序（高优先级在前）
      existing.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      this.extensionMap.set(key, existing);
    }

    if (registration.mimeTypes) {
      for (const mime of registration.mimeTypes) {
        const key = mime.toLowerCase();
        const existing = this.mimeMap.get(key) || [];
        existing.push(registration);
        existing.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        this.mimeMap.set(key, existing);
      }
    }
  }

  /** 批量注册预览器 */
  registerAll(registrations: PreviewerRegistration[]): void {
    for (const reg of registrations) {
      this.register(reg);
    }
  }

  /** 根据扩展名和可选的 MIME 类型查找预览器 */
  getPreviewer(extension?: string, mimeType?: string): PreviewerMatch | null {
    // 1. 优先按扩展名查找
    if (extension) {
      const extKey = extension.toLowerCase();
      const entries = this.extensionMap.get(extKey);
      if (entries?.length) {
        const first = entries[0];
        return { category: first.category, component: first.component };
      }
    }

    // 2. fallback 按 MIME 类型查找
    if (mimeType) {
      const mimeKey = mimeType.toLowerCase();
      const entries = this.mimeMap.get(mimeKey);
      if (entries?.length) {
        const first = entries[0];
        return { category: first.category, component: first.component };
      }
    }

    return null;
  }

  /** 根据扩展名获取文件分类 */
  getCategory(extension?: string): FileCategory {
    if (!extension) return 'unsupported';
    const entries = this.extensionMap.get(extension.toLowerCase());
    return entries?.[0]?.category ?? 'unsupported';
  }

  /** 判断文件是否可以预览 */
  canPreview(extension?: string, mimeType?: string): boolean {
    return this.getPreviewer(extension, mimeType) !== null;
  }

  /** 获取所有已注册的分类 */
  getCategories(): FileCategory[] {
    return Array.from(this.categories);
  }
}

/** 全局注册表实例 */
export const previewRegistry = new PreviewRegistry();

/** 注册一个预览器到全局注册表 */
export function registerPreviewer(registration: PreviewerRegistration): void {
  previewRegistry.register(registration);
}

/** 从全局注册表查找预览器 */
export function getPreviewer(extension?: string, mimeType?: string): PreviewerMatch | null {
  return previewRegistry.getPreviewer(extension, mimeType);
}

/** 获取文件分类 */
export function getFileCategory(extension?: string): FileCategory {
  return previewRegistry.getCategory(extension);
}

/** 初始化所有内置预览器注册 */
export function initBuiltinPreviewers(registrations: PreviewerRegistration[]): void {
  previewRegistry.registerAll(registrations);
}
