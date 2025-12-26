import { ref } from 'vue';

export interface HistoryState {
  nodes: Api.Workflow.WorkflowNode[];
  connections: Api.Workflow.Connection[];
}

export interface HistoryOptions {
  maxSize?: number; // 最大历史记录数
}

export function useHistory(options: HistoryOptions = {}) {
  const { maxSize = 50 } = options;

  const history = ref<HistoryState[]>([]);
  const currentIndex = ref(-1);

  /** 添加历史记录 */
  function pushState(state: HistoryState) {
    // 移除当前索引之后的所有历史记录
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1);
    }

    // 深拷贝状态
    const clonedState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      connections: JSON.parse(JSON.stringify(state.connections))
    };

    history.value.push(clonedState);
    currentIndex.value = history.value.length - 1;

    // 限制历史记录大小
    if (history.value.length > maxSize) {
      history.value.shift();
      currentIndex.value--;
    }
  }

  /** 撤销 */
  function undo(): HistoryState | null {
    if (!canUndo.value) return null;
    currentIndex.value--;
    return getCurrentState();
  }

  /** 重做 */
  function redo(): HistoryState | null {
    if (!canRedo.value) return null;
    currentIndex.value++;
    return getCurrentState();
  }

  /** 获取当前状态 */
  function getCurrentState(): HistoryState | null {
    if (currentIndex.value < 0 || currentIndex.value >= history.value.length) {
      return null;
    }
    // 返回深拷贝，避免外部修改影响历史记录
    const state = history.value[currentIndex.value];
    return {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      connections: JSON.parse(JSON.stringify(state.connections))
    };
  }

  /** 是否可以撤销 */
  const canUndo = ref(false);
  /** 是否可以重做 */
  const canRedo = ref(false);

  // 监听索引变化，更新 canUndo 和 canRedo
  const updateFlags = () => {
    canUndo.value = currentIndex.value > 0;
    canRedo.value = currentIndex.value < history.value.length - 1;
  };

  /** 清空历史记录 */
  function clear() {
    history.value = [];
    currentIndex.value = -1;
    updateFlags();
  }

  return {
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    getCurrentState,
    clear,
    updateFlags
  };
}

