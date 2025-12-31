/**
 * 通用拖拽基础 Hook
 *
 * 提供通用的拖拽功能，通过配置和回调适配不同场景。
 * 内置 RAF（requestAnimationFrame）节流优化，确保高性能的拖拽体验。
 *
 * 适用场景：
 * - 画布平移拖拽
 * - 节点拖拽
 * - 节点库拖拽到画布
 * - 其他需要拖拽交互的场景
 *
 * @example
 * ```typescript
 * // 基础用法：直接使用屏幕坐标偏移
 * const drag = useDrag({
 *   onDrag: (result) => {
 *     console.log('拖拽偏移:', result.deltaX, result.deltaY);
 *   }
 * });
 *
 * // 节点拖拽：屏幕坐标偏移 -> 画布坐标偏移
 * import { useDrag } from './useDrag';
 * const drag = useDrag({
 *   transformCoordinates: (screenX, screenY, startX, startY, startNodeX, startNodeY) => {
 *     const screenDeltaX = screenX - startX;
 *     const screenDeltaY = screenY - startY;
 *     // 节点位置已经是画布坐标，只需转换偏移量
 *     const deltaX = screenDeltaX / viewport.zoom;
 *     const deltaY = screenDeltaY / viewport.zoom;
 *     return {
 *       x: startNodeX + deltaX,
 *       y: startNodeY + deltaY,
 *       deltaX: screenDeltaX,
 *       deltaY: screenDeltaY
 *     };
 *   },
 *   onDrag: (result) => {
 *     updateNodePosition(result.x, result.y);
 *   }
 * });
 *
 * // 节点库拖拽到画布：屏幕坐标 -> 画布坐标（使用工具函数）
 * import { screenToCanvas } from '../utils/math-utils';
 * const drag = useDrag({
 *   transformCoordinates: (screenX, screenY, startX, startY) => {
 *     // 使用工具函数将屏幕坐标转换为画布坐标
 *     const canvasPos = screenToCanvas(screenX, screenY, viewport);
 *     return {
 *       x: canvasPos.x,
 *       y: canvasPos.y,
 *       deltaX: screenX - startX,
 *       deltaY: screenY - startY
 *     };
 *   },
 *   onDrag: (result) => {
 *     updatePreviewPosition(result.x, result.y);
 *   }
 * });
 * ```
 */

import { ref, computed, type Ref } from 'vue';
import { isFunction as isFunctionType } from '../utils/type-utils';
import { useRafThrottle } from './useRafThrottle';

/**
 * 拖拽坐标转换结果
 */
export interface DragTransformResult {
  /** 目标坐标 X（转换后的坐标） */
  x: number;
  /** 目标坐标 Y（转换后的坐标） */
  y: number;
  /** 屏幕坐标偏移量 X（原始偏移） */
  deltaX: number;
  /** 屏幕坐标偏移量 Y（原始偏移） */
  deltaY: number;
}

/**
 * 拖拽配置选项
 */
export interface UseDragOptions {
  /**
   * 是否启用拖拽
   *
   * 可以是响应式引用或函数，用于动态控制拖拽的启用状态
   *
   * @default () => true
   */
  enabled?: Ref<boolean> | (() => boolean);

  /**
   * 拖拽开始前的检查函数
   *
   * 返回 `false` 将阻止拖拽开始，用于实现条件拖拽（如检查配置、鼠标按键等）
   *
   * @param event 鼠标按下事件
   * @returns 是否允许开始拖拽
   */
  canStart?: (event: MouseEvent) => boolean;

  /**
   * 坐标转换函数
   *
   * 将屏幕坐标转换为目标坐标系统（如画布坐标、节点坐标等）
   *
   * @param screenX 当前鼠标屏幕坐标 X
   * @param screenY 当前鼠标屏幕坐标 Y
   * @param startScreenX 拖拽开始时的屏幕坐标 X
   * @param startScreenY 拖拽开始时的屏幕坐标 Y
   * @param startTargetX 拖拽开始时的目标坐标 X（可选，由 handleMouseDown 传入）
   * @param startTargetY 拖拽开始时的目标坐标 Y（可选，由 handleMouseDown 传入）
   * @returns 转换后的坐标结果
   *
   * @example
   * ```typescript
   * // 转换为画布坐标（考虑视口和缩放）
   * transformCoordinates: (screenX, screenY, startX, startY, startNodeX, startNodeY) => {
   *   const screenDeltaX = screenX - startX;
   *   const screenDeltaY = screenY - startY;
   *   const deltaX = screenDeltaX / viewport.value.zoom;
   *   const deltaY = screenDeltaY / viewport.value.zoom;
   *   return {
   *     x: startNodeX + deltaX,
   *     y: startNodeY + deltaY,
   *     deltaX: screenDeltaX,
   *     deltaY: screenDeltaY
   *   };
   * }
   * ```
   */
  transformCoordinates?: (
    screenX: number,
    screenY: number,
    startScreenX: number,
    startScreenY: number,
    startTargetX: number,
    startTargetY: number
  ) => DragTransformResult;

  /**
   * 拖拽更新回调
   *
   * 在每次 RAF 更新时调用，用于处理拖拽过程中的位置更新
   *
   * @param result 拖拽结果（包含转换后的坐标和偏移量）
   * @param event 鼠标移动事件
   */
  onDrag: (result: DragTransformResult, event: MouseEvent) => void;

  /**
   * 拖拽开始回调
   *
   * 在拖拽开始时调用，可用于初始化状态、设置样式等
   *
   * @param event 鼠标按下事件
   * @param startTargetX 拖拽开始时的目标坐标 X
   * @param startTargetY 拖拽开始时的目标坐标 Y
   */
  onDragStart?: (event: MouseEvent, startTargetX?: number, startTargetY?: number) => void;

  /**
   * 拖拽结束回调
   *
   * 在拖拽结束时调用，可用于清理状态、触发事件等
   *
   * @param hasMoved 是否发生了实际移动（超过阈值）
   */
  onDragEnd?: (hasMoved: boolean) => void;

  /**
   * 移动阈值（像素）
   *
   * 超过此距离才认为是拖拽，用于区分点击和拖拽
   *
   * @default 5
   */
  dragThreshold?: number;

  /**
   * 是否使用 RAF 节流
   *
   * 启用后，拖拽更新将在每个动画帧最多执行一次，提供更流畅的性能
   *
   * @default true
   */
  useRAF?: boolean;

  /**
   * 是否使用增量模式
   *
   * 启用后，每次更新后重置起始位置，使得 deltaX/deltaY 始终是相对于上一次位置的增量
   * 适用于画布平移等需要增量偏移的场景
   *
   * @default false
   */
  incremental?: boolean;
}

/**
 * 拖拽 Hook 返回值
 */
export interface UseDragReturn {
  /** 是否正在拖拽（响应式） */
  isDragging: Ref<boolean>;
  /** 是否已移动（超过阈值，响应式） */
  hasMoved: Ref<boolean>;
  /** 处理鼠标按下事件 */
  handleMouseDown: (event: MouseEvent, startTargetX?: number, startTargetY?: number) => void;
  /** 处理鼠标移动事件 */
  handleMouseMove: (event: MouseEvent) => void;
  /** 处理鼠标抬起事件 */
  handleMouseUp: () => void;
  /** 清理资源（取消 RAF、重置状态等） */
  cleanup: () => void;
}

/**
 * 通用拖拽 Hook
 *
 * 提供高性能的拖拽功能，内置 RAF 节流优化，支持自定义坐标转换和回调。
 *
 * @param options 拖拽配置选项
 * @returns 拖拽相关的状态和方法
 */
export function useDrag(options: UseDragOptions): UseDragReturn {
  const {
    enabled = () => true,
    canStart,
    transformCoordinates,
    onDrag,
    onDragStart,
    onDragEnd,
    dragThreshold = 5,
    useRAF = true,
    incremental = false
  } = options;

  /** 是否正在拖拽 */
  const isDragging = ref(false);

  /** 是否已移动（超过阈值） */
  const hasMoved = ref(false);

  /** 拖拽状态数据 */
  let dragState: {
    startScreenX: number;
    startScreenY: number;
    startTargetX: number;
    startTargetY: number;
  } | null = null;


  /**
   * 处理鼠标按下事件
   *
   * 开始拖拽，记录起始位置和状态
   *
   * @param event 鼠标按下事件
   * @param startTargetX 拖拽开始时的目标坐标 X（可选，用于绝对定位）
   * @param startTargetY 拖拽开始时的目标坐标 Y（可选，用于绝对定位）
   */
  const handleMouseDown = (
    event: MouseEvent,
    startTargetX: number = 0,
    startTargetY: number = 0
  ) => {
    // 检查是否启用
    const isEnabled = isFunctionType(enabled) ? enabled() : enabled.value;
    if (!isEnabled) return;
    // 检查是否可以开始拖拽
    if (canStart && !canStart(event)) return;

    // 初始化拖拽状态
    isDragging.value = true;
    hasMoved.value = false;

    dragState = {
      startScreenX: event.clientX,
      startScreenY: event.clientY,
      startTargetX,
      startTargetY
    };

    // 触发开始回调
    if (onDragStart) {
      onDragStart(event, startTargetX, startTargetY);
    }

    // 阻止默认行为和事件冒泡
    event.preventDefault();
    event.stopPropagation();
  };

  /**
   * 处理鼠标移动事件
   *
   * 使用 RAF 节流，确保高性能的拖拽更新
   *
   * @param event 鼠标移动事件
   */
  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging.value || !dragState) {
      return;
    }
    // 如果使用 RAF 节流，使用节流版本
    if (useRAF) {
      throttledProcessDrag(event);
    } else {
      // 不使用 RAF，直接处理
      processDrag(event);
    }
  };

  /**
   * 处理拖拽更新
   *
   * 计算坐标偏移，执行坐标转换，调用更新回调
   *
   * @param event 鼠标移动事件
   */
  const processDrag = (event: MouseEvent) => {
    if (!dragState) return;

    // 计算屏幕坐标偏移
    const screenDeltaX = event.clientX - dragState.startScreenX;
    const screenDeltaY = event.clientY - dragState.startScreenY;

    // 计算移动距离（用于判断是否超过阈值）
    const distance = Math.sqrt(screenDeltaX * screenDeltaX + screenDeltaY * screenDeltaY);

    // 检查是否超过阈值
    if (distance >= dragThreshold) {
      hasMoved.value = true;
    }

    // 执行坐标转换
    let result: DragTransformResult;
    if (transformCoordinates) {
      // 使用自定义转换函数
      result = transformCoordinates(
        event.clientX,
        event.clientY,
        dragState.startScreenX,
        dragState.startScreenY,
        dragState.startTargetX,
        dragState.startTargetY
      );
    } else {
      // 默认：直接使用屏幕坐标偏移
      result = {
        x: dragState.startTargetX + screenDeltaX,
        y: dragState.startTargetY + screenDeltaY,
        deltaX: screenDeltaX,
        deltaY: screenDeltaY
      };
    }

    // 调用更新回调
    onDrag(result, event);

    // 如果使用增量模式，重置起始位置（使得下次计算的是增量）
    if (incremental && dragState) {
      // 更新屏幕坐标起始位置（用于计算增量）
      dragState.startScreenX = event.clientX;
      dragState.startScreenY = event.clientY;

      // 如果有坐标转换函数，更新目标坐标起始位置
      // 对于画布平移等不需要坐标转换的场景，不需要更新目标坐标
      if (transformCoordinates) {
        dragState.startTargetX = result.x;
        dragState.startTargetY = result.y;
      }
    }
  };

  /**
   * 处理拖拽更新（节流版本）
   *
   * 使用 useRafThrottle 进行节流，确保每帧最多执行一次
   */
  const { throttled: throttledProcessDrag, cancel: cancelRaf } = useRafThrottle(
    (event: MouseEvent) => {
      // 检查状态是否仍然有效
      if (!dragState || !isDragging.value) return;
      processDrag(event);
    },
    {
      enabled: computed(() => useRAF && isDragging.value)
    }
  );

  /**
   * 处理鼠标抬起事件
   *
   * 结束拖拽，清理状态，触发结束回调
   */
  const handleMouseUp = () => {
    const wasMoved = hasMoved.value;

    // 重置状态
    isDragging.value = false;
    dragState = null;

    // 触发结束回调
    if (onDragEnd) {
      onDragEnd(wasMoved);
    }

    // 清理 RAF（取消待执行的节流）
    cancelRaf();
  };

  /**
   * 清理资源
   *
   * 取消 RAF、重置状态，用于组件卸载时调用
   */
  const cleanup = () => {
    // 取消 RAF（取消待执行的节流）
    cancelRaf();

    // 清理状态
    isDragging.value = false;
    hasMoved.value = false;
    dragState = null;
  };


  return {
    isDragging,
    hasMoved,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    cleanup
  };
}

