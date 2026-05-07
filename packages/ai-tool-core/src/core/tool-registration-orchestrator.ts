/**
 * 工具注册编排器 — 条件注册/feature-gated工具
 *
 * N12: 对齐 CC tools.ts 中的工具注册编排逻辑 支持条件注册、feature gate、动态工具列表等。
 */

// ============================================================
// 类型定义
// ============================================================

/** 工具注册条件 */
export type ToolRegistrationCondition =
  | 'always' // 始终注册
  | 'feature_gate' // 需 feature flag 启用
  | 'platform_specific' // 仅在特定平台注册
  | 'session_mode' // 仅在特定会话模式注册
  | 'non_interactive'; // 仅非交互session注册

/** 工具注册规则 */
export interface ToolRegistrationRule {
  readonly toolName: string;
  readonly condition: ToolRegistrationCondition;
  readonly featureKey?: string;
  readonly platform?: string;
  readonly sessionMode?: string;
}

/** 工具注册编排器 — 管理条件注册逻辑 */
export class ToolRegistrationOrchestrator {
  private readonly rules = new Map<string, ToolRegistrationRule>();

  /** 注册一个工具规则 */
  addRule(rule: ToolRegistrationRule): void {
    this.rules.set(rule.toolName, rule);
  }

  /** 批量注册规则 */
  addRules(rules: readonly ToolRegistrationRule[]): void {
    for (const rule of rules) this.addRule(rule);
  }

  /** 判断工具是否应注册（基于当前上下文） */
  shouldRegister(
    toolName: string,
    context?: {
      features?: ReadonlySet<string>;
      platform?: string;
      sessionMode?: string;
      isNonInteractive?: boolean;
    }
  ): boolean {
    const rule = this.rules.get(toolName);

    // 无规则 → 默认注册
    if (!rule) return true;

    switch (rule.condition) {
      case 'always':
        return true;
      case 'feature_gate':
        return context?.features?.has(rule.featureKey ?? '') ?? false;
      case 'platform_specific':
        return context?.platform === rule.platform;
      case 'session_mode':
        return context?.sessionMode === rule.sessionMode;
      case 'non_interactive':
        return context?.isNonInteractive ?? false;
      default:
        return true;
    }
  }

  /** 获取所有应注册的工具名称 */
  getRegisteredToolNames(context?: {
    features?: ReadonlySet<string>;
    platform?: string;
    sessionMode?: string;
    isNonInteractive?: boolean;
  }): readonly string[] {
    const result: string[] = [];
    for (const [toolName] of this.rules) {
      if (this.shouldRegister(toolName, context)) {
        result.push(toolName);
      }
    }
    return result;
  }

  /** 获取规则数量 */
  get size(): number {
    return this.rules.size;
  }

  /** 清空所有规则 */
  reset(): void {
    this.rules.clear();
  }
}
