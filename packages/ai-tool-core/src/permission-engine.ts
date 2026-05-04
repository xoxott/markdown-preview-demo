/** 权限决策引擎（Permission Decision Engine） 封装权限管线+审计日志+事件发射+模式切换 */

import type { PermissionAllow, PermissionResult } from './types/permission';
import type {
  CanUseToolFn,
  DenialTrackingState,
  PermissionPipelineInput
} from './types/permission-decision';
import type { PermissionUpdate, ToolPermissionContext } from './types/permission-context';
import type { ModeTransitionResult, PermissionMode } from './types/permission-mode';
import type { PermissionEvent } from './types/permission-events';
import { validateModeTransition } from './types/permission-mode';
import { hasPermissionsToUseTool } from './permission-pipeline';
import { applyPermissionUpdate } from './types/permission-context';
import { transitionPermissionMode } from './types/permission-strip';
import type { PermissionPromptHandler } from './types/permission-prompt';
import type { IronGate, PermissionClassifier } from './types/permission-classifier';
import type { AnyBuiltTool, ToolUseContext } from './types';

/** 决策审计日志条目 — 记录每次权限决策的完整信息 */
export interface PermissionDecisionLogEntry {
  /** 决策时间戳 */
  readonly timestamp: number;
  /** 工具名称 */
  readonly toolName: string;
  /** 当前权限模式 */
  readonly mode: PermissionMode;
  /** 权限决策结果 */
  readonly result: PermissionResult;
  /** 决策耗时（毫秒） */
  readonly durationMs: number;
}

/** 权限决策引擎构造选项 */
export interface PermissionDecisionEngineOptions {
  /** AI 分类器（可选，auto 模式使用） */
  readonly classifierFn?: PermissionClassifier;
  /** Iron Gate 门控（可选，分类器不可用时的安全策略） */
  readonly ironGate?: IronGate;
  /** 用户确认交互接口（可选） */
  readonly promptHandler?: PermissionPromptHandler;
  /** 用户确认函数（向后兼容 boolean 版） */
  readonly canUseToolFn?: CanUseToolFn;
  /** 拒绝追踪初始状态（可选） */
  readonly denialTracking?: DenialTrackingState;
  /** 是否为 headless agent（可选） */
  readonly isHeadlessAgent?: boolean;
}

/**
 * 权限决策引擎 — 封装 hasPermissionsToUseTool 管线的可实例化引擎
 *
 * 参考 Claude Code 的权限决策整体架构:
 *
 * - permCtx: 权限上下文容器（不可变，通过 applyUpdate 替换）
 * - 审计日志: 记录每次决策的完整信息
 * - 事件发射: 在关键节点通知宿主
 * - 模式切换: 验证合法性 + 自动 strip/restore
 *
 * 使用示例:
 *
 * ```ts
 * const engine = new PermissionDecisionEngine(permCtx, {
 *   classifierFn: yoloClassifier,
 *   promptHandler: terminalPromptHandler
 * });
 *
 * const result = await engine.decide(tool, args, context);
 * engine.applyUpdate({ type: 'addRules', rules: [...] });
 * engine.switchMode('acceptEdits');
 * ```
 */
export class PermissionDecisionEngine {
  private permCtx: ToolPermissionContext;
  private readonly options: PermissionDecisionEngineOptions;
  private readonly decisionLog: PermissionDecisionLogEntry[] = [];
  private readonly eventHandlers: ((event: PermissionEvent) => void)[] = [];

  constructor(
    initialPermCtx: ToolPermissionContext,
    options: PermissionDecisionEngineOptions = {}
  ) {
    this.permCtx = initialPermCtx;
    this.options = options;
  }

  // === 权限决策 ===

  /**
   * 权限决策 — 联用 hasPermissionsToUseTool 8+步管线
   *
   * @param tool 目标工具
   * @param args 工具输入参数
   * @param context 工具使用上下文
   * @returns 权限决策结果
   */
  async decide(
    tool: AnyBuiltTool,
    args: unknown,
    context: ToolUseContext
  ): Promise<PermissionResult> {
    const startTime = Date.now();

    // 构建管线输入
    const pipelineInput: PermissionPipelineInput = {
      tool,
      args,
      context,
      permCtx: this.permCtx,
      canUseToolFn: this.options.canUseToolFn,
      promptHandler: this.options.promptHandler,
      denialTracking: this.options.denialTracking,
      requiresUserInteraction:
        tool.requiresUserInteraction(args) || (context.requiresUserInteraction ?? false),
      isHeadlessAgent: this.options.isHeadlessAgent ?? context.isHeadlessAgent
    };

    const result = await hasPermissionsToUseTool(pipelineInput);
    const durationMs = Date.now() - startTime;

    // 记录审计日志
    const logEntry: PermissionDecisionLogEntry = {
      timestamp: startTime,
      toolName: tool.name,
      mode: this.permCtx.mode,
      result,
      durationMs
    };
    this.decisionLog.push(logEntry);

    // 发射事件
    this.emitEvent({
      type: 'permission_decided',
      toolName: tool.name,
      mode: this.permCtx.mode,
      result,
      timestamp: startTime
    });

    // 如果决策产生 PermissionUpdate（PermissionAllow.permissionUpdate），自动应用
    if (result.behavior === 'allow') {
      const allowResult = result as PermissionAllow;
      if (allowResult.permissionUpdate) {
        this.applyUpdate(allowResult.permissionUpdate);
      }
    }

    return result;
  }

  // === 权限上下文管理 ===

  /**
   * 应用权限更新 — 不可变替换 permCtx
   *
   * @param update 权限更新操作
   */
  applyUpdate(update: PermissionUpdate): void {
    this.permCtx = applyPermissionUpdate(this.permCtx, update);

    // 发射规则更新事件
    this.emitEvent({
      type: 'permission_rules_updated',
      update,
      timestamp: Date.now()
    });
  }

  /** 获取当前权限上下文 */
  getPermissionContext(): ToolPermissionContext {
    return this.permCtx;
  }

  // === 模式切换 ===

  /**
   * 切换权限模式 — 自动验证合法性 + strip/restore
   *
   * @param newMode 目标模式
   * @returns 切换结果（如果非法则返回 valid=false）
   */
  switchMode(newMode: PermissionMode): ModeTransitionResult {
    const transition = validateModeTransition(this.permCtx.mode, newMode);

    if (!transition.valid) {
      return transition;
    }

    const oldMode = this.permCtx.mode;

    // 使用 transitionPermissionMode 自动处理 strip/restore
    this.permCtx = transitionPermissionMode(this.permCtx, newMode);

    // 发射模式切换事件
    this.emitEvent({
      type: 'permission_mode_changed',
      from: oldMode,
      to: newMode,
      timestamp: Date.now()
    });

    return transition;
  }

  // === 审计日志 ===

  /** 获取决策审计日志 */
  getDecisionLog(): readonly PermissionDecisionLogEntry[] {
    return this.decisionLog;
  }

  /** 清空审计日志 */
  resetDecisionLog(): void {
    this.decisionLog.length = 0;
  }

  // === 事件发射 ===

  /** 注册权限事件处理器 */
  onPermissionEvent(handler: (event: PermissionEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /** 发射权限事件 — 通知所有注册的处理器 */
  private emitEvent(event: PermissionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // 事件处理器异常不影响引擎流程
      }
    }
  }
}
