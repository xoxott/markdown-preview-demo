/**
 * FlowCanvas Props 同步 Hook
 *
 * 负责将外部传入的 props 同步到内部状态管理系统
 */

import { watch, type Ref, type ComputedRef, type WatchStopHandle } from 'vue';
import { compareIds } from '../utils/array-utils';
import type { FlowNode, FlowEdge } from '../types';
import type { IStateStore } from '../core/state/interfaces/IStateStore';

/**
 * FlowCanvas Props 同步 Hook 选项
 */
export interface UseFlowCanvasPropsSyncOptions {
  /** 外部传入的初始节点列表（可以是 Ref、ComputedRef 或函数，用于响应式） */
  initialNodes?: Ref<FlowNode[] | undefined> | ComputedRef<FlowNode[] | undefined> | (() => FlowNode[] | undefined);
  /** 外部传入的初始连接线列表（可以是 Ref、ComputedRef 或函数，用于响应式） */
  initialEdges?: Ref<FlowEdge[] | undefined> | ComputedRef<FlowEdge[] | undefined> | (() => FlowEdge[] | undefined);
  /** 内部状态存储实例 */
  stateStore: IStateStore;
  /** 内部节点列表（用于比较） */
  nodes: Ref<FlowNode[]>;
  /** 内部连接线列表（用于比较） */
  edges: Ref<FlowEdge[]>;
}

/**
 * FlowCanvas Props 同步 Hook 返回值
 */
export interface UseFlowCanvasPropsSyncReturn {
  /** 开始同步（通常在组件挂载后调用） */
  start: () => void;
  /** 停止同步（通常在组件卸载时调用） */
  stop: () => void;
}

/**
 * 创建同步监听器
 */
function createSyncWatcher<T extends { id: string }>(
  source: Ref<T[] | undefined> | ComputedRef<T[] | undefined> | (() => T[] | undefined),
  current: Ref<T[]>,
  setter: (items: T[]) => void
): WatchStopHandle {
  return watch(
    source,
    (newItems) => {
      if (newItems && newItems.length > 0 && !compareIds(current.value, newItems)) {
        setter(newItems);
      }
    },
    { immediate: false }
  );
}

/**
 * FlowCanvas Props 同步 Hook
 *
 * 监听外部 props 变化，同步到内部状态管理系统
 *
 * @param options Hook 选项
 * @returns 同步控制方法
 *
 * @example
 * ```typescript
 * const { start, stop } = useFlowCanvasPropsSync({
 *   initialNodes: computed(() => props.initialNodes),
 *   initialEdges: computed(() => props.initialEdges),
 *   stateStore,
 *   nodes,
 *   edges
 * });
 *
 * onMounted(() => start());
 * onUnmounted(() => stop());
 * ```
 */
export function useFlowCanvasPropsSync(
  options: UseFlowCanvasPropsSyncOptions
): UseFlowCanvasPropsSyncReturn {
  const { initialNodes, initialEdges, stateStore, nodes, edges } = options;

  const watchers: WatchStopHandle[] = [];

  const start = () => {
    if (initialNodes) {
      watchers.push(
        createSyncWatcher(initialNodes, nodes, (newNodes) => stateStore.setNodes(newNodes))
      );
    }

    if (initialEdges) {
      watchers.push(
        createSyncWatcher(initialEdges, edges, (newEdges) => stateStore.setEdges(newEdges))
      );
    }
  };

  const stop = () => {
    watchers.forEach((stop) => stop());
    watchers.length = 0;
  };

  return { start, stop };
}
