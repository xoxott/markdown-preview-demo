/** Post-compact 附件重建类型定义 */

import type { AgentMessage } from '@suga/ai-agent-loop';

/** Compact 后需重建的附件类型 */
export type AttachmentType = 'files' | 'skills' | 'plan' | 'agent' | 'delta';

/** 文件附件 */
export interface AttachmentFile {
  /** 文件路径 */
  readonly path: string;
  /** 文件内容 */
  readonly content: string;
  /** 最后修改时间 */
  readonly lastModified: number;
}

/** Skill 附件 */
export interface AttachmentSkill {
  /** Skill 名称 */
  readonly name: string;
  /** Skill 描述 */
  readonly description: string;
}

/** 附件重建配置 */
export interface AttachmentRebuildConfig {
  /** 重建哪些类型的附件（默认全部） */
  readonly enabledTypes?: readonly AttachmentType[];
  /** 文件附件来源（注入） */
  readonly getRecentFiles?: () => readonly AttachmentFile[];
  /** Skill 附件来源（注入） */
  readonly getActiveSkills?: () => readonly AttachmentSkill[];
  /** Plan 附件来源（注入） */
  readonly getCurrentPlan?: () => string;
  /** Agent 附件来源（注入） */
  readonly getAgentState?: () => string;
}

/** 附件重建结果 */
export interface AttachmentRebuildResult {
  /** 重建的附件消息列表 */
  readonly attachments: readonly AgentMessage[];
  /** 重建了哪些类型的附件 */
  readonly typesRebuilt: readonly AttachmentType[];
}
