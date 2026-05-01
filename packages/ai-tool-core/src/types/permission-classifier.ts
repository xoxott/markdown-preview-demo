/** 权限分类器类型定义（Permission Classifier Types） AI分类器接口、结果类型、Iron Gate门控 */

import type { SafetyLabel } from './permission';

/**
 * 工具分类器输入 — 从工具投影出分类器所需的信息
 *
 * 参考 Claude Code 的 Tool.toAutoClassifierInput: 将工具的关键安全信息投影为分类器可消费的输入结构， 用于 AI 分类器判断是否应自动允许或阻止执行。
 *
 * 最小信息暴露原则: 只暴露安全相关信息，不暴露完整工具输入。
 */
export interface ToolClassifierInput {
  /** 工具名称 */
  readonly toolName: string;
  /** 工具输入参数（安全相关投影，非完整输入） */
  readonly input: unknown;
  /** 安全标签 */
  readonly safetyLabel: SafetyLabel;
  /** 是否只读操作 */
  readonly isReadOnly: boolean;
  /** 是否破坏性操作 */
  readonly isDestructive: boolean;
}

/**
 * 分类器结果 — PermissionClassifier 的输出
 *
 * 参考 Claude Code 的 ClassifierResult + YoloClassifierResult:
 *
 * - behavior: 分类器决策（allow/deny/ask）
 * - confidence: 置信度（high/medium/low）
 * - unavailable: 分类器不可用（API错误等）时的标记
 * - transcriptTooLong: 转录过长导致分类器无法评估
 */
export interface ClassifierResult {
  /** 分类器决策行为 */
  readonly behavior: 'allow' | 'deny' | 'ask';
  /** 决策原因 */
  readonly reason: string;
  /** 置信度 */
  readonly confidence: 'high' | 'medium' | 'low';
  /** 分类器是否不可用（API错误等） — 触发 Iron Gate */
  readonly unavailable?: boolean;
  /** 转录是否过长（上下文溢出） — 触发 fallback */
  readonly transcriptTooLong?: boolean;
}

/**
 * PermissionClassifier 接口 — 宿主注入的 AI 分类器实现
 *
 * 参考 Claude Code 的 YOLO 分类器 (yoloClassifier.ts): 两阶段分类（fast→thinking），宿主环境实现 LLM 调用逻辑。
 *
 * 依赖注入: ai-tool-core 不实现 LLM 调用，仅定义接口。 宿主通过 ToolPermissionContext.classifierFn 注入具体实现。
 */
export interface PermissionClassifier {
  /** 分类器名称标识（如 'yolo', 'bash-classifier'） */
  readonly name: string;
  /**
   * 分类工具是否应被自动允许
   *
   * @param input 工具分类器输入（由 tool.toAutoClassifierInput 生成）
   * @returns 分类器结果
   */
  classify(input: ToolClassifierInput): Promise<ClassifierResult>;
}

/**
 * Iron Gate 门控接口 — 分类器不可用时的安全策略选择
 *
 * 参考 Claude Code 的 tengu_iron_gate_closed:
 *
 * - fail-closed: 分类器宕机时拒绝所有操作（保守安全）
 * - fail-open: 分类器宕机时退回正常权限弹窗（用户仍可控）
 *
 * 宿主可通过 ToolPermissionContext.ironGate 注入门控配置。
 */
export interface IronGate {
  /** 分类器不可用时是否 fail-closed（拒绝所有） */
  readonly failClosed: boolean;
}
