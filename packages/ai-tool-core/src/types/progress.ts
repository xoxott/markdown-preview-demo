/** 工具进度数据（Tool Progress Data） 执行过程中的进度通知类型 */

/** 进度开始数据 */
export interface ProgressStart {
  type: 'start';
  /** 工具名称 */
  toolName: string;
  /** 预估总步骤数（可选） */
  totalSteps?: number;
}

/** 进度更新数据 */
export interface ProgressUpdate {
  type: 'update';
  /** 当前步骤 */
  currentStep: number;
  /** 预估总步骤数（可选） */
  totalSteps?: number;
  /** 进度百分比（0-100） */
  percentage?: number;
  /** 进度消息 */
  message?: string;
}

/** 进度完成数据 */
export interface ProgressComplete {
  type: 'complete';
  /** 完成消息 */
  message?: string;
}

/** 进度错误数据 */
export interface ProgressError {
  type: 'error';
  /** 错误消息 */
  message: string;
}

/** 工具进度数据（判别联合类型，基于 type 字段判别） */
export type ToolProgressData = ProgressStart | ProgressUpdate | ProgressComplete | ProgressError;
