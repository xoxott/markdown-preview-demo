/** P6 内部 Mock 工具 — 不依赖 P0 的 tests/mocks（exports 不暴露） */

import { z } from 'zod';
import { buildTool } from '@suga/ai-tool-core';
import type { SafetyLabel, ToolResult, ToolUseContext } from '@suga/ai-tool-core';

/** Mock 工具配置 */
export interface MockToolConfig {
  name?: string;
  isConcurrencySafe?: boolean;
  isReadOnly?: boolean;
  callFn?: (args: unknown, context: ToolUseContext) => Promise<ToolResult<unknown>>;
}

/** 创建 Mock 工具 */
export function createMockTool(
  config: MockToolConfig = {}
): ReturnType<typeof buildTool<unknown, unknown>> {
  return buildTool<unknown, unknown>({
    name: config.name ?? 'mock-tool',
    inputSchema: z.object({}),
    call: config.callFn ?? (async () => ({ data: null })),
    description: async () => config.name ?? 'mock-tool',
    isConcurrencySafe:
      config.isConcurrencySafe !== undefined
        ? () => config.isConcurrencySafe as boolean
        : undefined,
    isReadOnly: config.isReadOnly !== undefined ? () => config.isReadOnly as boolean : undefined,
    safetyLabel: config.isReadOnly ? () => 'readonly' as SafetyLabel : undefined
  });
}

/** 创建 safe (readonly) Mock 工具 */
export function createSafeMockTool(
  config: MockToolConfig = {}
): ReturnType<typeof buildTool<unknown, unknown>> {
  return createMockTool({
    ...config,
    isConcurrencySafe: true,
    isReadOnly: true
  });
}

/** 创建 unsafe Mock 工具 */
export function createUnsafeMockTool(
  config: MockToolConfig = {}
): ReturnType<typeof buildTool<unknown, unknown>> {
  return createMockTool({
    ...config,
    isConcurrencySafe: false,
    isReadOnly: false
  });
}
