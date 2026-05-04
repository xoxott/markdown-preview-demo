/** Runtime权限引擎 — 封装PermissionDecisionEngine + Settings联动 + 模式切换控制 */

import {
  PermissionDecisionEngine,
  buildPermissionContextFromSettings,
  DEFAULT_TOOL_PERMISSION_CONTEXT,
  transitionPermissionMode
} from '@suga/ai-tool-core';
import type {
  AnyBuiltTool,
  ToolUseContext,
  ToolPermissionContext,
  PermissionUpdate,
  PermissionMode,
  PermissionResult,
  ModeTransitionResult,
  MergedSettings,
  SettingLayer,
  PermissionDecisionLogEntry,
  PermissionEvent
} from '@suga/ai-tool-core';
import { LLMPermissionClassifier } from '@suga/ai-tools';
import type { LLMClassifierConfig } from '@suga/ai-tools';

/**
 * RuntimePermissionEngine 构造选项
 */
export interface RuntimePermissionEngineConfig {
  /** 初始权限模式（默认 'default'） */
  readonly permissionMode?: PermissionMode;
  /** 是否绕过所有权限检查（默认 false） */
  readonly bypassPermissions?: boolean;
  /** LLM分类器配置（可选，auto模式使用） */
  readonly classifierConfig?: LLMClassifierConfig;
  /** SettingsLayerReader（可选，用于动态reload规则） */
  readonly settingsLayers?: readonly SettingLayer[];
  /** 合并后的settings（可选，提供时从settings提取规则） */
  readonly mergedSettings?: MergedSettings;
}

/**
 * 构建ToolPermissionContext — 从RuntimePermissionEngineConfig聚合权限配置
 *
 * 聚合来源:
 *
 * - permissionMode → permCtx.mode
 * - bypassPermissions → permCtx.bypassPermissions
 * - mergedSettings + settingsLayers → allow/deny/ask rules
 * - classifierConfig → classifierFn + ironGate
 *
 * @param config RuntimePermissionEngine配置
 * @returns ToolPermissionContext
 */
export function buildPermissionContext(config: RuntimePermissionEngineConfig): ToolPermissionContext {
  const mode = config.permissionMode ?? 'default';
  const bypassPermissions = config.bypassPermissions ?? false;

  // 从 mergedSettings 提取规则（如果提供）
  // 注意: baseCtx 从 default 模式开始构建（保证 transitionPermissionMode 正确触发 strip/restore）
  const targetMode = mode;
  let baseCtx: ToolPermissionContext = {
    ...DEFAULT_TOOL_PERMISSION_CONTEXT,
    mode: 'default', // 从 default 开始
    bypassPermissions
  };

  if (config.mergedSettings && config.settingsLayers) {
    baseCtx = buildPermissionContextFromSettings(
      config.mergedSettings,
      config.settingsLayers,
      baseCtx
    );
  }

  // 如果目标模式不是 default → 通过 transitionPermissionMode 切换（触发 strip/restore）
  if (targetMode !== 'default') {
    baseCtx = transitionPermissionMode(baseCtx, targetMode);
  }

  // bypassPermissions → 覆盖为 true
  if (bypassPermissions) {
    baseCtx = { ...baseCtx, bypassPermissions: true };
  }

  // classifierConfig → 构建 classifierFn + ironGate
  if (config.classifierConfig) {
    const classifierFn = new LLMPermissionClassifier(config.classifierConfig);
    baseCtx = {
      ...baseCtx,
      classifierFn,
      ironGate: config.classifierConfig.ironGate ?? { failClosed: false }
    };
  }

  return baseCtx;
}

/**
 * Runtime权限引擎 — 封装PermissionDecisionEngine + Settings联动
 *
 * 功能:
 *
 * - decidePermission(tool, args, context) → 调用 engine.decide
 * - switchMode(newMode) → 验证合法性 + engine.switchMode
 * - onSettingsChange(mergedSettings, layers) → 重新提取规则 → engine.applyUpdate(reloadFromSettings)
 * - onPermissionEvent(handler) → 注册事件处理器
 * - getPermissionContext() → 返回当前 permCtx
 * - getDecisionLog() → 返回审计日志
 */
export class RuntimePermissionEngine {
  private readonly engine: PermissionDecisionEngine;

  constructor(config: RuntimePermissionEngineConfig) {
    const permCtx = buildPermissionContext(config);
    this.engine = new PermissionDecisionEngine(permCtx);
  }

  /**
   * 权限决策
   */
  async decidePermission(
    tool: AnyBuiltTool,
    args: unknown,
    context: ToolUseContext
  ): Promise<PermissionResult> {
    return this.engine.decide(tool, args, context);
  }

  /**
   * 切换权限模式 — 验证合法性 + strip/restore
   */
  switchMode(newMode: PermissionMode): ModeTransitionResult {
    return this.engine.switchMode(newMode);
  }

  /**
   * Settings变更联动 — 重新提取规则并应用到 permCtx
   */
  onSettingsChange(mergedSettings: MergedSettings, settingsLayers: readonly SettingLayer[]): void {
    this.engine.applyUpdate({
      type: 'reloadFromSettings',
      merged: mergedSettings,
      sourceLayers: settingsLayers
    });
  }

  /**
   * 手动应用权限更新
   */
  applyUpdate(update: PermissionUpdate): void {
    this.engine.applyUpdate(update);
  }

  /**
   * 注册权限事件处理器
   */
  onPermissionEvent(handler: (event: PermissionEvent) => void): void {
    this.engine.onPermissionEvent(handler);
  }

  /**
   * 获取当前权限上下文
   */
  getPermissionContext(): ToolPermissionContext {
    return this.engine.getPermissionContext();
  }

  /**
   * 获取决策审计日志
   */
  getDecisionLog(): readonly PermissionDecisionLogEntry[] {
    return this.engine.getDecisionLog();
  }

  /**
   * 清空审计日志
   */
  resetDecisionLog(): void {
    this.engine.resetDecisionLog();
  }
}