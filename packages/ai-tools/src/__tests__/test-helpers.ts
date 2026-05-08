/**
 * 测试共用：G11 工具 validateInput / checkPermissions 可能返回 Promise；ToolUseContext 最小构造；FileSystemProvider G8 stub。
 */

import { ToolRegistry, type PermissionResult, ToolUseContext, ValidationResult } from '@suga/ai-tool-core';
import type { FileSystemProvider } from '../types/fs-provider';

export async function awaitedValidation(
  result: ValidationResult | Promise<ValidationResult>
): Promise<ValidationResult> {
  return Promise.resolve(result);
}

export async function awaitedPermission(
  result: PermissionResult | Promise<PermissionResult>
): Promise<PermissionResult> {
  return Promise.resolve(result);
}

/** 构造满足 ToolUseContext 的最小上下文，可按需叠加字段（如 fsProvider）。 */
export function minimalToolUseContext(partial?: Record<string, unknown>): ToolUseContext {
  return {
    abortController: new AbortController(),
    tools: new ToolRegistry(),
    sessionId: 'test-session',
    ...partial
  } as ToolUseContext;
}

/** 补全 FileSystemProvider 的 G8 后台 API（测试用 no-op）。 */
export const fsProviderBackgroundNoops: Pick<
  FileSystemProvider,
  | 'spawnBackgroundCommand'
  | 'getBackgroundTask'
  | 'stopBackgroundTask'
  | 'listBackgroundTasks'
  | 'registerForeground'
  | 'unregisterForeground'
  | 'markTaskNotified'
> = {
  async spawnBackgroundCommand(command: string) {
    const startedAt = Date.now();
    return {
      taskId: `stub-bg-${startedAt}`,
      status: 'running' as const,
      command,
      startedAt
    };
  },
  async getBackgroundTask() {
    return null;
  },
  async stopBackgroundTask() {
    return true;
  },
  async listBackgroundTasks() {
    return [];
  },
  registerForeground() {},
  unregisterForeground() {},
  markTaskNotified() {}
};
