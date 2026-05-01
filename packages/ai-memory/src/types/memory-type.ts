/** 记忆类型闭包分类 — 4 类型固定分类 */

/** 记忆类型 — 闭包分类 */
export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';

/** 记忆类型定义元数据 */
export interface MemoryTypeDef {
  readonly label: string;
  readonly scope: string; // 'private' | 'private→team' | '→team' | 'team'
  readonly scopeTag: string; // XML 标签: <private>, <team>, etc.
  readonly bodyGuidelines: string; // 主体内容应包含什么
  readonly description: string; // 人类可读描述
}

/** 4 类型闭包分类常量 */
export const MEMORY_TYPES: Record<MemoryType, MemoryTypeDef> = {
  user: {
    label: 'User',
    scope: 'private',
    scopeTag: '<private>',
    bodyGuidelines:
      'Personal preferences, work habits, communication style. Not negative judgments.',
    description: 'Private user-specific knowledge'
  },
  feedback: {
    label: 'Feedback',
    scope: 'private→team',
    scopeTag: '<private→team>',
    bodyGuidelines:
      'Rule/fact, then Why: line (reason/user gave), then HowToApply: line (when/where). Both corrections AND confirmations.',
    description: 'Guidance about approach — what to avoid and what to repeat'
  },
  project: {
    label: 'Project',
    scope: '→team',
    scopeTag: '<→team>',
    bodyGuidelines:
      'Fact/decision, then Why: line (motivation/constraint), then HowToApply: line (how this shapes suggestions). Not derivable from code/git.',
    description: 'Ongoing work context — who is doing what, why, by when'
  },
  reference: {
    label: 'Reference',
    scope: 'team',
    scopeTag: '<team>',
    bodyGuidelines:
      'Pointers to external systems — dashboards, issue trackers, Slack channels, API docs.',
    description: 'Where to find up-to-date information outside the project'
  }
};

/** 类型值列表 — 用于验证 */
export const MEMORY_TYPE_VALUES: readonly MemoryType[] = [
  'user',
  'feedback',
  'project',
  'reference'
];
