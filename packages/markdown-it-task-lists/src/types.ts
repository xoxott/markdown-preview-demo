/**
 * 任务列表插件类型定义
 *
 * @module types
 */

/**
 * 任务列表插件配置选项
 */
export interface TaskListOptions {
  /** 是否启用交互式复选框（默认 false，禁用时 checkbox 为 disabled 状态） */
  enabled?: boolean;

  /** 包含任务列表的 ul/ol 元素的类名（默认 'contains-task-list'） */
  listClass?: string;

  /** 任务列表项的 li 元素的类名（默认 'task-list-item'） */
  itemClass?: string;

  /** 复选框 input 元素的类名（默认 'task-list-item-checkbox'） */
  checkboxClass?: string;
}

/**
 * 默认配置选项
 */
export const DEFAULT_OPTIONS: Required<TaskListOptions> = {
  enabled: false,
  listClass: 'contains-task-list',
  itemClass: 'task-list-item',
  checkboxClass: 'task-list-item-checkbox'
};

