/**
 * @suga/ai-tools ToolUseContext 扩展
 *
 * 定义扩展的上下文类型，包含 fsProvider。
 *
 * 使用方式:
 * 1. 宿主环境通过 TypeScript interface merging 扩展 ToolUseContext:
 *    declare module '@suga/ai-tool-core' {
 *      interface ToolUseContext { fsProvider: FileSystemProvider }
 *    }
 * 2. 或直接使用 ExtendedToolUseContext 类型创建 context 对象
 *
 * 注意: declare module '@suga/ai-tool-core' 的 augmentation 需要
 * bundler 模式下正确安装 workspace 依赖才能生效。
 * 此文件定义辅助类型，宿主在合适位置添加 module augmentation。
 */

import type { ToolUseContext } from '@suga/ai-tool-core';
import type { FileSystemProvider } from './types/fs-provider';

/** 扩展的 ToolUseContext — 包含 fsProvider */
export interface ExtendedToolUseContext extends ToolUseContext {
  /** 文件系统提供者 — 宿主注入实现 */
  fsProvider: FileSystemProvider;
}

// Side-effect export 确保 augmentation 说明生效
export {};
