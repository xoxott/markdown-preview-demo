import dayjs from 'dayjs';
import type { DeclarativeFieldConfig } from './types';

const EMPTY = '-';

type OptionRow = { label: string; value: unknown; children?: OptionRow[] };

function asOptions(field: DeclarativeFieldConfig): OptionRow[] | undefined {
  const o = field.options;
  if (!o?.length) return undefined;
  return o as OptionRow[];
}

function isEmptyScalar(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  return false;
}

function isEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length === 0;
}

/** 是否应展示为「无内容」占位 `-`（与控件语义一致） */
export function isReadonlyValueEmpty(field: DeclarativeFieldConfig, value: unknown): boolean {
  const { type } = field;
  if (type === 'switch' || type === 'checkbox') {
    return value === null || value === undefined;
  }
  if (isEmptyScalar(value)) return true;
  if (isEmptyArray(value)) return true;
  if (type === 'date-range' || type === 'datetime-range' || type === 'time-range') {
    if (!Array.isArray(value) || value.length < 2) return true;
    const [a, b] = value;
    return (
      (a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')
    );
  }
  return false;
}

function optionLabel(options: OptionRow[] | undefined, value: unknown): string | null {
  if (!options) return null;
  const hit = options.find(o => o.value === value);
  return hit?.label ?? null;
}

function formatCascaderLikePath(value: unknown, options: OptionRow[] | undefined): string {
  if (!Array.isArray(value) || value.length === 0 || !options?.length) return EMPTY;
  const labels: string[] = [];
  let opts: OptionRow[] | undefined = options;
  for (const key of value) {
    const node: OptionRow | undefined = opts?.find(o => o.value === key);
    if (!node) break;
    labels.push(node.label);
    opts = node.children;
  }
  return labels.length ? labels.join(' / ') : EMPTY;
}

function formatDateTs(ts: unknown, pattern: string): string {
  if (typeof ts !== 'number' || Number.isNaN(ts)) return EMPTY;
  const d = dayjs(ts);
  return d.isValid() ? d.format(pattern) : EMPTY;
}

function formatTimeSegment(value: unknown, pattern: string): string {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (typeof value === 'string' && value.trim()) return value.trim();
  return formatDateTs(value, pattern);
}

function formatRangeGeneric(
  value: unknown,
  separator: string,
  formatOne: (v: unknown) => string
): string {
  if (!Array.isArray(value) || value.length < 2) return EMPTY;
  const [a, b] = value;
  if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) {
    return EMPTY;
  }
  const left = a !== null && a !== undefined && a !== '' ? formatOne(a) : EMPTY;
  const right = b !== null && b !== undefined && b !== '' ? formatOne(b) : EMPTY;
  if (left === EMPTY && right === EMPTY) return EMPTY;
  return `${left}${separator}${right}`;
}

function formatSelectLike(field: DeclarativeFieldConfig, value: unknown): string {
  const opts = asOptions(field);
  if (Array.isArray(value)) {
    const parts = value.map(v => optionLabel(opts, v) ?? String(v)).filter(Boolean);
    return parts.length ? parts.join('、') : EMPTY;
  }
  return (
    optionLabel(opts, value) ?? (value !== undefined && value !== null ? String(value) : EMPTY)
  );
}

/** 将 `model[field]` 格式化为只读展示文案；无内容时返回 `-`。 */
export function formatReadonlyValue(field: DeclarativeFieldConfig, value: unknown): string {
  if (isReadonlyValueEmpty(field, value)) return EMPTY;

  const { type } = field;

  switch (type) {
    case 'switch':
    case 'checkbox':
      return value ? '是' : '否';

    case 'select':
    case 'radio-group':
    case 'auto-complete':
      return formatSelectLike(field, value);

    case 'checkbox-group': {
      if (!Array.isArray(value)) return EMPTY;
      const opts = asOptions(field);
      const parts = value.map(v => optionLabel(opts, v) ?? String(v));
      return parts.length ? parts.join('、') : EMPTY;
    }

    case 'cascader':
    case 'tree-select':
      return formatCascaderLikePath(value, asOptions(field));

    case 'transfer': {
      if (!Array.isArray(value)) return EMPTY;
      const opts = asOptions(field);
      const parts = value.map(v => optionLabel(opts, v) ?? String(v));
      return parts.length ? parts.join('、') : EMPTY;
    }

    case 'date':
      return formatDateTs(value, 'YYYY-MM-DD');
    case 'datetime':
      return formatDateTs(value, 'YYYY-MM-DD HH:mm:ss');
    case 'month':
      return formatDateTs(value, 'YYYY-MM');
    case 'year':
      return formatDateTs(value, 'YYYY');
    case 'quarter': {
      if (typeof value !== 'number' || Number.isNaN(value)) return EMPTY;
      const d = dayjs(value);
      if (!d.isValid()) return EMPTY;
      const q = Math.floor(d.month() / 3) + 1;
      return `${d.year()}-Q${q}`;
    }
    case 'week':
      return formatDateTs(value, 'YYYY-MM-DD');
    case 'date-range':
      return formatRangeGeneric(value, ' ~ ', v => formatDateTs(v, 'YYYY-MM-DD'));
    case 'datetime-range':
      return formatRangeGeneric(value, ' ~ ', v => formatDateTs(v, 'YYYY-MM-DD HH:mm:ss'));
    case 'time-range':
      return formatRangeGeneric(value, ' ~ ', v => formatTimeSegment(v, 'HH:mm:ss'));
    case 'time':
      return formatTimeSegment(value, 'HH:mm:ss');

    case 'input-number':
    case 'slider':
    case 'rate':
      return String(value);

    case 'password':
      return '••••••';

    case 'color-picker':
      return typeof value === 'string' && value ? value : String(value);

    case 'dynamic-input':
      if (!Array.isArray(value)) return EMPTY;
      return value.map(String).join('、');

    case 'upload': {
      if (!Array.isArray(value)) return EMPTY;
      const names = value.map(
        (f: { name?: string; file?: File | null }) => f?.name ?? f?.file?.name ?? ''
      );
      const parts = names.filter(Boolean);
      return parts.length ? parts.join('、') : EMPTY;
    }

    case 'textarea':
    case 'input':
      return typeof value === 'string' ? value : String(value);

    default:
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      return value === undefined || value === null ? EMPTY : String(value);
  }
}
