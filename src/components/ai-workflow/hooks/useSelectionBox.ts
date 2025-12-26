import { ref, computed } from 'vue';

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function useSelectionBox() {
  const selectionBox = ref<SelectionBox | null>(null);
  const isSelecting = computed(() => selectionBox.value !== null);

  /** 开始框选 */
  function startSelection(x: number, y: number) {
    selectionBox.value = {
      startX: x,
      startY: y,
      endX: x,
      endY: y
    };
  }

  /** 更新框选区域 */
  function updateSelection(x: number, y: number) {
    if (selectionBox.value) {
      selectionBox.value.endX = x;
      selectionBox.value.endY = y;
    }
  }

  /** 结束框选 */
  function endSelection() {
    selectionBox.value = null;
  }

  /** 获取框选矩形的标准化坐标 */
  const normalizedBox = computed(() => {
    if (!selectionBox.value) return null;

    const { startX, startY, endX, endY } = selectionBox.value;
    return {
      left: Math.min(startX, endX),
      top: Math.min(startY, endY),
      right: Math.max(startX, endX),
      bottom: Math.max(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    };
  });

  /** 检查节点是否在框选区域内 */
  function isNodeInSelection(
    nodeX: number,
    nodeY: number,
    nodeWidth: number,
    nodeHeight: number,
    zoom: number,
    viewportX: number,
    viewportY: number
  ): boolean {
    if (!normalizedBox.value) return false;

    // 将节点坐标转换为屏幕坐标
    const screenX = nodeX * zoom + viewportX;
    const screenY = nodeY * zoom + viewportY;
    const screenWidth = nodeWidth * zoom;
    const screenHeight = nodeHeight * zoom;

    // 检查节点是否与框选区域相交
    const { left, top, right, bottom } = normalizedBox.value;
    return !(
      screenX + screenWidth < left ||
      screenX > right ||
      screenY + screenHeight < top ||
      screenY > bottom
    );
  }

  return {
    selectionBox,
    isSelecting,
    normalizedBox,
    startSelection,
    updateSelection,
    endSelection,
    isNodeInSelection
  };
}

