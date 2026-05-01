/** AttachmentRebuilder — Post-compact 附件重建器 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type {
  AttachmentRebuildConfig,
  AttachmentRebuildResult,
  AttachmentType
} from '../types/attachment';

/** 生成唯一 ID */
function generateId(): string {
  return `attachment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** 所有附件类型（默认重建全部） */
const ALL_ATTACHMENT_TYPES: readonly AttachmentType[] = [
  'files',
  'skills',
  'plan',
  'agent',
  'delta'
];

/**
 * Post-compact 附件重建器
 *
 * 参考 Claude Code compactConversation 的 post-compact 重建步骤：
 *
 * - files: 最近编辑的文件内容
 * - skills: 已加载的 skill 描述
 * - plan: 当前任务计划
 * - agent: 子代理状态摘要
 * - delta: 增量变更
 *
 * 附件消息设 isMeta: true（不计入对话质量评估）， 插入到 summary 消息之后以保持工作上下文。
 */
export class AttachmentRebuilder {
  private readonly config: AttachmentRebuildConfig;
  private readonly enabledTypes: readonly AttachmentType[];

  constructor(config?: AttachmentRebuildConfig) {
    this.config = config ?? {};
    this.enabledTypes = config?.enabledTypes ?? ALL_ATTACHMENT_TYPES;
  }

  /**
   * 重建附件消息
   *
   * @returns 附件消息列表和重建类型列表
   */
  rebuild(): AttachmentRebuildResult {
    const attachments: AgentMessage[] = [];
    const typesRebuilt: AttachmentType[] = [];

    for (const type of this.enabledTypes) {
      const messages = this.buildAttachmentMessages(type);
      if (messages.length > 0) {
        attachments.push(...messages);
        typesRebuilt.push(type);
      }
    }

    return { attachments, typesRebuilt };
  }

  /** 构建指定类型的附件消息 */
  private buildAttachmentMessages(type: AttachmentType): AgentMessage[] {
    const timestamp = Date.now();

    switch (type) {
      case 'files':
        return this.buildFileAttachments(timestamp);
      case 'skills':
        return this.buildSkillAttachments(timestamp);
      case 'plan':
        return this.buildPlanAttachment(timestamp);
      case 'agent':
        return this.buildAgentAttachment(timestamp);
      case 'delta':
        return this.buildDeltaAttachment(timestamp);
      default:
        return [];
    }
  }

  /** 构建 files 附件 */
  private buildFileAttachments(timestamp: number): AgentMessage[] {
    if (!this.config.getRecentFiles) return [];

    const files = this.config.getRecentFiles();
    if (files.length === 0) return [];

    const content = files
      .map(f => `<file path="${f.path}" lastModified="${f.lastModified}">\n${f.content}\n</file>`)
      .join('\n\n');

    return [
      {
        id: generateId(),
        role: 'user',
        content: `<recent_files>\n${content}\n</recent_files>`,
        timestamp,
        isMeta: true
      }
    ];
  }

  /** 构建 skills 附件 */
  private buildSkillAttachments(timestamp: number): AgentMessage[] {
    if (!this.config.getActiveSkills) return [];

    const skills = this.config.getActiveSkills();
    if (skills.length === 0) return [];

    const content = skills.map(s => `<skill name="${s.name}">${s.description}</skill>`).join('\n');

    return [
      {
        id: generateId(),
        role: 'user',
        content: `<active_skills>\n${content}\n</active_skills>`,
        timestamp,
        isMeta: true
      }
    ];
  }

  /** 构建 plan 附件 */
  private buildPlanAttachment(timestamp: number): AgentMessage[] {
    if (!this.config.getCurrentPlan) return [];

    const plan = this.config.getCurrentPlan();
    if (!plan) return [];

    return [
      {
        id: generateId(),
        role: 'user',
        content: `<current_plan>\n${plan}\n</current_plan>`,
        timestamp,
        isMeta: true
      }
    ];
  }

  /** 构建 agent 附件 */
  private buildAgentAttachment(timestamp: number): AgentMessage[] {
    if (!this.config.getAgentState) return [];

    const agentState = this.config.getAgentState();
    if (!agentState) return [];

    return [
      {
        id: generateId(),
        role: 'user',
        content: `<agent_state>\n${agentState}\n</agent_state>`,
        timestamp,
        isMeta: true
      }
    ];
  }

  /** 构建 delta 附件（增量变更） */
  private buildDeltaAttachment(timestamp: number): AgentMessage[] {
    // delta 附件通常由运行时注入，此处为接口预留
    // 具体实现依赖运行时环境提供增量变更信息
    return [];
  }
}
