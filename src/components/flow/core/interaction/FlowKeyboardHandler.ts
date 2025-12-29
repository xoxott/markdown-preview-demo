/**
 * Flow 键盘快捷键处理器
 *
 * 处理键盘快捷键的注册、处理、冲突检测等
 */

/**
 * 快捷键组合
 */
export interface KeyBinding {
  /** 主键 */
  key: string;
  /** Ctrl 键 */
  ctrl?: boolean;
  /** Shift 键 */
  shift?: boolean;
  /** Alt 键 */
  alt?: boolean;
  /** Meta 键（Cmd） */
  meta?: boolean;
}

/**
 * 快捷键处理器函数
 */
export type KeyHandler = (event: KeyboardEvent) => void | boolean;

/**
 * 快捷键注册项
 */
export interface KeyBindingRegistration {
  /** 快捷键组合 */
  binding: KeyBinding;
  /** 处理器函数 */
  handler: KeyHandler;
  /** 描述 */
  description?: string;
  /** 优先级（数字越大优先级越高） */
  priority?: number;
  /** 是否阻止默认行为 */
  preventDefault?: boolean;
  /** 是否阻止事件传播 */
  stopPropagation?: boolean;
}

/**
 * Flow 键盘快捷键处理器
 */
export class FlowKeyboardHandler {
  /** 快捷键注册表 */
  private bindings: Map<string, KeyBindingRegistration[]> = new Map();
  /** 是否启用 */
  private enabled: boolean = true;

  /**
   * 注册快捷键
   *
   * @param binding 快捷键组合
   * @param handler 处理器函数
   * @param options 选项
   * @returns 取消注册的函数
   */
  register(
    binding: KeyBinding,
    handler: KeyHandler,
    options?: {
      description?: string;
      priority?: number;
      preventDefault?: boolean;
      stopPropagation?: boolean;
    }
  ): () => void {
    const key = this.getBindingKey(binding);
    const registration: KeyBindingRegistration = {
      binding,
      handler,
      description: options?.description,
      priority: options?.priority || 0,
      preventDefault: options?.preventDefault ?? true,
      stopPropagation: options?.stopPropagation ?? false
    };

    if (!this.bindings.has(key)) {
      this.bindings.set(key, []);
    }

    const handlers = this.bindings.get(key)!;
    handlers.push(registration);

    // 按优先级排序
    handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // 返回取消注册的函数
    return () => {
      const index = handlers.indexOf(registration);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.bindings.delete(key);
      }
    };
  }

  /**
   * 取消注册快捷键
   *
   * @param binding 快捷键组合
   * @param handler 处理器函数（可选，如果不提供则移除所有）
   */
  unregister(binding: KeyBinding, handler?: KeyHandler): void {
    const key = this.getBindingKey(binding);
    const handlers = this.bindings.get(key);

    if (!handlers) {
      return;
    }

    if (handler) {
      const index = handlers.findIndex(r => r.handler === handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      handlers.length = 0;
    }

    if (handlers.length === 0) {
      this.bindings.delete(key);
    }
  }

  /**
   * 处理键盘事件
   *
   * @param event 键盘事件
   * @returns 是否处理了事件
   */
  handle(event: KeyboardEvent): boolean {
    if (!this.enabled) {
      return false;
    }

    const binding: KeyBinding = {
      key: event.key.toLowerCase(),
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };

    const key = this.getBindingKey(binding);
    const handlers = this.bindings.get(key);

    if (!handlers || handlers.length === 0) {
      return false;
    }

    // 执行所有处理器（按优先级）
    let handled = false;
    for (const registration of handlers) {
      if (registration.preventDefault) {
        event.preventDefault();
      }
      if (registration.stopPropagation) {
        event.stopPropagation();
      }

      const result = registration.handler(event);
      if (result !== false) {
        handled = true;
        // 如果返回 false，继续执行下一个处理器
        // 如果返回 true 或 undefined，停止执行
        if (result) {
          break;
        }
      }
    }

    return handled;
  }

  /**
   * 启用快捷键处理
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用快捷键处理
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 检查是否启用
   *
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取快捷键的字符串键
   *
   * @param binding 快捷键组合
   * @returns 字符串键
   */
  private getBindingKey(binding: KeyBinding): string {
    const parts: string[] = [];

    if (binding.ctrl) parts.push('ctrl');
    if (binding.shift) parts.push('shift');
    if (binding.alt) parts.push('alt');
    if (binding.meta) parts.push('meta');

    parts.push(binding.key.toLowerCase());

    return parts.join('+');
  }

  /**
   * 检查快捷键是否冲突
   *
   * @param binding 快捷键组合
   * @returns 是否冲突
   */
  hasConflict(binding: KeyBinding): boolean {
    const key = this.getBindingKey(binding);
    const handlers = this.bindings.get(key);
    return handlers !== undefined && handlers.length > 0;
  }

  /**
   * 获取所有注册的快捷键
   *
   * @returns 快捷键注册项数组
   */
  getAllBindings(): KeyBindingRegistration[] {
    const all: KeyBindingRegistration[] = [];
    this.bindings.forEach(handlers => {
      all.push(...handlers);
    });
    return all;
  }

  /**
   * 清空所有快捷键
   */
  clear(): void {
    this.bindings.clear();
  }
}

