/**
 * 事件处理函数缓存 Hook
 *
 * 提供事件处理函数的缓存功能，避免每次渲染都创建新函数
 */

import { computed, type Ref } from 'vue';
import { isRef } from '../utils/type-utils';

/**
 * 事件处理函数映射
 *
 * 注意：这些函数只接收 event 参数，因为 item 已经在闭包中捕获
 */
export interface EventHandlerMap<T> {
  onClick?: (event: MouseEvent) => void;
  onDoubleClick?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
}

/**
 * 事件处理函数缓存 Hook 选项
 */
export interface UseEventHandlersOptions<T> {
  /** 数据项列表 */
  items: T[] | Ref<T[]>;
  /** 获取数据项 ID 的函数 */
  getId: (item: T) => string;
  /** 事件处理函数 */
  handlers: {
    onClick?: (item: T, event: MouseEvent) => void;
    onDoubleClick?: (item: T, event: MouseEvent) => void;
    onMouseEnter?: (item: T, event: MouseEvent) => void;
    onMouseLeave?: (item: T, event: MouseEvent) => void;
  };
}

/**
 * 事件处理函数缓存 Hook 返回值
 */
export interface UseEventHandlersReturn<T> {
  /** 事件处理函数映射（ID -> 处理函数） */
  eventHandlers: Ref<Map<string, EventHandlerMap<T>> | null>;
}

/**
 * 事件处理函数缓存 Hook
 *
 * 缓存事件处理函数映射，避免每次渲染都创建新函数
 *
 * @param options Hook 选项
 * @returns 事件处理函数映射
 *
 * @example
 * ```typescript
 * const { eventHandlers } = useEventHandlers({
 *   items: visibleEdges,
 *   getId: (edge) => edge.id,
 *   handlers: {
 *     onClick: (edge, event) => props.onEdgeClick!(edge, event),
 *     onDoubleClick: (edge, event) => props.onEdgeDoubleClick!(edge, event)
 *   }
 * });
 *
 * // 使用
 * const handler = eventHandlers.value?.get(edge.id);
 * <BaseEdge onClick={handler?.onClick} />
 * ```
 */
export function useEventHandlers<T>(
  options: UseEventHandlersOptions<T>
): UseEventHandlersReturn<T> {
  const { items, getId, handlers } = options;

  const eventHandlers = computed(() => {
    // 如果没有事件处理函数，返回 null
    if (!handlers.onClick && !handlers.onDoubleClick && !handlers.onMouseEnter && !handlers.onMouseLeave) {
      return null;
    }
    // 检查是否是 Ref（使用类型守卫）
    const itemsArray = isRef<T[]>(items) ? items.value : items as T[];
    const handlersMap = new Map<string, EventHandlerMap<T>>();

    itemsArray.forEach((item: T) => {
      handlersMap.set(getId(item), {
        onClick: handlers.onClick
          ? (event: MouseEvent) => handlers.onClick!(item, event)
          : undefined,
        onDoubleClick: handlers.onDoubleClick
          ? (event: MouseEvent) => handlers.onDoubleClick!(item, event)
          : undefined,
        onMouseEnter: handlers.onMouseEnter
          ? (event: MouseEvent) => handlers.onMouseEnter!(item, event)
          : undefined,
        onMouseLeave: handlers.onMouseLeave
          ? (event: MouseEvent) => handlers.onMouseLeave!(item, event)
          : undefined,
      });
    });

    return handlersMap;
  });

  return { eventHandlers };
}

