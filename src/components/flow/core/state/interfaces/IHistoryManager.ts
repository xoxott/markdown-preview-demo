/**
 * 历史记录管理接口（框架无关）
 *
 * 定义历史记录管理的标准接口，支持撤销/重做功能
 */

import type { FlowStateSnapshot } from '../types';

/**
 * 历史记录管理接口
 *
 * 所有历史记录管理器实现必须实现此接口
 */
export interface IHistoryManager {
  /**
   * 保存当前状态到历史记录
   */
  pushHistory(): void;

  /**
   * 撤销操作
   *
   * @returns 是否成功撤销
   */
  undo(): boolean;

  /**
   * 重做操作
   *
   * @returns 是否成功重做
   */
  redo(): boolean;

  /**
   * 检查是否可以撤销
   *
   * @returns 是否可以撤销
   */
  canUndo(): boolean;

  /**
   * 检查是否可以重做
   *
   * @returns 是否可以重做
   */
  canRedo(): boolean;

  /**
   * 清空历史记录
   */
  clearHistory(): void;

  /**
   * 获取历史记录数量
   *
   * @returns 历史记录数量
   */
  getHistorySize(): number;

  /**
   * 创建当前状态快照
   *
   * @returns 状态快照
   */
  createSnapshot(): FlowStateSnapshot;

  /**
   * 从快照恢复状态
   *
   * @param snapshot 状态快照
   */
  restoreSnapshot(snapshot: FlowStateSnapshot): void;

  /**
   * 重置到初始状态
   */
  reset(): void;
}

