import type { DeclarativeFieldConfig } from './types';

/** 清空时应使用 `null` 的控件（Naive UI 对 `undefined` 往往不刷新展示） */
const NULL_WHEN_EMPTY_TYPES = new Set<string>([
  'select',
  'auto-complete',
  'cascader',
  'tree-select',
  'date',
  'datetime',
  'date-range',
  'datetime-range',
  'month',
  'year',
  'quarter',
  'week',
  'time',
  'time-range'
]);

const TEXT_EMPTY_TYPES = new Set<string>(['input', 'textarea', 'password']);

/**
 * 字段未配置 `defaultValue` 时的初始值。
 *
 * - 文本类：`''`
 * - 选择 / 日期类：`null`（便于重置后控件 UI 同步清空）
 */
export function resolveFieldInitialValue(field: DeclarativeFieldConfig): unknown {
  if (Object.hasOwn(field, 'defaultValue')) {
    return field.defaultValue;
  }
  if (NULL_WHEN_EMPTY_TYPES.has(field.type)) {
    return null;
  }
  if (TEXT_EMPTY_TYPES.has(field.type)) {
    return '';
  }
  return undefined;
}

/** 绑定控件前规范化 `model[field]`，避免重置为 `undefined` 时 UI 不更新 */
export function normalizeControlValue(field: DeclarativeFieldConfig, value: unknown): unknown {
  if (value !== undefined) {
    return value;
  }
  return resolveFieldInitialValue(field);
}
