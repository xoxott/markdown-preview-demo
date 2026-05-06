/** StateChangeEffect — 状态变更副作用桥接类型 */

export type StateChangeCategory =
  | 'permission_mode' // 权限模式变更
  | 'settings' // 设置变更
  | 'credential_cache' // 凭证缓存变更
  | 'session' // 会话变更
  | 'tool_registry'; // 工具注册变更

export interface StateChangeEffect {
  readonly category: StateChangeCategory;
  readonly key: string;
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
  readonly timestamp: number;
}

/** StateChangeEffectHandler — 副作用处理函数（宿主注入） */
export type StateChangeEffectHandler = (effect: StateChangeEffect) => void;

/** StateChangeBridge — 状态变更副作用桥接接口 */
export interface StateChangeBridge {
  /** 通知状态变更 */
  notify(category: StateChangeCategory, key: string, oldValue?: unknown, newValue?: unknown): void;
  /** 获取所有已处理的效果 */
  readonly processedEffects: readonly StateChangeEffect[];
}

class StateChangeBridgeImpl implements StateChangeBridge {
  private readonly effects: StateChangeEffect[] = [];

  constructor(private readonly handler: StateChangeEffectHandler) {}

  notify(category: StateChangeCategory, key: string, oldValue?: unknown, newValue?: unknown): void {
    const effect: StateChangeEffect = {
      category,
      key,
      oldValue,
      newValue,
      timestamp: Date.now()
    };
    this.effects.push(effect);
    this.handler(effect);
  }

  get processedEffects(): readonly StateChangeEffect[] {
    return this.effects;
  }
}

/** createStateChangeBridge — 创建状态变更副作用桥接 */
export function createStateChangeBridge(handler: StateChangeEffectHandler): StateChangeBridge {
  return new StateChangeBridgeImpl(handler);
}
