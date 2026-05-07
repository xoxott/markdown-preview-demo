/**
 * Claude AI Limits — 5h / 7d / overage 配额边界检测
 *
 * 对齐 CC services/claudeAiLimits.ts。CC 端依赖 anthropic SDK 和 growthbook，但配额 计算的核心算法是无副作用的 — 把"已用 token
 * / 时间窗口"算成 utilization、并对比 阈值发出 early warning。本模块只暴露算法层，HTTP/API 调用由宿主接管。
 */

// ============================================================
// 类型
// ============================================================

/** 速率限制类型 */
export type RateLimitType =
  | 'five_hour'
  | 'seven_day'
  | 'seven_day_opus'
  | 'seven_day_sonnet'
  | 'overage';

/** 配额状态 */
export type QuotaStatus = 'allowed' | 'allowed_warning' | 'rejected';

/** 阈值定义 — utilization >= utilization && timePct <= timePct → 触发 warning */
export interface EarlyWarningThreshold {
  /** 已用比例（0-1） */
  readonly utilization: number;
  /** 已经过的时间比例（0-1） */
  readonly timePct: number;
}

export interface EarlyWarningConfig {
  readonly rateLimitType: RateLimitType;
  /** 5h / 7d / overage */
  readonly claimAbbrev: '5h' | '7d' | 'overage';
  readonly windowSeconds: number;
  readonly thresholds: readonly EarlyWarningThreshold[];
}

/** 默认 early warning 配置（按优先级从高到低） */
export const DEFAULT_EARLY_WARNING_CONFIGS: readonly EarlyWarningConfig[] = [
  {
    rateLimitType: 'five_hour',
    claimAbbrev: '5h',
    windowSeconds: 5 * 60 * 60,
    thresholds: [{ utilization: 0.9, timePct: 0.72 }]
  },
  {
    rateLimitType: 'seven_day',
    claimAbbrev: '7d',
    windowSeconds: 7 * 24 * 60 * 60,
    thresholds: [
      { utilization: 0.75, timePct: 0.6 },
      { utilization: 0.5, timePct: 0.35 },
      { utilization: 0.25, timePct: 0.15 }
    ]
  }
];

/** 当前配额快照（由宿主从响应 header 解析后传入） */
export interface RateLimitSnapshot {
  readonly type: RateLimitType;
  /** 配额上限（token 或 request 数） */
  readonly total: number;
  /** 已用配额 */
  readonly used: number;
  /** 窗口起点（epoch ms） */
  readonly windowStart: number;
  /** 当前时间（epoch ms） — 默认 Date.now() */
  readonly now?: number;
}

/** Early warning 结果 */
export interface EarlyWarningResult {
  readonly triggered: boolean;
  readonly rateLimitType?: RateLimitType;
  readonly utilization?: number;
  readonly timePct?: number;
  readonly threshold?: EarlyWarningThreshold;
}

/** 配额状态评估结果 */
export interface QuotaEvaluation {
  readonly status: QuotaStatus;
  readonly utilization: number;
  readonly remaining: number;
  readonly warning?: EarlyWarningResult;
}

// ============================================================
// 算法
// ============================================================

/**
 * 评估单个 rate limit 快照是否触发 warning
 *
 * 算法：
 *
 * 1. utilization = used / total
 * 2. timePct = (now - windowStart) / windowSeconds
 * 3. 检查每个 threshold：utilization >= threshold.utilization && timePct <= threshold.timePct → 触发
 */
export function evaluateEarlyWarning(
  snapshot: RateLimitSnapshot,
  configs: readonly EarlyWarningConfig[] = DEFAULT_EARLY_WARNING_CONFIGS
): EarlyWarningResult {
  const config = configs.find(c => c.rateLimitType === snapshot.type);
  if (!config) return { triggered: false };
  const now = snapshot.now ?? Date.now();
  const elapsedMs = now - snapshot.windowStart;
  const windowMs = config.windowSeconds * 1000;
  if (elapsedMs <= 0 || windowMs <= 0) return { triggered: false };

  const utilization = snapshot.total > 0 ? snapshot.used / snapshot.total : 0;
  const timePct = Math.min(1, Math.max(0, elapsedMs / windowMs));

  for (const threshold of config.thresholds) {
    if (utilization >= threshold.utilization && timePct <= threshold.timePct) {
      return {
        triggered: true,
        rateLimitType: snapshot.type,
        utilization,
        timePct,
        threshold
      };
    }
  }
  return { triggered: false, rateLimitType: snapshot.type, utilization, timePct };
}

/** 综合评估配额状态（allowed / warning / rejected） */
export function evaluateQuota(
  snapshot: RateLimitSnapshot,
  configs?: readonly EarlyWarningConfig[]
): QuotaEvaluation {
  const utilization = snapshot.total > 0 ? snapshot.used / snapshot.total : 0;
  const remaining = Math.max(0, snapshot.total - snapshot.used);
  if (utilization >= 1) {
    return { status: 'rejected', utilization, remaining };
  }
  const warning = evaluateEarlyWarning(snapshot, configs);
  if (warning.triggered) {
    return { status: 'allowed_warning', utilization, remaining, warning };
  }
  return { status: 'allowed', utilization, remaining };
}

// ============================================================
// HTTP Header 解析
// ============================================================

/** Claude API 速率限制 header 字段 */
export interface RateLimitHeaders {
  readonly 'anthropic-ratelimit-five-hour-tokens-limit'?: string;
  readonly 'anthropic-ratelimit-five-hour-tokens-remaining'?: string;
  readonly 'anthropic-ratelimit-five-hour-window-start'?: string;
  readonly 'anthropic-ratelimit-seven-day-tokens-limit'?: string;
  readonly 'anthropic-ratelimit-seven-day-tokens-remaining'?: string;
  readonly 'anthropic-ratelimit-seven-day-window-start'?: string;
  readonly [key: string]: string | undefined;
}

/** 从响应 header 解析 RateLimitSnapshot 列表（可能含 5h + 7d） */
export function parseRateLimitHeaders(headers: RateLimitHeaders): readonly RateLimitSnapshot[] {
  const snapshots: RateLimitSnapshot[] = [];

  const fiveHourTotal = headers['anthropic-ratelimit-five-hour-tokens-limit'];
  const fiveHourRemaining = headers['anthropic-ratelimit-five-hour-tokens-remaining'];
  const fiveHourWindow = headers['anthropic-ratelimit-five-hour-window-start'];
  if (fiveHourTotal && fiveHourRemaining && fiveHourWindow) {
    const total = Number(fiveHourTotal);
    const remaining = Number(fiveHourRemaining);
    const windowStart = Date.parse(fiveHourWindow);
    if (!Number.isNaN(total) && !Number.isNaN(remaining) && !Number.isNaN(windowStart)) {
      snapshots.push({
        type: 'five_hour',
        total,
        used: total - remaining,
        windowStart
      });
    }
  }

  const sevenDayTotal = headers['anthropic-ratelimit-seven-day-tokens-limit'];
  const sevenDayRemaining = headers['anthropic-ratelimit-seven-day-tokens-remaining'];
  const sevenDayWindow = headers['anthropic-ratelimit-seven-day-window-start'];
  if (sevenDayTotal && sevenDayRemaining && sevenDayWindow) {
    const total = Number(sevenDayTotal);
    const remaining = Number(sevenDayRemaining);
    const windowStart = Date.parse(sevenDayWindow);
    if (!Number.isNaN(total) && !Number.isNaN(remaining) && !Number.isNaN(windowStart)) {
      snapshots.push({
        type: 'seven_day',
        total,
        used: total - remaining,
        windowStart
      });
    }
  }

  return snapshots;
}

// ============================================================
// 文案
// ============================================================

const RATE_LIMIT_DISPLAY_NAMES: Record<RateLimitType, string> = {
  five_hour: 'session limit',
  seven_day: 'weekly limit',
  seven_day_opus: 'weekly Opus limit',
  seven_day_sonnet: 'weekly Sonnet limit',
  overage: 'usage allowance'
};

/** 配额过限错误文案 */
export function getRateLimitErrorMessage(type: RateLimitType): string {
  const name = RATE_LIMIT_DISPLAY_NAMES[type] ?? 'rate limit';
  return `You have reached your ${name}. Please try again later.`;
}

/** 配额接近限额警告文案 */
export function getRateLimitWarning(result: EarlyWarningResult): string | null {
  if (!result.triggered || !result.rateLimitType || result.utilization === undefined) {
    return null;
  }
  const name = RATE_LIMIT_DISPLAY_NAMES[result.rateLimitType] ?? 'rate limit';
  const pct = Math.round(result.utilization * 100);
  return `You have used ${pct}% of your ${name} window — consider slowing down or switching to a smaller model.`;
}
