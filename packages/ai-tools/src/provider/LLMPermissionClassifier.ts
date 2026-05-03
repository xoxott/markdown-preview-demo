/**
 * LLMPermissionClassifier — 两阶段LLM权限分类器
 *
 * P37: 参考 Claude Code 的 YOLO 分类器 (yoloClassifier.ts)，实现 fast→thinking 两阶段分类。
 *
 * 设计原则:
 *
 * - 宿主注入: callModelFn 由宿主环境提供，ai-tools 不依赖具体 LLM SDK
 * - 两阶段: Stage 1 快速判断 (allow/block)，不确定时升级 Stage 2 thinking 推理
 * - 失败封闭: API 错误 → unavailable 标记 → Iron Gate 门控决策
 *
 * Stage 1 (fast): 精简 prompt + 64 tokens → 快速 allow/block
 *
 * - allow → 直接返回，跳过 Stage 2
 * - block → 升级 Stage 2 确认（避免误判）
 * - 不可解析 → 升级 Stage 2
 *
 * Stage 2 (thinking): 完整 prompt + 4096 tokens → chain-of-thought 推理
 *
 * - 最终决策: deny 或 ask（带详细 reason）
 * - 不可解析 → unavailable + Iron Gate
 */

import type {
  ClassifierResult,
  IronGate,
  PermissionClassifier,
  ToolClassifierInput
} from '@suga/ai-tool-core';
import { classifyBashCommand } from './BashCommandClassifier';

// ========== 类型定义 ==========

/** LLM 调用请求 — 宿主环境的 callModel 函数接收此结构 */
export interface ClassifierModelRequest {
  /** 使用的模型名 */
  readonly model: string;
  /** System prompt */
  readonly systemPrompt: string;
  /** 用户内容（分类器输入序列化） */
  readonly userContent: string;
  /** 最大输出 tokens */
  readonly maxTokens: number;
  /** 温度 */
  readonly temperature: number;
  /** 中断信号 */
  readonly signal?: AbortSignal;
}

/** LLM 调用响应 — callModel 函数返回此结构 */
export interface ClassifierModelResponse {
  /** 模型输出文本内容 */
  readonly content: string;
  /** 实际使用的模型名 */
  readonly model: string;
  /** token 用量（可选，用于遥测） */
  readonly usage?: { readonly inputTokens: number; readonly outputTokens: number };
  /** API 不可用标记（429/500/网络错误等） */
  readonly unavailable?: boolean;
  /** 转录过长标记（context window overflow） */
  readonly transcriptTooLong?: boolean;
}

/** 宿主注入的 LLM 调用函数签名 */
export type CallModelFn = (request: ClassifierModelRequest) => Promise<ClassifierModelResponse>;

/** LLM 分类器配置 */
export interface LLMClassifierConfig {
  /** LLM 调用函数（宿主注入） */
  readonly callModel: CallModelFn;
  /** 分类器模型名（默认 'claude-haiku-4-5-20251001'） */
  readonly model?: string;
  /** 是否启用 thinking 阶段（默认 true） */
  readonly enableThinking?: boolean;
  /** Iron Gate 门控（默认 fail-open） */
  readonly ironGate?: IronGate;
}

// ========== 分类器 Prompt 模板 ==========

/** Stage 1 (fast) 精简 system prompt */
const FAST_SYSTEM_PROMPT = `You are a tool permission classifier. Decide whether the tool action should be ALLOWED or BLOCKED.

Safety rules:
- ALLOW: read-only operations (file reads, glob, grep, ls, web fetch for info)
- BLOCK: destructive operations (file writes, file edits, bash commands with side effects, deleting resources)
- BLOCK: network operations that modify external state (git push, API calls with mutations)

Output exactly one word: ALLOW or BLOCK. No explanation needed.`;

/** Stage 2 (thinking) 完整 system prompt */
const THINKING_SYSTEM_PROMPT = `You are a tool permission classifier performing a detailed safety analysis.

Your task: Given a tool action, decide whether it should be ALLOWED, BLOCKED, or requires user confirmation (ASK).

Safety classification rules:

ALLOW (auto-approve):
- Read-only file operations: read, glob, grep, ls
- Read-only network operations: web fetch for information
- Non-destructive queries: task list, team list, config read
- Safe bash commands: ls, cat, head, tail, grep, find, echo (no side effects)

BLOCK (auto-deny):
- Destructive file operations: write, edit, delete, move
- Destructive bash commands: rm, git push, npm publish, pip install
- Operations that modify external state: API POST/PUT/DELETE
- Operations affecting shared resources: team delete, config modify

ASK (require user confirmation):
- Bash commands with unclear intent (could be safe or destructive)
- File edits to critical files (config files, CI/CD pipelines)
- Network operations with ambiguous effects

Output format:
<decision>ALLOW</decision> or <decision>BLOCK</decision> or <decision>ASK</decision>
<reason>Brief explanation of why</reason>`;

/** Stage 1 快速判断后缀 */
const FAST_SUFFIX = '\n\nClassify the above action: ALLOW or BLOCK?';

/** Stage 2 thinking 后缀 */
const THINKING_SUFFIX =
  '\n\nPerform a detailed safety analysis of the above action. Output your decision in the specified format.';

// ========== 解析辅助 ==========

/** 从 Stage 1 文本解析 fast 决策 */
function parseFastDecision(text: string): 'allow' | 'block' | null {
  const normalized = text.trim().toUpperCase();
  if (normalized.includes('ALLOW')) return 'allow';
  if (normalized.includes('BLOCK')) return 'block';
  return null;
}

/** 从 Stage 2 文本解析 thinking 决策 */
function parseThinkingDecision(text: string): {
  behavior: 'allow' | 'deny' | 'ask';
  reason: string;
} | null {
  // 尝试 XML 格式解析
  const decisionMatch = text.match(/<decision>(ALLOW|BLOCK|ASK)<\/decision>/i);
  const reasonMatch = text.match(/<reason>(.*?)<\/reason>/i);

  if (!decisionMatch) {
    // 回退到关键词匹配
    const normalized = text.trim().toUpperCase();
    if (normalized.includes('ALLOW')) {
      return {
        behavior: 'allow',
        reason: reasonMatch?.[1] ?? 'Allowed by thinking classifier'
      };
    }
    if (normalized.includes('BLOCK')) {
      return {
        behavior: 'deny',
        reason: reasonMatch?.[1] ?? 'Blocked by thinking classifier'
      };
    }
    if (normalized.includes('ASK')) {
      return {
        behavior: 'ask',
        reason: reasonMatch?.[1] ?? 'Classifier suggests user confirmation'
      };
    }
    return null;
  }

  const decision = decisionMatch[1].toUpperCase();
  const reason = reasonMatch?.[1] ?? 'No reason provided';

  switch (decision) {
    case 'ALLOW':
      return { behavior: 'allow', reason };
    case 'BLOCK':
      return { behavior: 'deny', reason };
    case 'ASK':
      return { behavior: 'ask', reason };
    default:
      return null;
  }
}

// ========== 分类器实现 ==========

/** 默认模型 */
const DEFAULT_CLASSIFIER_MODEL = 'claude-haiku-4-5-20251001';

/**
 * LLM 权限分类器 — 两阶段 fast→thinking 分类
 *
 * 参考 Claude Code yoloClassifier.ts:
 *
 * - Stage 1: 快速 allow/block（64 tokens, temperature 0）
 * - Stage 2: thinking 推理（4096 tokens, chain-of-thought）
 * - 失败封闭: API 错误 → unavailable → Iron Gate
 */
export class LLMPermissionClassifier implements PermissionClassifier {
  readonly name = 'yolo-llm';

  private readonly callModel: CallModelFn;
  private readonly model: string;
  private readonly enableThinking: boolean;
  private readonly ironGate: IronGate;

  constructor(config: LLMClassifierConfig) {
    this.callModel = config.callModel;
    this.model = config.model ?? DEFAULT_CLASSIFIER_MODEL;
    this.enableThinking = config.enableThinking ?? true;
    this.ironGate = config.ironGate ?? { failClosed: false };
  }

  async classify(input: ToolClassifierInput): Promise<ClassifierResult> {
    // ===== P38: Bash确定性快速路径 =====
    // 在调用LLM之前，先尝试确定性规则分类bash命令
    // 确定性allow/deny直接返回，跳过LLM API调用
    // 模糊命令(ask)继续走LLM两阶段分类
    if (input.toolName === 'bash') {
      const bashInput = input.input as { command?: string } | null;
      if (bashInput?.command) {
        const bashResult = classifyBashCommand(bashInput.command);
        if (bashResult.decision !== 'ask') {
          return {
            behavior: bashResult.decision === 'allow' ? 'allow' : 'deny',
            reason: bashResult.reason,
            confidence: bashResult.confidence
          };
        }
        // ask → 继续走LLM两阶段分类（与当前逻辑相同）
      }
    }

    const abortController = new AbortController();

    // 序列化分类器输入为用户内容
    const userContent = this.serializeInput(input);

    // ========== Stage 1 (fast) ==========

    try {
      const fastResult = await this.callModel({
        model: this.model,
        systemPrompt: FAST_SYSTEM_PROMPT,
        userContent: userContent + FAST_SUFFIX,
        maxTokens: 64,
        temperature: 0,
        signal: abortController.signal
      });

      // API 不可用 → unavailable + Iron Gate
      if (fastResult.unavailable) {
        return this.handleUnavailable(fastResult.transcriptTooLong);
      }

      const fastDecision = parseFastDecision(fastResult.content);

      // fast allow → 直接返回（最快路径）
      if (fastDecision === 'allow') {
        return {
          behavior: 'allow',
          reason: 'Allowed by fast classifier',
          confidence: 'medium'
        };
      }

      // fast block → 升级 Stage 2 确认（避免误判）
      // fast 不可解析 → 升级 Stage 2
      if (!this.enableThinking) {
        // thinking 阶段禁用 → fast 决策为最终决策
        if (fastDecision === 'block') {
          return {
            behavior: 'deny',
            reason: 'Blocked by fast classifier',
            confidence: 'low'
          };
        }
        // 不可解析 → fail-closed（安全优先）
        return {
          behavior: 'deny',
          reason: 'Classifier stage 1 unparseable - blocking for safety',
          confidence: 'low'
        };
      }

      // ========== Stage 2 (thinking) ==========

      try {
        const thinkingResult = await this.callModel({
          model: this.model,
          systemPrompt: THINKING_SYSTEM_PROMPT,
          userContent: userContent + THINKING_SUFFIX,
          maxTokens: 4096,
          temperature: 0,
          signal: abortController.signal
        });

        // API 不可用 → unavailable + Iron Gate
        if (thinkingResult.unavailable) {
          return this.handleUnavailable(thinkingResult.transcriptTooLong);
        }

        const thinkingParsed = parseThinkingDecision(thinkingResult.content);

        if (thinkingParsed) {
          return {
            behavior: thinkingParsed.behavior,
            reason: thinkingParsed.reason,
            confidence: 'high'
          };
        }

        // Stage 2 不可解析 → unavailable
        return this.handleUnavailable(false);
      } catch {
        // Stage 2 API 错误 → unavailable
        return this.handleUnavailable(false);
      }
    } catch {
      // Stage 1 API 错误 → unavailable + Iron Gate
      return this.handleUnavailable(false);
    }
  }

  /** 处理不可用情况 — Iron Gate 决策 */
  private handleUnavailable(transcriptTooLong?: boolean): ClassifierResult {
    if (this.ironGate.failClosed) {
      return {
        behavior: 'deny',
        reason: 'Classifier unavailable, Iron Gate fail-closed denying',
        confidence: 'low',
        unavailable: true
      };
    }

    // fail-open: 标记 unavailable 但不决策，让后续权限步骤继续
    return {
      behavior: 'ask',
      reason: transcriptTooLong
        ? 'Classifier transcript too long, falling back to user confirmation'
        : 'Classifier unavailable, falling back to user confirmation',
      confidence: 'low',
      unavailable: true,
      transcriptTooLong
    };
  }

  /** 序列化分类器输入为 LLM 可读文本 — 静态方法避免 class-methods-use-this */
  // eslint-disable-next-line class-methods-use-this
  private serializeInput(input: ToolClassifierInput): string {
    const parts: string[] = [];

    parts.push(`Tool: ${input.toolName}`);

    if (input.isReadOnly) {
      parts.push('Operation type: READ-ONLY');
    } else if (input.isDestructive) {
      parts.push('Operation type: DESTRUCTIVE');
    } else {
      parts.push('Operation type: MODIFY');
    }

    parts.push(`Safety label: ${input.safetyLabel}`);

    // 工具输入参数（安全投影）
    if (input.input !== undefined && input.input !== null) {
      try {
        const inputStr = JSON.stringify(input.input);
        // 限制输入长度避免超长 prompt
        const truncated = inputStr.length > 2000 ? `${inputStr.slice(0, 2000)}...` : inputStr;
        parts.push(`Input: ${truncated}`);
      } catch {
        parts.push('Input: [unserializable]');
      }
    }

    return parts.join('\n');
  }
}
