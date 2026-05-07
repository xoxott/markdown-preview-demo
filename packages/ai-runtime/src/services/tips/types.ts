/**
 * Tips 类型 — 在 spinner / banner / 启动屏中展示的轻量级提示
 *
 * 对齐 CC services/tips/types.ts。Tip 是一个有 id 的延迟字符串生成器， 仅在 isRelevant 为 true 时才会被选中展示，并按
 * cooldownSessions 做节流。
 */

/** Tip 上下文 — 由 runtime 注入用户当前状态用于 isRelevant 决策 */
export interface TipContext {
  /** 主题名（用于在 tip 文本中使用主题色） */
  readonly theme?: string;
  /** 已使用的 bash 命令名集合（如 'git'/'npm'/'vercel'） */
  readonly bashTools?: ReadonlySet<string>;
  /** 已读取的文件路径列表（用于检测 "正在使用 frontend/Vercel/..." 等） */
  readonly readFiles?: readonly string[];
  /** 自定义键值（用于扩展） */
  readonly extra?: Readonly<Record<string, unknown>>;
}

/** 单条 Tip 定义 */
export interface Tip {
  readonly id: string;
  /** 内容生成器（异步以支持远端配置/feature flag） */
  readonly content: (context?: TipContext) => Promise<string>;
  /** 该 tip 展示后的 cooldown（以"启动次数"为单位） */
  readonly cooldownSessions: number;
  /** 是否相关 — false 时直接跳过 */
  readonly isRelevant: (context?: TipContext) => Promise<boolean>;
}

/** Tip 历史记录 — { tipId: lastShownAtNumStartups } */
export type TipsHistory = Readonly<Record<string, number>>;
