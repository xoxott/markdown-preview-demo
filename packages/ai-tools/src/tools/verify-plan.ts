/**
 * VerifyPlanExecutionTool — Plan执行验证
 *
 * 对齐 CC VerifyPlanExecutionTool: 与 EnterPlanMode/ExitPlanMode 配套，验证plan中的所有步骤是否都已完成。
 */

import { z } from 'zod/v4';
import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ToolUseContext } from '@suga/ai-tool-core';

// ============================================================
// 类型定义
// ============================================================

/** VerifyPlanExecution 输入 Schema */
export const VerifyPlanInputSchema = z.strictObject({
  /** Plan ID（可选，验证当前活跃plan） */
  planId: z.string().optional().describe('Plan ID to verify (omit to verify current active plan)')
});

export type VerifyPlanInput = z.infer<typeof VerifyPlanInputSchema>;

/** Plan步骤验证结果 */
export interface PlanStepVerification {
  readonly stepIndex: number;
  readonly description: string;
  readonly completed: boolean;
  readonly evidence?: string;
}

/** VerifyPlan 输出 */
export interface VerifyPlanOutput {
  readonly planId: string;
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly allCompleted: boolean;
  readonly steps: readonly PlanStepVerification[];
  readonly summary: string;
}

// ============================================================
// buildTool
// ============================================================

function makeNoPlanResult(planId: string, message: string): VerifyPlanOutput {
  return {
    planId,
    totalSteps: 0,
    completedSteps: 0,
    allCompleted: false,
    steps: [],
    summary: message
  };
}

export const verifyPlanTool = buildTool({
  name: 'verify_plan_execution',
  description: async () =>
    'Verify that all steps in the current plan have been completed. Use this before exiting plan mode to ensure all planned work is done.',
  safetyLabel: () => 'readonly',
  isReadOnly: () => true,
  inputSchema: VerifyPlanInputSchema,
  async call(
    input: VerifyPlanInput,
    context: ToolUseContext
  ): Promise<ToolResult<VerifyPlanOutput>> {
    const planProvider = (context as unknown as Record<string, unknown>).planModeProvider as
      | {
          getActivePlan?: () =>
            | { id: string; steps: readonly { description: string; completed: boolean }[] }
            | undefined;
        }
      | undefined;

    if (!planProvider?.getActivePlan) {
      return {
        data: makeNoPlanResult(
          input.planId ?? 'none',
          'No plan found or plan provider not available'
        )
      };
    }

    const plan = planProvider.getActivePlan();

    if (!plan) {
      return { data: makeNoPlanResult(input.planId ?? 'none', 'No active plan found') };
    }

    const steps: PlanStepVerification[] = plan.steps.map((s, i) => ({
      stepIndex: i,
      description: s.description,
      completed: s.completed
    }));

    const completedCount = steps.filter(s => s.completed).length;
    const allCompleted = completedCount === steps.length;

    const summary = allCompleted
      ? `All ${steps.length} plan steps completed ✓`
      : `${completedCount}/${steps.length} steps completed. ${steps.length - completedCount} remaining: ${steps
          .filter(s => !s.completed)
          .map(s => s.description)
          .join('; ')}`;

    return {
      data: {
        planId: plan.id,
        totalSteps: steps.length,
        completedSteps: completedCount,
        allCompleted,
        steps,
        summary
      }
    };
  }
});
