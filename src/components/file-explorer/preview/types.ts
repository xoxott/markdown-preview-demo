import type { Component } from 'vue';
import type { FileItem } from '../types/file-explorer';

/** 预览器统一 Props */
export interface PreviewerProps {
  /** 文件项信息 */
  file: FileItem;
  /** 文件内容（字符串或二进制） */
  content: string | Blob | undefined;
}

/** 文件类型分类 */
export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'markdown'
  | 'code'
  | 'office'
  | 'archive'
  | 'svg'
  | 'mermaid'
  | 'echarts'
  | 'mindmap'
  | 'font'
  | 'unsupported';

/** 预览器注册项 */
export interface PreviewerRegistration {
  /** 文件类型分类 */
  category: FileCategory;
  /** 支持的文件扩展名（不含点号） */
  extensions: string[];
  /** 支持的 MIME 类型（可选 fallback） */
  mimeTypes?: string[];
  /** 预览器组件（支持异步组件） */
  component: Component;
  /** 同扩展名冲突时的优先级，数值越大优先级越高 */
  priority?: number;
}

/** 预览器查询结果 */
export interface PreviewerMatch {
  /** 匹配到的分类 */
  category: FileCategory;
  /** 匹配到的预览器组件 */
  component: Component;
}
