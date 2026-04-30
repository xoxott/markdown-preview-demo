/** 常量定义（Constants） AI 工具核心包的全局常量 */

/** 默认最大结果字符数 */
export const DEFAULT_MAX_RESULT_SIZE = 100_000;

/** 默认会话 ID（当未提供会话 ID 时使用） */
export const DEFAULT_SESSION_ID = '__default__';

/** 工具名称正则模式（允许的字符：小写字母、数字、连字符，必须以小写字母开头） */
export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/** 工具别名正则模式 */
export const TOOL_ALIAS_PATTERN = /^[a-z][a-z0-9-]*$/;
