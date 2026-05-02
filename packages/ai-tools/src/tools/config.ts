/** ConfigTool — 配置管理工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ConfigInput } from '../types/tool-inputs';
import type { ConfigOutput } from '../types/tool-outputs';
import { ConfigInputSchema } from '../types/tool-inputs';

/**
 * ConfigTool — 配置管理工具
 *
 * - isReadOnly: varies — GET=true, SET=false
 * - isConcurrencySafe: false — 配置修改影响全局状态
 * - safetyLabel: varies — GET=readonly, SET=system
 * - isDestructive: false — 配置修改不是破坏性操作
 * - 依赖ConfigProvider（宿主注入）
 */
export const configTool = buildTool<ConfigInput, ConfigOutput>({
  name: 'config',

  inputSchema: ConfigInputSchema,

  description: async input =>
    input.value !== undefined
      ? `Set config "${input.setting}" to ${JSON.stringify(input.value)}`
      : `Get config "${input.setting}"`,

  isReadOnly: (input?: ConfigInput): boolean => {
    // GET操作(无value) → readonly
    return input?.value === undefined;
  },
  isConcurrencySafe: () => false,
  safetyLabel: (input?: ConfigInput): SafetyLabel => {
    // GET → readonly, SET → system
    return input?.value === undefined ? ('readonly' as SafetyLabel) : ('system' as SafetyLabel);
  },
  isDestructive: () => false,

  validateInput: (input: ConfigInput): ValidationResult => {
    if (input.setting.trim().length === 0) {
      return {
        behavior: 'deny',
        message: 'Setting key cannot be empty',
        reason: 'invalid_setting_key'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (input?: ConfigInput): PermissionResult => {
    // GET操作自动允许，SET需要确认
    if (input?.value === undefined) {
      return { behavior: 'allow' };
    }
    return { behavior: 'ask', message: `Change setting "${input.setting}"?` };
  },

  call: async (
    input: ConfigInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<ConfigOutput>> => {
    const configProvider = context.configProvider;

    if (!configProvider) {
      return {
        data: {
          success: false,
          error: 'ConfigProvider not available'
        }
      };
    }

    // GET操作
    if (input.value === undefined) {
      const value = await configProvider.getSetting(input.setting);
      return {
        data: {
          success: true,
          operation: 'get',
          setting: input.setting,
          value
        }
      };
    }

    // SET操作
    const result = await configProvider.setSetting(input.setting, input.value);
    return {
      data: {
        success: result.success,
        operation: 'set',
        setting: input.setting,
        previousValue: result.previousValue,
        newValue: result.newValue,
        error: result.error
      }
    };
  },

  toAutoClassifierInput: (input: ConfigInput) => ({
    toolName: 'config',
    input,
    safetyLabel: input.value === undefined ? 'readonly' : 'system',
    isReadOnly: input.value === undefined,
    isDestructive: false
  }),

  maxResultSizeChars: 5_000
});
