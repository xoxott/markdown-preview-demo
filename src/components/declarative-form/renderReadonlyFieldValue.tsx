import type { VNode } from 'vue';
import { formatReadonlyValue } from './formatReadonlyValue';
import type { DeclarativeFieldConfig } from './types';

/** `renderReadonly` 返回值是否含有可展示内容 */
function hasReadonlyContent(out: VNode | string | null | undefined): out is VNode | string {
  if (out === null || out === undefined) return false;
  if (typeof out === 'string' && out.trim() === '') return false;
  return true;
}

/** 只读模式下单个字段的展示内容（标签仍由 `NFormItem` 负责） */
export function renderReadonlyFieldValue(
  field: DeclarativeFieldConfig,
  model: Record<string, unknown>
): VNode {
  if (field.renderReadonly) {
    const out = field.renderReadonly(model);
    if (!hasReadonlyContent(out)) {
      return <span class="declarative-form__readonly-value">-</span>;
    }
    if (typeof out === 'string') {
      return <span class="declarative-form__readonly-value">{out}</span>;
    }
    return out;
  }

  const text = formatReadonlyValue(field, model[field.field]);
  const multiline = field.type === 'textarea' && typeof text === 'string' && text.includes('\n');
  const cls = multiline
    ? 'declarative-form__readonly-value declarative-form__readonly-value--multiline'
    : 'declarative-form__readonly-value';
  return <span class={cls}>{text}</span>;
}
