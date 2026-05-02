/** AskUserQuestionTool — 用户交互问答工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { AskUserQuestionInput } from '../types/tool-inputs';
import type { AskUserQuestionOutput } from '../types/tool-outputs';
import { AskUserQuestionInputSchema } from '../types/tool-inputs';

/**
 * AskUserQuestionTool — 用户交互问答工具
 *
 * - isReadOnly: true — 只读（展示问题+收集回答）
 * - isConcurrencySafe: false — 需等待用户回答
 * - safetyLabel: 'readonly' — 无破坏性操作
 * - requiresUserInteraction: true — 需用户实时交互
 * - 依赖UserInteractionProvider（宿主注入）
 * - answers字段由权限组件回填
 */
export const askUserQuestionTool = buildTool<AskUserQuestionInput, AskUserQuestionOutput>({
  name: 'ask-user-question',

  inputSchema: AskUserQuestionInputSchema,

  description: async input =>
    `Ask user ${input.questions.length} question(s): ${input.questions.map(q => q.question).join(', ')}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: AskUserQuestionInput): ValidationResult => {
    if (input.questions.length < 1 || input.questions.length > 4) {
      return {
        behavior: 'deny',
        message: 'Must ask 1-4 questions',
        reason: 'invalid_question_count'
      };
    }
    for (const q of input.questions) {
      if (q.options.length < 2 || q.options.length > 4) {
        return {
          behavior: 'deny',
          message: `Question "${q.question}" must have 2-4 options`,
          reason: 'invalid_option_count'
        };
      }
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'ask', message: 'Answer questions?' };
  },

  call: async (
    input: AskUserQuestionInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<AskUserQuestionOutput>> => {
    const provider = context.userInteractionProvider;

    // answers已由权限组件回填 — 直接返回
    if (input.answers && Object.keys(input.answers).length > 0) {
      return {
        data: {
          questions: input.questions,
          answers: input.answers,
          annotations: input.annotations as
            | Record<string, { preview?: string; notes?: string }>
            | undefined
        }
      };
    }

    // 无交互Provider或禁用 — 返回空结果
    if (!provider || !provider.isEnabled()) {
      return {
        data: {
          questions: input.questions,
          answers: {},
          annotations: undefined
        }
      };
    }

    const result = await provider.askQuestions(input.questions);

    return {
      data: {
        questions: input.questions,
        answers: result.answers,
        annotations: result.annotations
      }
    };
  },

  toAutoClassifierInput: (input: AskUserQuestionInput) => ({
    toolName: 'ask_user_question',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 10_000
});
