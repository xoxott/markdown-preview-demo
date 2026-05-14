import { reactive, ref } from 'vue';
import type { SearchFieldConfig } from '../types';

/** useSearchForm 初始化选项 */
export interface UseSearchFormOptions {
  /** 与 SearchBar 一致的字段配置，用于生成 model 键与重置行为 */
  config: SearchFieldConfig[];
  /** 各字段初始值；优先级高于字段上的 defaultValue */
  initialValues?: Record<string, any>;
  /**
   * 用户点击「搜索」或回车触发：入参为当前表单浅拷贝快照。 与 `useTable` 组合时通常在此 `updateSearchParams({ page: 1, ... })` 并
   * `getData()`。
   */
  onSearch?: (values: Record<string, any>) => void;
  /** 表单已恢复默认值后触发（在 restoreValidation 之后）。 与 `useTable` 组合时通常在此 `resetSearchParams()` 并 `getData()`。 */
  onReset?: () => void;
}

/**
 * 将声明式 searchConfig 转为可写表单 model，并提供搜索 / 重置 / 读写工具。 与 SearchBar、TablePage 配合使用；若页面已用 `useTable` /
 * `useTablePage`， 一般直接使用其 `searchParams` 作为表单 model，无需再套一层本 hook。
 */
export function useSearchForm(options: UseSearchFormOptions) {
  const { config, initialValues = {}, onSearch, onReset } = options;

  /** 与 naive NForm 双向绑定的扁平对象 */
  const formModel = reactive<Record<string, any>>({});

  /** 按配置 + initialValues + defaultValue 填充一行初始态 */
  function resolveInitial(field: SearchFieldConfig) {
    if (Object.hasOwn(initialValues, field.field)) {
      return initialValues[field.field];
    }
    if (Object.hasOwn(field, 'defaultValue')) {
      return field.defaultValue;
    }
    return undefined;
  }

  config.forEach(field => {
    formModel[field.field] = resolveInitial(field);
  });

  /** 供 naive 表单校验挂载（若后续扩展校验规则可直接使用） */
  const formRef = ref();

  /** 更新单个字段，供 SearchBar 的 onUpdate:value 调用 */
  const updateModel = (field: string, value: any) => {
    formModel[field] = value;
  };

  /** 导出为普通对象快照，避免把 reactive 引用泄漏给 HTTP 层 */
  const getValues = () => {
    return { ...formModel };
  };

  /** 批量合并到表单，不替换整个 reactive 实例 */
  const setValues = (values: Record<string, any>) => {
    Object.assign(formModel, values);
  };

  /** 恢复为「初始值 / 字段 default」并触发 onReset */
  const resetForm = () => {
    config.forEach(field => {
      formModel[field.field] = resolveInitial(field);
    });
    formRef.value?.restoreValidation?.();
    onReset?.();
  };

  /** 点击搜索：先传出快照再交业务拉数 */
  const handleSearch = () => {
    onSearch?.(getValues());
  };

  /** 点击重置：仅复位表单，由 onReset 决定是否重新请求 */
  const handleReset = () => {
    resetForm();
  };

  return {
    formModel,
    formRef,
    updateModel,
    getValues,
    setValues,
    resetForm,
    handleSearch,
    handleReset
  };
}
