import type { VNode } from 'vue';
import type { DeclarativeFieldConfig } from './types';
import type { DeclarativeControlContext } from './controlContext';

export type DeclarativeControlRenderer = (
  field: DeclarativeFieldConfig,
  ctx: DeclarativeControlContext
) => VNode | null;

const registry = new Map<string, DeclarativeControlRenderer>();

export interface RegisterDeclarativeControlOptions {
  /** 为 true 时覆盖已有同 type 渲染器，默认 false */
  override?: boolean;
}

export function registerDeclarativeControl(
  type: string,
  renderer: DeclarativeControlRenderer,
  options?: RegisterDeclarativeControlOptions
) {
  if (registry.has(type) && !options?.override) {
    if (import.meta.env.DEV) {
      console.warn(
        `[DeclarativeForm] control type "${type}" is already registered; pass { override: true } to replace.`
      );
    }
    return;
  }
  registry.set(type, renderer);
}

export function unregisterDeclarativeControl(type: string) {
  registry.delete(type);
}

export function hasDeclarativeControl(type: string) {
  return registry.has(type);
}

export function getDeclarativeControlTypes() {
  return [...registry.keys()];
}

export function getDeclarativeControlRenderer(type: string) {
  return registry.get(type);
}

/** 按字段 type 查找注册表并渲染；未注册类型返回 null */
export function renderDeclarativeControl(
  field: DeclarativeFieldConfig,
  ctx: DeclarativeControlContext
) {
  const renderer = registry.get(field.type);
  if (!renderer) {
    if (import.meta.env.DEV) {
      console.warn(
        `[DeclarativeForm] unknown field type "${field.type}". Register via registerDeclarativeControl().`
      );
    }
    return null;
  }
  return renderer(field, ctx);
}
