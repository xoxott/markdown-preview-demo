/** 工具执行器（Tool Executor） 三阶段执行管线：验证 → 权限 → 调用 */

import type { BuiltTool, ToolResult } from './types/tool';
import type { ToolCallOptions, ToolUseContext } from './types/context';
import type { PermissionMode, PermissionResult } from './types/permission';

/** 执行器结果 */
export interface ExecutorResult<T = unknown> {
  /** 工具返回的结果 */
  result: ToolResult<T>;
  /** 执行是否被中断（权限询问或 AbortSignal 触发时为 true） */
  interrupted: boolean;
}

/**
 * 工具执行器（三阶段执行管线）
 *
 * 执行流程：
 *
 * 1. 前置检查（工具是否启用、是否被拒绝规则禁止）
 * 2. 验证阶段（Zod Schema 验证 + 自定义 validateInput）
 * 3. 权限阶段（模式规则 + 自定义 checkPermissions）
 * 4. 调用阶段（执行工具的 call 方法 + AbortSignal 监听 + 结果截断）
 *
 * 每个阶段都可以中断执行：
 *
 * - 工具未启用 → 返回错误
 * - 拒绝规则匹配 → 返回错误
 * - 验证失败 → 返回错误
 * - 权限拒绝 → 返回错误
 * - 权限询问 → 返回 interrupted=true（交给调用方决策）
 * - AbortSignal 触发 → 根据 interruptBehavior 决定行为
 */
export class ToolExecutor {
  /**
   * 执行工具
   *
   * @param tool 构建完成的工具
   * @param rawArgs 原始输入参数（尚未经过 Zod 验证）
   * @param context 工具使用上下文
   * @param options 调用选项（权限模式、截断限制等）
   * @returns 执行器结果
   */
  async execute<Input, Output>(
    tool: BuiltTool<Input, Output>,
    rawArgs: unknown,
    context: ToolUseContext,
    options?: ToolCallOptions
  ): Promise<ExecutorResult<Output>> {
    // === 前置检查 ===

    // 检查工具是否启用
    if (!tool.isEnabled()) {
      return {
        result: { data: null as unknown as Output, error: `工具 "${tool.name}" 未启用` },
        interrupted: false
      };
    }

    // 检查拒绝规则
    if (context.tools.isDenied(tool.name)) {
      return {
        result: {
          data: null as unknown as Output,
          error: `工具 "${tool.name}" 被拒绝规则禁止`,
          metadata: { denied: true }
        },
        interrupted: false
      };
    }

    // === 阶段 1：验证 ===
    const validatedArgs = await this.validatePhase(tool, rawArgs, context);
    if (validatedArgs.behavior === 'deny') {
      return {
        result: {
          data: null as unknown as Output,
          error: validatedArgs.message,
          metadata: { reason: validatedArgs.reason, phase: 'validation' }
        },
        interrupted: false
      };
    }

    const args = (validatedArgs.updatedInput ?? validatedArgs.data) as Input;

    // === 阶段 2：权限 ===
    if (!options?.skipPermissionCheck) {
      const permissionResult = await this.permissionPhase(tool, args, context, options);
      if (permissionResult.behavior === 'deny') {
        return {
          result: {
            data: null as unknown as Output,
            error: permissionResult.message,
            metadata: { reason: permissionResult.reason, phase: 'permission' }
          },
          interrupted: false
        };
      }

      if (permissionResult.behavior === 'ask') {
        // 权限询问：返回给调用方决策
        return {
          result: {
            data: null as unknown as Output,
            error: permissionResult.message,
            metadata: {
              permissionNeeded: true,
              askMessage: permissionResult.message,
              phase: 'permission'
            }
          },
          interrupted: true
        };
      }

      // 使用权限修正后的输入（如果有）
      const finalArgs = (permissionResult.updatedInput ?? args) as Input;

      // === 阶段 3：调用 ===
      return this.callPhase(tool, finalArgs, context, options);
    }

    // 跳过权限检查时直接调用
    return this.callPhase(tool, args, context, options);
  }

  /** 验证阶段：Zod Schema 验证 + 自定义 validateInput */
  private async validatePhase<Input, Output>(
    tool: BuiltTool<Input, Output>,
    rawArgs: unknown,
    context: ToolUseContext
  ): Promise<
    | { behavior: 'allow'; data: Input; updatedInput?: Input }
    | { behavior: 'deny'; message: string; reason?: string }
  > {
    // Zod 验证
    const zodResult = tool.inputSchema.safeParse(rawArgs);
    if (!zodResult.success) {
      const issues = zodResult.error.issues.map((i: { message: string }) => i.message).join('; ');
      return {
        behavior: 'deny',
        message: `输入验证失败: ${issues}`,
        reason: 'zod_validation_failed'
      };
    }

    const parsedInput = zodResult.data as Input;

    // 自定义 validateInput（语义校验）
    const customValidation = tool.validateInput(parsedInput, context);
    if (customValidation.behavior === 'deny') {
      return {
        behavior: 'deny',
        message: customValidation.message,
        reason: customValidation.reason
      };
    }

    return {
      behavior: 'allow',
      data: parsedInput,
      updatedInput: customValidation.updatedInput as Input | undefined
    };
  }

  /**
   * 权限阶段：模式规则 + 自定义 checkPermissions
   *
   * 模式规则优先于工具自定义检查：
   *
   * - restricted 模式：拒绝所有非只读工具
   * - auto 模式：自动允许只读工具
   * - default 模式：调用工具的 checkPermissions
   */
  private async permissionPhase<Input, Output>(
    tool: BuiltTool<Input, Output>,
    args: Input,
    context: ToolUseContext,
    options?: ToolCallOptions
  ): Promise<PermissionResult> {
    const mode: PermissionMode = options?.permissionMode ?? 'default';

    // restricted 模式：拒绝所有非只读工具
    if (mode === 'restricted' && !tool.isReadOnly(args)) {
      return {
        behavior: 'deny',
        message: `受限模式下不允许执行非只读工具 "${tool.name}"`,
        reason: 'restricted_mode_non_readonly'
      };
    }

    // auto 模式：自动允许只读工具，非只读走 checkPermissions
    if (mode === 'auto' && tool.isReadOnly(args)) {
      return { behavior: 'allow' };
    }

    // 调用工具自定义权限检查
    return tool.checkPermissions(args, context);
  }

  /** 调用阶段：执行工具的 call 方法 + AbortSignal 监听 + 结果截断 */
  private async callPhase<Input, Output>(
    tool: BuiltTool<Input, Output>,
    args: Input,
    context: ToolUseContext,
    options?: ToolCallOptions
  ): Promise<ExecutorResult<Output>> {
    // 监听中断信号（先检查是否已经 aborted）
    if (context.abortController.signal.aborted) {
      const behavior = tool.interruptBehavior();
      return {
        result: {
          data: null as unknown as Output,
          error:
            behavior === 'block'
              ? `工具 "${tool.name}" 执行被中断（block 模式）`
              : `工具 "${tool.name}" 执行被中断`,
          metadata: { phase: 'call', interrupted: true }
        },
        interrupted: true
      };
    }

    const abortPromise = new Promise<never>((_, reject) => {
      context.abortController.signal.addEventListener(
        'abort',
        () => {
          reject(new Error(`工具 "${tool.name}" 执行被中断`));
        },
        { once: true }
      );
    });

    try {
      // 执行工具调用，同时监听中断
      const result = await Promise.race([tool.call(args, context), abortPromise]);

      // 截断结果（如果超过 maxResultSizeChars）
      const maxSize = options?.maxResultSizeChars ?? tool.maxResultSizeChars;
      const truncatedResult = this.truncateResult(result, maxSize);

      return { result: truncatedResult, interrupted: false };
    } catch (error) {
      if (context.abortController.signal.aborted) {
        // 根据 interruptBehavior 决定行为
        const behavior = tool.interruptBehavior();
        if (behavior === 'block') {
          // block 模式：返回错误结果而非抛出
          return {
            result: {
              data: null as unknown as Output,
              error: `工具 "${tool.name}" 执行被中断（block 模式）`,
              metadata: { phase: 'call', interrupted: true }
            },
            interrupted: true
          };
        }
        // cancel 模式：抛出中断错误（由调用方捕获）
        return {
          result: {
            data: null as unknown as Output,
            error: `工具 "${tool.name}" 执行被中断`,
            metadata: { phase: 'call', interrupted: true }
          },
          interrupted: true
        };
      }
      // 非中断错误：重新抛出
      throw error;
    }
  }

  /** 截断结果（超过 maxResultSizeChars 时截断并添加 metadata 标记） */
  private truncateResult<T>(result: ToolResult<T>, maxSize: number): ToolResult<T> {
    const dataStr = JSON.stringify(result.data);
    if (dataStr.length > maxSize) {
      return {
        ...result,
        metadata: {
          ...result.metadata,
          truncated: true,
          originalSize: dataStr.length,
          maxAllowedSize: maxSize
        }
      };
    }
    return result;
  }
}
