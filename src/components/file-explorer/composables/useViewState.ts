import type { Ref } from 'vue';
import { ref } from 'vue';
import { useToggle } from '@vueuse/core';
import type { GridSize, ViewMode } from '../types/file-explorer';
import type { LayoutConfig } from '../layout/ResizableLayout';

export interface UseViewStateReturn {
  // 视图状态
  collapsed: Ref<boolean>;
  gridSize: Ref<GridSize>;
  viewMode: Ref<ViewMode>;
  loading: Ref<boolean>;
  loadingTip: Ref<string>;
  layoutConfig: Ref<LayoutConfig>;
  showInfoPanel: Ref<boolean>;

  // 操作进度
  operationProgress: Ref<number>;
  operationText: Ref<string>;

  // 存储信息
  storageUsed: Ref<number>;
  storageTotal: Ref<number>;
  showStorage: Ref<boolean>;

  // 方法
  setLoading: (value: boolean, tip?: string) => void;
  setOperationProgress: (progress: number, text?: string) => void;
  clearOperationProgress: () => void;
  handleViewModeChange: (value: ViewMode) => void;
  handleGridSizeChange: (size: GridSize) => void;
  toggleInfoPanel: () => void;
}

/** 视图状态 composable — 管理布局、UI 状态、操作进度、存储信息 */
export function useViewState(): UseViewStateReturn {
  // 视图/布局状态
  const collapsed = ref(false);
  const gridSize = ref<GridSize>('small');
  const viewMode = ref<ViewMode>('grid');
  const loading = ref(false);
  const loadingTip = ref('加载中...');
  const setLoading = (value: boolean, tip?: string) => {
    loading.value = value;
    if (tip !== undefined) {
      loadingTip.value = tip;
    }
  };
  const layoutConfig = ref<LayoutConfig>({
    leftWidth: 180,
    rightWidth: 300,
    minRightWidth: 200,
    maxRightWidth: 1000,
    showLeft: true,
    showRight: false
  });

  // 信息面板
  const [showInfoPanel, toggleInfoPanel] = useToggle(false);

  // 操作进度
  const operationProgress = ref(0);
  const operationText = ref('');
  const setOperationProgress = (progress: number, text?: string) => {
    operationProgress.value = Math.max(0, Math.min(100, progress));
    if (text !== undefined) {
      operationText.value = text;
    }
  };
  const clearOperationProgress = () => {
    operationProgress.value = 0;
    operationText.value = '';
  };

  // 存储信息
  const storageUsed = ref(0);
  const storageTotal = ref(0);
  const showStorage = ref(false);

  // 事件处理
  const handleViewModeChange = (value: ViewMode) => {
    viewMode.value = value;
  };
  const handleGridSizeChange = (size: GridSize) => {
    gridSize.value = size;
  };

  return {
    collapsed,
    gridSize,
    viewMode,
    loading,
    loadingTip,
    layoutConfig,
    showInfoPanel,
    operationProgress,
    operationText,
    storageUsed,
    storageTotal,
    showStorage,
    setLoading,
    setOperationProgress,
    clearOperationProgress,
    handleViewModeChange,
    handleGridSizeChange,
    toggleInfoPanel
  };
}
