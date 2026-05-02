/** EnterPlanModeTool — 进入计划模式 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { EnterPlanModeInput } from '../types/tool-inputs';
import type { EnterPlanModeOutput } from '../types/tool-outputs';
import { EnterPlanModeInputSchema } from '../types/tool-inputs';

export const enterPlanModeTool = buildTool<EnterPlanModeInput, EnterPlanModeOutput>({
  name: 'enter-plan-mode',

  inputSchema: EnterPlanModeInputSchema,

  description: async () => 'Enter plan mode for structured planning',

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'system' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (): ValidationResult => ({ behavior: 'allow' }),
  checkPermissions: (): PermissionResult => ({ behavior: 'ask', message: 'Enter plan mode?' }),

  call: async (
    _input: EnterPlanModeInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<EnterPlanModeOutput>> => {
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
    const result = await provider.enterPlanMode();
    return { data: result };
  },

  toAutoClassifierInput: (_input: EnterPlanModeInput) => ({
    toolName: 'enter_plan_mode',
    input: {},
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 1_000
});