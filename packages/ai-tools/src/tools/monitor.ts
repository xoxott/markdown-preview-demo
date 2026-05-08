/**
 * 长驻 / 监控入口 — 将命令以后台任务形式启动（spawnBackgroundCommand），不阻塞当前会话。
 *
 * 轮询输出由宿主通过 FileSystemProvider 后台任务 API 或自建 task 管线完成。
 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, ToolResult, ValidationResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { MonitorInput } from '../types/tool-inputs';
import { MonitorInputSchema } from '../types/tool-inputs';

export interface MonitorOutput {
  readonly taskId: string;
  readonly status: string;
  readonly command: string;
  readonly startedAt: number;
  readonly hint: string;
}

export const monitorTool = buildTool<MonitorInput, MonitorOutput>({
  name: 'monitor',

  inputSchema: MonitorInputSchema,

  description: async input =>
    input.description ?? `Monitor (background): ${input.command.substring(0, 60)}`,

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'system',
  isDestructive: () => false,

  validateInput: (input: MonitorInput): ValidationResult => {
    if (!input.command.trim()) {
      return { behavior: 'deny', message: 'command must not be empty', reason: 'empty_command' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (_input: MonitorInput): PermissionResult => ({
    behavior: 'ask',
    message: 'Starting a monitored background command requires approval',
    decisionReason: 'monitor_background_ask'
  }),

  call: async (
    input: MonitorInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<MonitorOutput>> => {
    const bg = await context.fsProvider.spawnBackgroundCommand(input.command);
    return {
      data: {
        taskId: bg.taskId,
        status: bg.status,
        command: input.command,
        startedAt: bg.startedAt,
        hint: 'Poll outputs via host task-output or FileSystemProvider.getBackgroundTask(taskId).'
      }
    };
  },

  toAutoClassifierInput: (input: MonitorInput) => ({
    toolName: 'monitor',
    input,
    safetyLabel: 'system' as const,
    isReadOnly: false,
    isDestructive: false
  })
});
