/**
 * 事件工具函数
 *
 * 提供事件处理相关的工具函数，包括事件委托
 */

import { computed, type Ref } from 'vue';
import { isRef } from './type-utils';

/**
 * 事件委托选项
 */
export interface EventDelegationOptions<T> {
  /** 数据项列表（可以是响应式引用） */
  items: T[] | Ref<T[]>;
  /** 获取数据项 ID 的函数 */
  getId: (item: T) => string;
  /** 数据属性名称（用于在 DOM 上标记） */
  dataAttribute?: string;
  /** 排除选择器（点击这些元素时不触发事件） */
  excludeSelector?: string;
}

/**
 * 创建事件委托处理函数
 *
 * 用于在容器元素上统一处理子元素的事件，避免为每个子元素创建事件处理函数
 *
 * @param options 事件委托选项
 * @param handler 事件处理函数
 * @returns 事件委托处理函数
 *
 * @example
 * ```typescript
 * const handleClick = createEventDelegation(
 *   {
 *     items: visibleNodes.value,
 *     getId: (node) => node.id,
 *     dataAttribute: 'data-node-id'
 *   },
 *   (node, event) => {
 *     console.log('节点被点击', node);
 *   }
 * );
 *
 * // 在容器上使用
 * <div onClick={handleClick}>
 *   {nodes.map(node => (
 *     <div data-node-id={node.id}>...</div>
 *   ))}
 * </div>
 * ```
 */
export function createEventDelegation<T>(
  options: EventDelegationOptions<T>,
  handler: (item: T, event: MouseEvent) => void
): (event: MouseEvent) => void {
  const { items, getId, dataAttribute = 'data-id', excludeSelector } = options;

  // 创建响应式的 ID 到数据项的映射
  const itemsMap = computed(() => {
    const itemsArray = isRef<T[]>(items) ? items.value : items as T[];
    const map = new Map<string, T>();
    itemsArray.forEach((item: T) => {
      map.set(getId(item), item);
    });
    return map;
  });

  return (event: MouseEvent) => {
    // 检查是否应该排除
    if (excludeSelector) {
      const target = event.target as HTMLElement;
      if (target.closest(excludeSelector)) {
        return;
      }
    }

    // 查找包含 data 属性的元素
    const target = event.target as HTMLElement;
    const element = target.closest(`[${dataAttribute}]`);
    if (element) {
      const id = element.getAttribute(dataAttribute);
      if (id) {
        const item = itemsMap.value.get(id);
        if (item) {
          handler(item, event);
        }
      }
    }
  };
}

/**
 * 创建节点事件委托（便捷方法）
 *
 * 为节点列表创建事件委托，使用默认的配置
 *
 * @param items 节点列表（响应式）
 * @param handler 事件处理函数（可选）
 * @param options 额外选项
 * @returns 事件处理函数或 undefined
 *
 * @example
 * ```typescript
 * const handleNodeClick = createNodeEventDelegation(
 *   visibleNodes,
 *   props.onNodeClick,
 *   { excludeSelector: '.flow-handle' }
 * );
 * ```
 */
export function createNodeEventDelegation<T extends { id: string }>(
  items: Ref<T[]>,
  handler: ((item: T, event: MouseEvent) => void) | undefined,
  options?: { excludeSelector?: string }
): ((event: MouseEvent) => void) | undefined {
  if (!handler) return undefined;

  return createEventDelegation(
    {
      items,
      getId: (item) => item.id,
      dataAttribute: 'data-node-id',
      excludeSelector: options?.excludeSelector
    },
    handler
  );
}

