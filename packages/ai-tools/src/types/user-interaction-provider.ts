/** UserInteractionProvider — 用户交互问答宿主注入接口 */

/** 问答选项 */
export interface QuestionOption {
  label: string;
  description: string;
  preview?: string;
}

/** 问答输入 */
export interface QuestionInput {
  question: string;
  /** 短标签（max 12 chars） */
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

/** 问答结果 */
export interface QuestionResult {
  answers: Record<string, string>;
  annotations?: Record<string, { preview?: string; notes?: string }>;
}

/**
 * UserInteractionProvider — 用户交互宿主注入
 *
 * 工具通过此接口向用户展示问题并收集回答。
 * TUI/IDE的交互组件可作为真实宿主后端。
 * 无人值守模式(Telegram/Discord等)时isEnabled()返回false。
 */
export interface UserInteractionProvider {
  /** 向用户展示问题并收集回答 */
  askQuestions(questions: QuestionInput[]): Promise<QuestionResult>;
  /** 是否启用（无人值守模式时禁用） */
  isEnabled(): boolean;
}