/**
 * SpeculativeClassifierCheck — 提前启动 classifier 竞速窗口
 *
 * 参考 Claude Code 的 bashPermissions.ts:
 *
 * 在 LLM stream 开始前（CallModelPhase 收到 tool_use block 时）， 提前启动 bash classifier，让它在用户对话框弹出前就有结果。
 *
 * 当 useCanUseTool 到达 Path 6 时，通过 peek 获取预启动的 Promise， 与 2 秒超时竞速：如果 classifier 在 2s 内返回高置信度
 * allow，直接批准。
 *
 * 生命周期:
 *
 * 1. startSpeculativeCheck(command) — CallModelPhase 收到 bash tool_use 时调用 → 提前启动 classifyBashCommand +
 *    classifierFn.classify → 结果存入 speculativeChecks Map
 * 2. peekSpeculativeCheck(command) — canUseToolV3 Path 6 获取预启动 Promise → 不消费，只 peek（不删除 Map entry）
 * 3. consumeSpeculativeCheck(command) — 如果 speculative 赢了竞速 → 消费并删除 Map entry
 * 4. clearSpeculativeChecks() — 清理所有预启动结果 → agent turn 结束时调用
 *
 * guard 条件（与 Claude Code 一致）:
 *
 * - classifierFn 必须存在
 * - mode !== 'bypassPermissions'
 * - 仅对 bash 工具启动
 */

import type { ClassifierResult, PermissionClassifier } from '../types/permission-classifier';
import type { PermissionMode } from '../types/permission-mode';

/** 预启动的 speculative classifier 检查存储 */
const speculativeChecks: Map<string, Promise<ClassifierResult>> = new Map();

/**
 * ClassifierResultCache — classifier 结果缓存
 *
 * 相同 tool+input 组合复用 classifier 结果，避免重复 API 调用。 缓存条目有过期时间（默认 5 分钟），过期后重新调用 classifier。
 *
 * 参考 Claude Code 的 classifier 缓存策略:
 *
 * - bash 命令: 按命令字符串缓存（命令不变 → 结果不变）
 * - 其他工具: 按 toolName + JSON(input) 缓存
 * - 高置信度 allow/deny 缓存时间更长（10 分钟）
 * - 低置信度 ask 缓存时间更短（1 分钟）
 */
export class ClassifierResultCache {
  private readonly cache: Map<string, { result: ClassifierResult; expiresAt: number }> = new Map();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = 300_000) {
    // 5 分钟默认
    this.defaultTtlMs = defaultTtlMs;
  }

  /** 生成缓存 key — toolName + input hash */
  static buildCacheKey(toolName: string, input: unknown): string {
    // bash 工具直接用 command 字符串作为 key
    if (toolName === 'bash' && typeof input === 'object' && input !== null) {
      const command = (input as Record<string, unknown>).command;
      if (typeof command === 'string') {
        return `bash:${command}`;
      }
    }
    // 其他工具: toolName + JSON(input)
    return `${toolName}:${JSON.stringify(input)}`;
  }

  /** 获取缓存结果（如果未过期） */
  get(key: string): ClassifierResult | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.result;
  }

  /** 存入缓存结果（根据置信度调整 TTL） */
  set(key: string, result: ClassifierResult): void {
    let ttlMs = this.defaultTtlMs;

    // 高置信度结果缓存更久
    if (result.confidence === 'high') {
      ttlMs = 600_000; // 10 分钟
    } else if (result.confidence === 'low') {
      ttlMs = 60_000; // 1 分钟
    }

    // unavailable/transcriptTooLong 不缓存
    if (result.unavailable || result.transcriptTooLong) {
      return;
    }

    this.cache.set(key, { result, expiresAt: Date.now() + ttlMs });
  }

  /** 清理过期条目 */
  purge(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /** 清空缓存 */
  clear(): void {
    this.cache.clear();
  }

  /** 缓存条目数 */
  get size(): number {
    return this.cache.size;
  }
}

// === Speculative Classifier Check ===

/** 全局 classifier 缓存实例 */
const classifierCache = new ClassifierResultCache();

/**
 * 启动 speculative classifier 检查
 *
 * 在 CallModelPhase 收到 bash tool_use 时调用。 提前启动 classifier，结果存入 speculativeChecks Map。
 *
 * @param command bash 命令字符串
 * @param classifierFn 分类器实现
 * @param permCtx 权限上下文（用于 guard 条件）
 * @param signal AbortController signal
 * @returns 是否成功启动（false 表示 guard 条件不满足）
 */
export function startSpeculativeClassifierCheck(
  command: string,
  classifierFn: PermissionClassifier,
  permCtx: { mode: PermissionMode; classifierFn?: PermissionClassifier },
  _signal?: AbortSignal
): boolean {
  // Guard: classifierFn 必须存在
  if (!permCtx.classifierFn) return false;

  // Guard: bypass 模式不启动
  if (permCtx.mode === 'bypassPermissions') return false;

  // 先检查缓存 — 如果有缓存结果，直接存入 speculativeChecks
  const cacheKey = ClassifierResultCache.buildCacheKey('bash', { command });
  const cachedResult = classifierCache.get(cacheKey);
  if (cachedResult) {
    speculativeChecks.set(command, Promise.resolve(cachedResult));
    return true;
  }

  // 启动 classifier（提前执行，不等对话框）
  const classifierInput = {
    toolName: 'bash',
    input: { command },
    safetyLabel: 'destructive' as const,
    isReadOnly: false,
    isDestructive: true
  };

  const promise = classifierFn
    .classify(classifierInput)
    .then(result => {
      // 存入缓存
      classifierCache.set(cacheKey, result);
      return result;
    })
    .catch(() => ({
      behavior: 'ask' as const,
      reason: 'Speculative classifier check failed',
      confidence: 'low' as const,
      unavailable: true
    }));

  // Prevent unhandled rejection if signal aborts before promise is consumed
  promise.catch(() => {});

  speculativeChecks.set(command, promise);
  return true;
}

/**
 * Peek speculative classifier 检查 — 获取预启动 Promise（不消费）
 *
 * 在 canUseToolV3 Path 6 中使用。 返回 Promise 但不删除 Map entry（consume 后才删除）。
 */
export function peekSpeculativeClassifierCheck(
  command: string
): Promise<ClassifierResult> | undefined {
  return speculativeChecks.get(command);
}

/**
 * Consume speculative classifier 检查 — 消费并删除 Map entry
 *
 * 如果 speculative 赢了竞速，调用此方法消费结果。
 */
export function consumeSpeculativeClassifierCheck(
  command: string
): Promise<ClassifierResult> | undefined {
  const promise = speculativeChecks.get(command);
  if (promise) {
    speculativeChecks.delete(command);
  }
  return promise;
}

/** 清理所有 speculative 检查 — agent turn 结束时调用 */
export function clearSpeculativeChecks(): void {
  speculativeChecks.clear();
}

/** 获取 classifier 缓存实例（测试用） */
export function getClassifierCache(): ClassifierResultCache {
  return classifierCache;
}
