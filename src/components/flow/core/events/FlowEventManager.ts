/**
 * Flow 事件管理器
 *
 * 提供多实例事件管理、事件命名空间、事件转发等功能
 */

import { FlowEventEmitter } from './FlowEventEmitter';
import type { FlowEvents } from '../../types/flow-events';

/**
 * 事件管理器实例
 */
interface EventManagerInstance {
  /** 实例 ID */
  id: string;
  /** 事件发射器 */
  emitter: FlowEventEmitter;
  /** 创建时间 */
  createdAt: number;
}

/**
 * Flow 事件管理器
 *
 * 支持多实例事件管理，每个画布可以有独立的事件系统
 */
export class FlowEventManager {
  /** 事件管理器实例存储 */
  private instances: Map<string, EventManagerInstance> = new Map();

  /** 全局事件发射器（用于跨实例事件） */
  private globalEmitter: FlowEventEmitter = new FlowEventEmitter();

  /**
   * 创建事件管理器实例
   *
   * @param id 实例 ID（通常是画布 ID）
   * @returns 事件发射器
   */
  createInstance(id: string): FlowEventEmitter {
    if (this.instances.has(id)) {
      console.warn(`Event manager instance with id "${id}" already exists`);
      return this.instances.get(id)!.emitter;
    }

    const emitter = new FlowEventEmitter();
    const instance: EventManagerInstance = {
      id,
      emitter,
      createdAt: Date.now()
    };

    this.instances.set(id, instance);

    return emitter;
  }

  /**
   * 获取事件管理器实例
   *
   * @param id 实例 ID
   * @returns 事件发射器，如果不存在则返回 undefined
   */
  getInstance(id: string): FlowEventEmitter | undefined {
    return this.instances.get(id)?.emitter;
  }

  /**
   * 获取或创建事件管理器实例
   *
   * @param id 实例 ID
   * @returns 事件发射器
   */
  getOrCreateInstance(id: string): FlowEventEmitter {
    const instance = this.getInstance(id);
    if (instance) {
      return instance;
    }
    return this.createInstance(id);
  }

  /**
   * 删除事件管理器实例
   *
   * @param id 实例 ID
   */
  deleteInstance(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.emitter.removeAllListeners();
      this.instances.delete(id);
    }
  }

  /**
   * 获取全局事件发射器
   *
   * 用于跨实例事件通信
   *
   * @returns 全局事件发射器
   */
  getGlobalEmitter(): FlowEventEmitter {
    return this.globalEmitter;
  }

  /**
   * 转发事件
   *
   * 将一个实例的事件转发到另一个实例或全局
   *
   * @param fromId 源实例 ID
   * @param toId 目标实例 ID（如果为 'global'，转发到全局）
   * @param events 要转发的事件名称数组
   */
  forwardEvents(
    fromId: string,
    toId: string | 'global',
    events: (keyof FlowEvents)[]
  ): () => void {
    const fromEmitter = this.getInstance(fromId);
    if (!fromEmitter) {
      console.warn(`Event manager instance "${fromId}" not found`);
      return () => {};
    }

    const toEmitter =
      toId === 'global'
        ? this.globalEmitter
        : this.getOrCreateInstance(toId);

    const unsubscribes: (() => void)[] = [];

    events.forEach(event => {
      // 使用类型断言来处理事件转发
      const handler = ((...args: any[]) => {
        (toEmitter.emit as any)(event, ...args);
      }) as any;
      const unsubscribe = (fromEmitter.on as any)(event, handler);
      unsubscribes.push(unsubscribe);
    });

    // 返回取消转发的函数
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * 广播事件
   *
   * 向所有实例广播事件
   *
   * @param event 事件名称
   * @param args 事件参数
   */
  broadcast<T extends keyof FlowEvents>(
    event: T,
    ...args: Parameters<NonNullable<FlowEvents[T]>>
  ): void {
    this.instances.forEach(instance => {
      instance.emitter.emit(event, ...args);
    });
    this.globalEmitter.emit(event, ...args);
  }

  /**
   * 获取所有实例 ID
   *
   * @returns 实例 ID 数组
   */
  getAllInstanceIds(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * 检查实例是否存在
   *
   * @param id 实例 ID
   * @returns 是否存在
   */
  hasInstance(id: string): boolean {
    return this.instances.has(id);
  }

  /**
   * 清理所有实例
   */
  clear(): void {
    this.instances.forEach(instance => {
      instance.emitter.removeAllListeners();
    });
    this.instances.clear();
    this.globalEmitter.removeAllListeners();
  }
}

/**
 * 全局事件管理器单例
 */
let globalEventManager: FlowEventManager | null = null;

/**
 * 获取全局事件管理器
 *
 * @returns 全局事件管理器实例
 */
export function getGlobalEventManager(): FlowEventManager {
  if (!globalEventManager) {
    globalEventManager = new FlowEventManager();
  }
  return globalEventManager;
}

/**
 * 创建新的事件管理器实例
 *
 * @returns 新的事件管理器实例
 */
export function createFlowEventManager(): FlowEventManager {
  return new FlowEventManager();
}

