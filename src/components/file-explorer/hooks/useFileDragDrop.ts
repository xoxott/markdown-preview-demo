import { computed, ref } from 'vue';
import type { DragDropOptions, DragState, DropZoneState, FileItem } from '../types/file-explorer';
export function useFileDragDrop(options: DragDropOptions = {}) {
  const {
    onDragStart,
    onDragEnd,
    onDrop,
    onMove,
    onCopy,
    validateDrop,
    allowMultiple = true,
    acceptedTypes = ['file', 'folder']
  } = options;

  // 拖拽状态
  const dragState = ref<DragState>({
    isDragging: false,
    draggedItems: [],
    dragStartPos: null,
    dragCurrentPos: null
  });

  // 放置区域状态映射
  const dropZones = ref<Map<string, DropZoneState>>(new Map());

  // 当前操作类型（移动或复制）
  const dragOperation = ref<'move' | 'copy'>('move');

  // 计算属性
  const isDragging = computed(() => dragState.value.isDragging);
  const draggedCount = computed(() => dragState.value.draggedItems.length);
  const dragOffset = computed(() => {
    if (!dragState.value.dragStartPos || !dragState.value.dragCurrentPos) {
      return { x: 0, y: 0 };
    }
    return {
      x: dragState.value.dragCurrentPos.x - dragState.value.dragStartPos.x,
      y: dragState.value.dragCurrentPos.y - dragState.value.dragStartPos.y
    };
  });

  /** 开始拖拽 */
  const startDrag = (items: FileItem[], event: DragEvent, operation: 'move' | 'copy' = 'move') => {
    if (!allowMultiple && items.length > 1) {
      items = [items[0]];
    }

    // 过滤不支持的类型
    const validItems = items.filter(item => acceptedTypes.includes(item.type));
    if (validItems.length === 0) return;

    dragState.value = {
      isDragging: true,
      draggedItems: validItems,
      dragStartPos: { x: event.clientX, y: event.clientY },
      dragCurrentPos: { x: event.clientX, y: event.clientY }
    };

    dragOperation.value = operation;

    // 设置拖拽数据
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = operation === 'copy' ? 'copy' : 'move';
      event.dataTransfer.setData(
        'application/file-explorer',
        JSON.stringify({
          items: validItems.map(item => item.id),
          operation
        })
      );
    }

    onDragStart?.(validItems);
  };

  /** 拖拽移动 */
  const updateDragPosition = (event: DragEvent) => {
    if (!dragState.value.isDragging) return;

    // 确保即使 clientX/Y 为 0 也更新位置
    // 某些浏览器在拖拽到某些元素时会返回 0
    if (event.clientX !== 0 || event.clientY !== 0) {
      dragState.value.dragCurrentPos = {
        x: event.clientX,
        y: event.clientY
      };
    }
  };

  /** 结束拖拽 */
  const endDrag = () => {
    dragState.value = {
      isDragging: false,
      draggedItems: [],
      dragStartPos: null,
      dragCurrentPos: null
    };

    // 清空所有放置区域状态
    dropZones.value.clear();

    onDragEnd?.();
  };

  /** 全局 dragend 事件处理（推荐在组件中监听） 注意：这个函数需要在组件的 @dragend 事件中调用 或者使用增强版 useFileDragDropEnhanced 自动处理 */
  const handleDragEnd = (event?: DragEvent) => {
    if (isDragging.value) {
      endDrag();
    }
  };

  /** 注册放置区域 */
  const registerDropZone = (zoneId: string, targetPath: string) => {
    if (!dropZones.value.has(zoneId)) {
      dropZones.value.set(zoneId, {
        isOver: false,
        canDrop: false,
        targetPath
      });
    }
  };

  /** 注销放置区域 */
  const unregisterDropZone = (zoneId: string) => {
    dropZones.value.delete(zoneId);
  };

  /** 获取放置区域状态 */
  const getDropZoneState = (zoneId: string): DropZoneState | undefined => {
    return dropZones.value.get(zoneId);
  };

  /** 进入放置区域 */
  const enterDropZone = (zoneId: string, targetPath: string) => {
    const items = dragState.value.draggedItems;
    if (items.length === 0) return;

    // 验证是否可以放置
    const canDrop = validateDropInternal(items, targetPath);

    dropZones.value.set(zoneId, {
      isOver: true,
      canDrop,
      targetPath
    });
  };

  /** 离开放置区域 */
  const leaveDropZone = (zoneId: string) => {
    const zone = dropZones.value.get(zoneId);
    if (zone) {
      dropZones.value.set(zoneId, {
        ...zone,
        isOver: false
      });
    }
  };

  /** 内部验证放置 */
  const validateDropInternal = (items: FileItem[], targetPath: string): boolean => {
    // 自定义验证
    if (validateDrop && !validateDrop(items, targetPath)) {
      return false;
    }

    // 基本验证：不能拖到自己或子目录
    return items.every(item => {
      // 不能拖到自己
      if (item.path === targetPath) return false;

      // 不能拖到自己的子目录
      if (targetPath.startsWith(`${item.path}/`)) return false;

      return true;
    });
  };

  /** 执行放置 */
  const executeDrop = async (zoneId: string) => {
    const zone = dropZones.value.get(zoneId);
    if (!zone || !zone.canDrop || !zone.targetPath) return;

    const items = dragState.value.draggedItems;
    const targetPath = zone.targetPath;
    const operation = dragOperation.value;

    try {
      // 触发通用 drop 回调
      await onDrop?.(items, targetPath);

      // 根据操作类型触发具体回调
      if (operation === 'copy') {
        await onCopy?.(items, targetPath);
      } else {
        await onMove?.(items, targetPath);
      }
    } finally {
      endDrag();
    }
  };

  /** 检测修饰键改变操作类型 */
  const updateDragOperation = (event: DragEvent) => {
    // Ctrl/Cmd 键 = 复制，否则移动
    dragOperation.value = event.ctrlKey || event.metaKey ? 'copy' : 'move';

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dragOperation.value;
    }
  };

  return {
    // 状态
    dragState,
    isDragging,
    draggedCount,
    dragOffset,
    dragOperation,

    // 方法
    startDrag,
    updateDragPosition,
    updateDragOperation,
    endDrag,
    registerDropZone,
    unregisterDropZone,
    getDropZoneState,
    enterDropZone,
    leaveDropZone,
    executeDrop
  };
}
