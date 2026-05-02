/** ExitPlanModeTool — 退出计划模式 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ExitPlanModeInput } from '../types/tool-inputs';
import type { ExitPlanModeOutput } from '../types/tool-outputs';
import { ExitPlanModeInputSchema } from '../types/tool-inputs';

export const exitPlanModeTool = buildTool<ExitPlanModeInput, ExitPlanModeOutput>({
  name: 'exit-plan-mode',

  inputSchema: ExitPlanModeInputSchema,

  description: async () => 'Exit plan mode and resume normal execution',

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'system' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (): ValidationResult => ({ behavior: 'allow' }),
  checkPermissions: (): PermissionResult => ({ behavior: 'ask', message: 'Exit plan mode?' }),

  call: async (
    _input: ExitPlanModeInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<ExitPlanModeOutput>> => {
    const provider = context.planModeProvider;
    if (!provider) {
      return {
        data: {
          success: false,
          message: 'PlanModeProvider not available',
          previousMode: 'unknown',
          currentMode: 'unknown'
        }
      };
    }
    const result = await provider.exitPlanMode();
    return { data: result };
  },

  toAutoClassifierInput: (_input: ExitPlanModeInput) => ({
    toolName: 'exit_plan_mode',
    input: {},
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 1_000
});
