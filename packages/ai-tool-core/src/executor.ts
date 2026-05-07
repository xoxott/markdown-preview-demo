/** 工具执行器（Tool Executor） 五阶段执行管线：验证 → PreHook → 权限(merged) → 调用 → PostHook */

import type { BuiltTool, ToolResult } from './types/tool';
import type { ToolCallOptions, ToolUseContext } from './types/context';
import type { HookPermissionDecision, PermissionMode, PermissionResult } from './types/permission';
import { hasPermissionsToUseTool, resolveHookPermissionWithPipeline } from './permission-pipeline';
import type { PermissionPipelineInput } from './types/permission-decision';

/** 执行器结果 */
export interface ExecutorResult<T = unknown> {
  /** 工具返回的结果 */
  result: ToolResult<T>;
  /** 执行是否被中断（权限询问或 AbortSignal 触发时为 true） */
  interrupted: boolean;
}

/**
 * 工具执行器（五阶段执行管线）
 *
 * 执行流程：
 *
 * 1. 前置检查（工具是否启用、是否被拒绝规则禁止）
 * 2. 验证阶段（Zod Schema 验证 + 自定义 validateInput）
 * 3. PreHook 阶段（从 ToolUseContext.meta 读取 P4 HookBeforeToolPhase 写入的决策）
 * 4. 权限阶段（合并 hook 决策 + 规则引擎决策，优先级: hook deny > settings deny > settings ask > hook allow）
 * 5. 调用阶段（执行工具的 call 方法 + AbortSignal 监听 + 结果截断）
 * 6. PostHook 阶段（从 ToolUseContext.meta 读取 P4 HookAfterToolPhase 写入的输出修改）
 *
 * PreHook 和 PostHook 通过 ToolUseContext.meta 桥接 P4 Hooks：
 *
 * - 无 meta 数据时完全跳过 Hook 阶段（向后兼容）
 * - 有 meta 数据时合并 Hook 决策到权限流程
 *
 * 权限阶段支持两种模式:
 *
 * - 有 permCtx → 使用新权限管线（hasPermissionsToUseTool 6步管线）
 * - 无 permCtx → 使用旧逻辑（legacyPermissionPhase，PermissionMode + checkPermissions）
 *
 * 参考 Claude Code 的 resolveHookPermissionDecision:
 *
 * - hook deny 绝对覆盖所有规则
 * - hook allow 不覆盖 settings deny/ask
 * - hook ask 强制用户确认
 * - hook passthrough 交由规则引擎
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

    // === 阶段 2：PreHook ===
    // 从 ToolUseContext.meta 读取 P4 HookBeforeToolPhase 写入的决策
    const hookDecision = this.preHookPhase(context, options);

    // 检查 hook preventContinuation → 直接终止
    if (hookDecision?.preventContinuation === true) {
      return {
        result: {
          data: null as unknown as Output,
          error: hookDecision.stopReason ?? 'Hook 阻止了执行',
          metadata: { phase: 'preHook', hookBlocked: true }
        },
        interrupted: false
      };
    }

    // 合并 hook 修改的输入（如果 hook 提供了 updatedInput）
    const hookModifiedArgs = hookDecision?.updatedInput
      ? ({ ...args, ...hookDecision.updatedInput } as Input)
      : args;

    // === 阶段 3：权限（合并 Hook + 规则引擎） ===
    if (!options?.skipPermissionCheck) {
      const permissionResult = await this.permissionPhase(tool, hookModifiedArgs, context, options);
      const mergedPermission = hookDecision
        ? resolveHookPermissionWithPipeline(hookDecision, permissionResult)
        : this.resolveHookPermission(hookDecision, permissionResult);

      if (mergedPermission.behavior === 'deny') {
        return {
          result: {
            data: null as unknown as Output,
            error: mergedPermission.message ?? `权限拒绝: 工具 "${tool.name}"`,
            metadata: {
              reason: mergedPermission.reason ?? mergedPermission.decisionReason,
              phase: 'permission',
              decisionSource: mergedPermission.decisionSource,
              hookBlocked: mergedPermission.decisionSource === 'hook'
            }
          },
          interrupted: false
        };
      }

      if (mergedPermission.behavior === 'ask') {
        return {
          result: {
            data: null as unknown as Output,
            error: mergedPermission.message,
            metadata: {
              permissionNeeded: true,
              askMessage: mergedPermission.message,
              phase: 'permission',
              decisionSource: mergedPermission.decisionSource
            }
          },
          interrupted: true
        };
      }

      // behavior === 'allow' 或 'passthrough' → 使用合并后的修正输入
      const finalArgs =
        mergedPermission.behavior === 'allow' && mergedPermission.updatedInput
          ? (mergedPermission.updatedInput as Input)
          : hookModifiedArgs;

      // === 阶段 4：调用 ===
      const callResult = await this.callPhase(tool, finalArgs, context, options);

      // === 阶段 5：PostHook ===
      return this.postHookPhase(tool, callResult, context, options);
    }

    // 跳过权限检查时直接调用 + PostHook
    const callResult = await this.callPhase(tool, hookModifiedArgs, context, options);
    return this.postHookPhase(tool, callResult, context, options);
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

    // 自定义 validateInput（语义校验，G11: await 异步验证）
    const customValidation = await tool.validateInput(parsedInput, context);
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
   * PreHook 阶段：从 ToolUseContext.meta 读取 P4 HookBeforeToolPhase 写入的决策
   *
   * 桥接协议:
   *
   * - ctx.meta.hookPermissionBehavior → hook 的权限行为
   * - ctx.meta.hookUpdatedInputs (Map<toolUseId, updatedInput>) → hook 修改的输入
   * - ctx.meta.hookPreventContinuation → hook 是否阻止继续
   * - ctx.meta.hookStopReason → hook 阻止原因
   *
   * 无 meta 数据时返回 undefined（跳过 Hook 阶段，向后兼容）。
   */
  private preHookPhase(
    context: ToolUseContext,
    options?: ToolCallOptions
  ): HookPermissionDecision | undefined {
    // 通过 interface merging，meta 现在是 ToolUseContext 的正式可选字段
    const meta = context.meta;
    if (!meta) return undefined;

    const permissionBehavior = meta.hookPermissionBehavior as
      | HookPermissionDecision['permissionBehavior']
      | undefined;
    const preventContinuation = meta.hookPreventContinuation as boolean | undefined;
    const stopReason = meta.hookStopReason as string | undefined;

    // 从 hookUpdatedInputs Map 中提取当前工具的输入修改
    const updatedInputs = meta.hookUpdatedInputs as
      | Map<string, Record<string, unknown>>
      | undefined;
    const toolUseId = options?.toolUseId;
    const hookUpdatedInput = toolUseId && updatedInputs ? updatedInputs.get(toolUseId) : undefined;

    if (
      permissionBehavior === undefined &&
      preventContinuation === undefined &&
      hookUpdatedInput === undefined
    ) {
      return undefined; // 无任何 hook 决策 → 跳过
    }

    return { permissionBehavior, updatedInput: hookUpdatedInput, preventContinuation, stopReason };
  }

  /**
   * 权限阶段 — 双分支逻辑
   *
   * 有 permCtx → 使用新权限管线（hasPermissionsToUseTool 6步管线） 无 permCtx → 使用旧逻辑（legacyPermissionPhase）
   */
  private async permissionPhase<Input, Output>(
    tool: BuiltTool<Input, Output>,
    args: Input,
    context: ToolUseContext,
    options?: ToolCallOptions
  ): Promise<PermissionResult> {
    const permCtx = context.permCtx;

    // 有 permCtx → 使用新管线
    if (permCtx) {
      // P41: requiresUserInteraction — 优先使用工具自身标记，否则使用 context 传入的值
      const toolRequiresInteraction = tool.requiresUserInteraction(args);
      const requiresUserInteraction =
        toolRequiresInteraction || (context.requiresUserInteraction ?? false);

      const pipelineInput: PermissionPipelineInput = {
        tool: tool as BuiltTool<unknown, unknown>,
        args,
        context,
        permCtx,
        canUseToolFn: context.canUseToolFn,
        promptHandler: context.promptHandler,
        denialTracking: context.denialTracking,
        requiresUserInteraction,
        isHeadlessAgent: context.isHeadlessAgent
      };

      return hasPermissionsToUseTool(pipelineInput);
    }

    // 无 permCtx → 使用旧逻辑（向后兼容）
    return this.legacyPermissionPhase(tool, args, context, options);
  }

  /**
   * 旧权限阶段逻辑 — PermissionMode + checkPermissions
   *
   * 保留此方法确保无 permCtx 时行为不变。
   */
  private async legacyPermissionPhase<Input, Output>(
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
        reason: 'restricted_mode_non_readonly',
        decisionSource: 'mode'
      };
    }

    // auto 模式：自动允许只读工具
    if (mode === 'auto' && tool.isReadOnly(args)) {
      return { behavior: 'allow', decisionSource: 'mode' };
    }

    // 调用工具自定义权限检查（G11: await 异步权限）
    return await tool.checkPermissions(args, context);
  }

  /**
   * 合并 Hook 决策 + Permission 决策（旧版逻辑）
   *
   * 当 hookDecision 不为 undefined 且有新管线时， 使用 resolveHookPermissionWithPipeline。 否则使用此旧版逻辑。
   *
   * 优先级规则（与 Claude Code resolveHookPermissionDecision 一致）:
   *
   * - hook deny → 绝对覆盖（跳过所有规则检查）
   * - hook allow → 不覆盖 settings deny/ask（规则优先）
   * - hook ask → 强制用户确认
   * - hook passthrough → 交由规则引擎（正常权限流程）
   * - 无 hook → 纯 permission 决策
   */
  private resolveHookPermission(
    hookDecision: HookPermissionDecision | undefined,
    permissionResult: PermissionResult
  ): PermissionResult {
    if (!hookDecision || hookDecision.permissionBehavior === undefined) {
      return permissionResult;
    }

    const { permissionBehavior } = hookDecision;

    // hook deny → 绝对覆盖
    if (permissionBehavior === 'deny') {
      return {
        behavior: 'deny',
        message: hookDecision.stopReason ?? 'Hook 阻止了执行',
        decisionSource: 'hook',
        decisionReason: 'pre_tool_use_hook_deny'
      };
    }

    // hook allow → 规则 deny/ask 可覆盖
    if (permissionBehavior === 'allow') {
      if (permissionResult.behavior === 'deny') return permissionResult;
      if (permissionResult.behavior === 'ask') return permissionResult;
      return {
        behavior: 'allow',
        updatedInput: hookDecision.updatedInput,
        decisionSource: 'hook',
        decisionReason: 'pre_tool_use_hook_allow'
      };
    }

    // hook ask → 强制用户确认
    if (permissionBehavior === 'ask') {
      return {
        behavior: 'ask',
        message: hookDecision.stopReason ?? 'Hook 要求用户确认',
        decisionSource: 'hook',
        decisionReason: 'pre_tool_use_hook_ask'
      };
    }

    // hook passthrough → 交由规则引擎
    return permissionResult;
  }

  /**
   * PostHook 阶段：从 ToolUseContext.meta 读取 P4 HookAfterToolPhase 写入的输出修改
   *
   * 桥接协议:
   *
   * - ctx.meta.hookUpdatedOutputs (Map<toolUseId, updatedOutput>) → hook 修改的输出
   *
   * 无 meta 数据时返回原始结果（向后兼容）。
   */
  private postHookPhase<Input, Output>(
    _tool: BuiltTool<Input, Output>,
    executorResult: ExecutorResult<Output>,
    context: ToolUseContext,
    options?: ToolCallOptions
  ): ExecutorResult<Output> {
    const meta = context.meta;
    if (!meta) return executorResult;

    const updatedOutputs = meta.hookUpdatedOutputs as Map<string, unknown> | undefined;
    if (!updatedOutputs) return executorResult;

    // 从 hookUpdatedOutputs Map 中提取当前工具的输出修改
    const toolUseId = options?.toolUseId;
    if (!toolUseId) return executorResult;

    const hookUpdatedOutput = updatedOutputs.get(toolUseId);
    if (hookUpdatedOutput === undefined) return executorResult;

    // 修改工具结果的数据
    return {
      ...executorResult,
      result: {
        ...executorResult.result,
        data: hookUpdatedOutput as Output,
        metadata: {
          ...executorResult.result.metadata,
          hookModifiedOutput: true
        }
      }
    };
  }

  /** 调用阶段：执行工具的 call 方法 + AbortSignal 监听 + 结果截断 */
  private async callPhase<Input, Output>(
    tool: BuiltTool<Input, Output>,
    args: Input,
    context: ToolUseContext,
    options?: ToolCallOptions
  ): Promise<ExecutorResult<Output>> {
    // 监听中断信号
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
      const result = await Promise.race([tool.call(args, context), abortPromise]);
      const maxSize = options?.maxResultSizeChars ?? tool.maxResultSizeChars;
      const truncatedResult = this.truncateResult(result, maxSize);
      return { result: truncatedResult, interrupted: false };
    } catch (error) {
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
      throw error;
    }
  }

  /** 截断结果 */
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
