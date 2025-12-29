/**
 * Flow 事件发射器
 *
 * 提供类型安全的事件注册和触发功能
 * 支持事件监听器管理、一次性监听器、事件优先级等
 */

import type { FlowEvents } from '../../types/flow-events';

/**
 * 事件监听器类型
 */
type EventListener<T extends keyof FlowEvents> = FlowEvents[T] extends (
  ...args: any[]
) => any
  ? FlowEvents[T]
  : never;

/**
 * 事件监听器选项
 */
export interface EventListenerOptions {
  /** 是否只触发一次 */
  once?: boolean;
  /** 优先级（数字越大优先级越高） */
  priority?: number;
  /** 是否在捕获阶段触发 */
  capture?: boolean;
}

/**
 * 事件监听器包装
 */
interface EventListenerWrapper<T extends keyof FlowEvents> {
  /** 监听器函数 */
  listener: EventListener<T>;
  /** 选项 */
  options: EventListenerOptions;
  /** 是否已移除 */
  removed: boolean;
}

/**
 * Flow 事件发射器
 *
 * 提供类型安全的事件系统
 */
export class FlowEventEmitter {
  /** 事件监听器存储 */
  private listeners: Map<
    keyof FlowEvents,
    EventListenerWrapper<keyof FlowEvents>[]
  > = new Map();

  /**
   * 注册事件监听器
   *
   * @param event 事件名称
   * @param listener 监听器函数
   * @param options 监听器选项
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const emitter = new FlowEventEmitter();
   *
   * // 注册监听器
   * const unsubscribe = emitter.on('onNodeClick', (node, event) => {
   *   console.log('Node clicked:', node);
   * });
   *
   * // 取消监听
   * unsubscribe();
   * ```
   */
  on<T extends keyof FlowEvents>(
    event: T,
    listener: EventListener<T>,
    options: EventListenerOptions = {}
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const wrappers = this.listeners.get(event)!;
    const wrapper: EventListenerWrapper<T> = {
      listener: listener as any,
      options: {
        once: false,
        priority: 0,
        capture: false,
        ...options
      },
      removed: false
    };

    wrappers.push(wrapper as any);

    // 按优先级排序（优先级高的在前）
    wrappers.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

    // 返回取消监听的函数
    return () => {
      wrapper.removed = true;
      const index = wrappers.indexOf(wrapper as any);
      if (index > -1) {
        wrappers.splice(index, 1);
      }
      if (wrappers.length === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * 注册一次性事件监听器
   *
   * @param event 事件名称
   * @param listener 监听器函数
   * @returns 取消监听的函数
   */
  once<T extends keyof FlowEvents>(
    event: T,
    listener: EventListener<T>
  ): () => void {
    return this.on(event, listener, { once: true });
  }

  /**
   * 移除事件监听器
   *
   * @param event 事件名称
   * @param listener 要移除的监听器函数（如果不提供，移除所有监听器）
   */
  off<T extends keyof FlowEvents>(
    event: T,
    listener?: EventListener<T>
  ): void {
    if (!this.listeners.has(event)) {
      return;
    }

    const wrappers = this.listeners.get(event)!;

    if (!listener) {
      // 移除所有监听器
      wrappers.length = 0;
      this.listeners.delete(event);
      return;
    }

    // 移除指定的监听器
    const index = wrappers.findIndex(
      w => w.listener === listener && !w.removed
    );
    if (index > -1) {
      wrappers.splice(index, 1);
    }

    if (wrappers.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * 触发事件
   *
   * @param event 事件名称
   * @param args 事件参数
   * @returns 是否有监听器处理了事件
   *
   * @example
   * ```typescript
   * emitter.emit('onNodeClick', node, mouseEvent);
   * ```
   */
  emit<T extends keyof FlowEvents>(
    event: T,
    ...args: Parameters<NonNullable<FlowEvents[T]>>
  ): boolean {
    if (!this.listeners.has(event)) {
      return false;
    }

    const wrappers = this.listeners.get(event)!;
    const validWrappers = wrappers.filter(w => !w.removed);

    if (validWrappers.length === 0) {
      return false;
    }

    // 执行监听器
    const toRemove: EventListenerWrapper<T>[] = [];

    for (const wrapper of validWrappers) {
      try {
        (wrapper.listener as any)(...args);

        // 如果是一次性监听器，标记为待移除
        if (wrapper.options.once) {
          toRemove.push(wrapper as any);
        }
      } catch (error) {
        console.error(`Error in event listener for "${String(event)}":`, error);
      }
    }

    // 移除一次性监听器
    toRemove.forEach(wrapper => {
      wrapper.removed = true;
      const index = wrappers.indexOf(wrapper as any);
      if (index > -1) {
        wrappers.splice(index, 1);
      }
    });

    if (wrappers.length === 0) {
      this.listeners.delete(event);
    }

    return true;
  }

  /**
   * 获取事件监听器数量
   *
   * @param event 事件名称（如果不提供，返回所有事件的监听器总数）
   * @returns 监听器数量
   */
  listenerCount(event?: keyof FlowEvents): number {
    if (event) {
      return this.listeners.get(event)?.filter(w => !w.removed).length || 0;
    }

    let count = 0;
    this.listeners.forEach(wrappers => {
      count += wrappers.filter(w => !w.removed).length;
    });
    return count;
  }

  /**
   * 获取所有已注册的事件名称
   *
   * @returns 事件名称数组
   */
  eventNames(): (keyof FlowEvents)[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 移除所有事件监听器
   *
   * @param event 事件名称（如果不提供，移除所有事件的监听器）
   */
  removeAllListeners(event?: keyof FlowEvents): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 检查是否有指定事件的监听器
   *
   * @param event 事件名称
   * @returns 是否有监听器
   */
  hasListeners(event: keyof FlowEvents): boolean {
    return this.listenerCount(event) > 0;
  }
}

