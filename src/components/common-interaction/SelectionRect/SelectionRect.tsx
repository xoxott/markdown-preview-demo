/**
 * SelectionRect - 通用圈选框组件
 *
 * 提供鼠标拖拽框选功能，支持自动滚动、阈值控制等特性
 */

import { computed, defineComponent, onBeforeUnmount, onMounted, ref, type CSSProperties, type PropType } from 'vue';
import { useEventListener, useThrottleFn } from '@vueuse/core';
import type { Point, Rect, SelectableItem, SelectionCallbackParams } from '../types';
import { createRectFromPoints, distance, isRectIntersect } from '../utils/geometry';
import { getAutoScrollDirection, getScrollContainer, performAutoScroll } from '../utils/scroll';
import '@/styles/common-interaction.scss';

export default defineComponent({
  name: 'SelectionRect',
  props: {
    /** 禁用圈选 */
    disabled: {
      type: Boolean,
      default: false
    },
    /** 容器选择器 */
    containerSelector: {
      type: String,
      required: true
    },
    /** 可选元素选择器 */
    selectableSelector: {
      type: String,
      required: true
    },
    /** 阻止圈选的元素选择器 */
    preventSelector: {
      type: String,
      default: '[data-prevent-selection]'
    },
    /** 触发圈选的最小移动距离（像素） */
    threshold: {
      type: Number,
      default: 5
    },
    /** 是否启用自动滚动 */
    autoScroll: {
      type: Boolean,
      default: true
    },
    /** 自动滚动速度 */
    scrollSpeed: {
      type: Number,
      default: 10
    },
    /** 自动滚动触发边距 */
    scrollEdge: {
      type: Number,
      default: 50
    },
    /** 选区矩形自定义样式 */
    rectStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },
    /** 选区矩形自定义类名 */
    rectClass: {
      type: String,
      default: ''
    },
    /** 是否使用 Shift 键多选模式 */
    useShiftKey: {
      type: Boolean,
      default: true
    },
    /** 自定义数据提取器 */
    itemExtractor: {
      type: Function as PropType<(element: HTMLElement) => any>,
      default: undefined
    },
    /** 自定义验证器 */
    validator: {
      type: Function as PropType<(item: SelectableItem) => boolean>,
      default: undefined
    }
  },
  emits: {
    'selection-start': () => true,
    'selection-change': (_params: SelectionCallbackParams) => true,
    'selection-end': (_params: SelectionCallbackParams) => true
  },
  setup(props, { emit, slots }) {
    // ==================== 状态管理 ====================

    const isSelecting = ref(false);
    const startPoint = ref<Point | null>(null);
    const currentPoint = ref<Point | null>(null);
    const containerElement = ref<HTMLElement | null>(null);
    const scrollContainer = ref<HTMLElement | null>(null);
    const autoScrollTimer = ref<number | null>(null);

    // ==================== 计算属性 ====================

    /** 选区矩形 */
    const selectionRect = computed<Rect | null>(() => {
      if (!startPoint.value || !currentPoint.value) return null;
      return createRectFromPoints(startPoint.value, currentPoint.value);
    });

    /** 选区样式 */
    const selectionStyle = computed<CSSProperties>(() => {
      if (!selectionRect.value) return { display: 'none' };

      return {
        position: 'absolute',
        left: `${selectionRect.value.left}px`,
        top: `${selectionRect.value.top}px`,
        width: `${selectionRect.value.width}px`,
        height: `${selectionRect.value.height}px`,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        border: '2px solid #2196f3',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 9999,
        ...props.rectStyle
      };
    });

    // ==================== 核心逻辑 ====================

    /**
     * 获取所有可选元素
     */
    function getSelectableElements(): SelectableItem[] {
      if (!containerElement.value) return [];

      const elements = containerElement.value.querySelectorAll<HTMLElement>(props.selectableSelector);
      const items: SelectableItem[] = [];

      elements.forEach(element => {
        const id = element.dataset.selectableId || element.id;
        if (!id) return;

        const rect = element.getBoundingClientRect();
        const containerRect = containerElement.value!.getBoundingClientRect();

        // 转换为相对于容器的坐标
        const relativeRect = new DOMRect(
          rect.left - containerRect.left + (scrollContainer.value?.scrollLeft || 0),
          rect.top - containerRect.top + (scrollContainer.value?.scrollTop || 0),
          rect.width,
          rect.height
        );

        const item: SelectableItem = {
          id,
          element,
          rect: relativeRect,
          data: props.itemExtractor ? props.itemExtractor(element) : undefined
        };

        // 自定义验证
        if (props.validator && !props.validator(item)) {
          return;
        }

        items.push(item);
      });

      return items;
    }

    /**
     * 获取选中的元素
     */
    function getSelectedItems(): SelectableItem[] {
      if (!selectionRect.value) return [];

      const selectableItems = getSelectableElements();
      return selectableItems.filter(item => isRectIntersect(selectionRect.value!, item.rect));
    }

    /**
     * 触发选择变化事件
     */
    function emitSelectionChange() {
      if (!selectionRect.value) return;

      const selectedItems = getSelectedItems();
      const params: SelectionCallbackParams = {
        selectedIds: selectedItems.map(item => item.id),
        selectedItems,
        selectionRect: selectionRect.value
      };

      emit('selection-change', params);
    }

    /**
     * 开始自动滚动
     */
    function startAutoScroll(mousePos: Point) {
      if (!props.autoScroll || !scrollContainer.value) return;

      const containerRect = scrollContainer.value.getBoundingClientRect();
      const direction = getAutoScrollDirection(mousePos, containerRect, props.scrollEdge);

      if (direction) {
        performAutoScroll(scrollContainer.value, direction, props.scrollSpeed);

        // 继续自动滚动
        autoScrollTimer.value = window.requestAnimationFrame(() => {
          startAutoScroll(mousePos);
        });
      } else {
        stopAutoScroll();
      }
    }

    /**
     * 停止自动滚动
     */
    function stopAutoScroll() {
      if (autoScrollTimer.value) {
        window.cancelAnimationFrame(autoScrollTimer.value);
        autoScrollTimer.value = null;
      }
    }

    // ==================== 事件处理 ====================

    /**
     * 鼠标按下
     */
    function handleMouseDown(e: MouseEvent) {
      if (props.disabled) return;
      if (e.button !== 0) return; // 只响应左键

      // 检查是否点击在阻止选择的元素上
      const target = e.target as HTMLElement;
      if (target.closest(props.preventSelector)) return;

      // 检查是否点击在可选元素上（如果使用 Shift 键多选模式）
      if (props.useShiftKey && !e.shiftKey) {
        const clickedSelectable = target.closest(props.selectableSelector);
        if (clickedSelectable) return;
      }

      const containerRect = containerElement.value?.getBoundingClientRect();
      if (!containerRect) return;

      const scrollLeft = scrollContainer.value?.scrollLeft || 0;
      const scrollTop = scrollContainer.value?.scrollTop || 0;

      startPoint.value = {
        x: e.clientX - containerRect.left + scrollLeft,
        y: e.clientY - containerRect.top + scrollTop
      };

      // 阻止默认行为
      e.preventDefault();
    }

    /**
     * 鼠标移动（节流）
     */
    const handleMouseMove = useThrottleFn((e: MouseEvent) => {
      if (!startPoint.value || props.disabled) return;

      const containerRect = containerElement.value?.getBoundingClientRect();
      if (!containerRect) return;

      const scrollLeft = scrollContainer.value?.scrollLeft || 0;
      const scrollTop = scrollContainer.value?.scrollTop || 0;

      const current: Point = {
        x: e.clientX - containerRect.left + scrollLeft,
        y: e.clientY - containerRect.top + scrollTop
      };

      // 检查是否超过阈值
      if (!isSelecting.value) {
        const dist = distance(startPoint.value, current);
        if (dist < props.threshold) return;

        isSelecting.value = true;
        emit('selection-start');
      }

      currentPoint.value = current;
      emitSelectionChange();

      // 自动滚动
      if (props.autoScroll) {
        startAutoScroll({ x: e.clientX, y: e.clientY });
      }
    }, 16); // ~60fps

    /**
     * 鼠标释放
     */
    function handleMouseUp() {
      if (!isSelecting.value) {
        startPoint.value = null;
        return;
      }

      stopAutoScroll();

      if (selectionRect.value) {
        const selectedItems = getSelectedItems();
        const params: SelectionCallbackParams = {
          selectedIds: selectedItems.map(item => item.id),
          selectedItems,
          selectionRect: selectionRect.value
        };

        emit('selection-end', params);
      }

      // 重置状态
      isSelecting.value = false;
      startPoint.value = null;
      currentPoint.value = null;
    }

    // ==================== 生命周期 ====================

    onMounted(() => {
      // 查找容器元素
      containerElement.value = document.querySelector<HTMLElement>(props.containerSelector);
      if (!containerElement.value) {
        console.warn(`[SelectionRect] Container not found: ${props.containerSelector}`);
        return;
      }

      // 查找滚动容器
      scrollContainer.value = getScrollContainer(containerElement.value);

      // 绑定事件
      useEventListener(containerElement.value, 'mousedown', handleMouseDown);
      useEventListener(document, 'mousemove', handleMouseMove);
      useEventListener(document, 'mouseup', handleMouseUp);
    });

    onBeforeUnmount(() => {
      stopAutoScroll();
    });

    // ==================== 渲染 ====================

    return () => (
      <>
        {slots.default?.()}
        {isSelecting.value && selectionRect.value && (
          <div
            class={['selection-rect', props.rectClass]}
            style={selectionStyle.value}
          />
        )}
      </>
    );
  }
});

