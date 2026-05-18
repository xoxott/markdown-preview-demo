import type { DeclarativeFieldConfig } from './types';

/** 解析 NFormItem 标签：全局 showLabel 与字段 label / showLabel 共同决定 */
export function resolveFieldLabel(
  field: DeclarativeFieldConfig,
  formShowLabel: boolean
): string | undefined {
  if (!formShowLabel || field.showLabel === false || !field.label) return undefined;
  return field.label;
}
