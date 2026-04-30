/** 验证结果类型（Validation Result Types） 工具输入验证的返回类型 */

/** 验证通过 */
export interface ValidationSuccess {
  behavior: 'allow';
  /** 验证通过后的修正输入（可选，允许 validateInput 修正参数） */
  updatedInput?: unknown;
}

/** 验证失败 */
export interface ValidationFailure {
  behavior: 'deny';
  /** 拒绝消息（面向用户） */
  message: string;
  /** 拒绝原因（面向开发者，用于调试和日志） */
  reason?: string;
}

/** 验证结果（判别联合类型，基于 behavior 字段判别） */
export type ValidationResult = ValidationSuccess | ValidationFailure;
