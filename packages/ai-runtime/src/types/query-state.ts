/**
 * QueryEngine Turn 间持久状态
 *
 * 对齐 CC QueryEngine.ts submitMessage 中的 turn 间累积数据:
 *
 * - permissionDenials[] — 权限拒绝记录
 * - discoveredSkillNames[] — 已发现的 skill 名称
 * - loadedNestedMemoryPaths[] — 已加载的嵌套记忆路径
 * - snipReplay — snip 回放钩子
 */

/** 权限拒绝记录 */
export interface PermissionDenialRecord {
  readonly toolName: string;
  readonly inputHash: string;
  readonly reason: string;
  readonly timestamp: number;
}

/** Snip 回放钩子 */
export interface SnipReplayConfig {
  /** 是否启用 snip 回放 */
  readonly enabled: boolean;
  /** 回放消息列表 */
  readonly messages?: readonly string[];
}

/** QueryEngine Turn 持久状态 — 跨 turn 维护的累积数据 */
export interface QueryTurnState {
  /** 权限拒绝记录（累积） */
  readonly permissionDenials: readonly PermissionDenialRecord[];
  /** 已发现的 skill 名称（累积） */
  readonly discoveredSkillNames: readonly string[];
  /** 已加载的嵌套记忆路径（累积） */
  readonly loadedNestedMemoryPaths: readonly string[];
  /** Snip 回放配置 */
  readonly snipReplay: SnipReplayConfig;
}

/** 创建初始 turn 状态 */
export function createInitialQueryTurnState(): QueryTurnState {
  return {
    permissionDenials: [],
    discoveredSkillNames: [],
    loadedNestedMemoryPaths: [],
    snipReplay: { enabled: false }
  };
}

/** 记录权限拒绝 */
export function recordPermissionDenial(
  state: QueryTurnState,
  toolName: string,
  inputHash: string,
  reason: string
): QueryTurnState {
  return {
    ...state,
    permissionDenials: [
      ...state.permissionDenials,
      { toolName, inputHash, reason, timestamp: Date.now() }
    ]
  };
}

/** 添加已发现 skill */
export function addDiscoveredSkill(state: QueryTurnState, skillName: string): QueryTurnState {
  if (state.discoveredSkillNames.includes(skillName)) return state;
  return {
    ...state,
    discoveredSkillNames: [...state.discoveredSkillNames, skillName]
  };
}

/** 添加已加载嵌套记忆路径 */
export function addLoadedMemoryPath(state: QueryTurnState, path: string): QueryTurnState {
  if (state.loadedNestedMemoryPaths.includes(path)) return state;
  return {
    ...state,
    loadedNestedMemoryPaths: [...state.loadedNestedMemoryPaths, path]
  };
}

/** 检查是否有权限拒绝记录 */
export function hasPermissionDenial(
  state: QueryTurnState,
  toolName: string,
  inputHash: string
): boolean {
  return state.permissionDenials.some(d => d.toolName === toolName && d.inputHash === inputHash);
}
