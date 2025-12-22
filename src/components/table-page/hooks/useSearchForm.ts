import { reactive, ref } from 'vue';
import type { SearchFieldConfig } from '../types';

export interface UseSearchFormOptions {
  /** 搜索字段配置 */
  config: SearchFieldConfig[];
  /** 初始值 */
  initialValues?: Record<string, any>;
  /** 搜索回调 */
  onSearch?: (values: Record<string, any>) => void;
  /** 重置回调 */
  onReset?: () => void;
}

export function useSearchForm(options: UseSearchFormOptions) {
  const { config, initialValues = {}, onSearch, onReset } = options;

  // Initialize form model based on config
  const formModel = reactive<Record<string, any>>({});

  // Set initial values
  config.forEach(field => {
    formModel[field.field] = initialValues[field.field] ?? undefined;
  });

  // Form ref for validation
  const formRef = ref();

  /**
   * Update model field
   */
  const updateModel = (field: string, value: any) => {
    formModel[field] = value;
  };

  /**
   * Get form values
   */
  const getValues = () => {
    return { ...formModel };
  };

  /**
   * Set form values
   */
  const setValues = (values: Record<string, any>) => {
    Object.assign(formModel, values);
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    config.forEach(field => {
      formModel[field.field] = initialValues[field.field] ?? undefined;
    });
    formRef.value?.restoreValidation();
    onReset?.();
  };

  /**
   * Handle search
   */
  const handleSearch = () => {
    onSearch?.(getValues());
  };

  /**
   * Handle reset
   */
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

