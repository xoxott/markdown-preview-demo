import type { CSSProperties, PropType } from 'vue';
import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  shallowRef
} from 'vue';
import { useEventListener, useThrottleFn } from '@vueuse/core';
import { useThemeVars } from 'naive-ui';
import type { ScrollbarInst } from 'naive-ui';
import { fileListScrollHostSelector } from '../constants/fileListScrollHost';

/** 坐标点类型 */
interface Point {
  x: number;
  y: number;
}

/** 矩形类型 */
interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 选区状态类型 */
interface SelectionState {
  isSelecting: boolean;
  isMouseDown: boolean;
  startPoint: Point;
  currentPoint: Point;
  selectedIds: Set<string>;
}

/** 滚动容器信息类型 */
interface ScrollContainerInfo {
  element: HTMLElement;
  instance?: ScrollbarInst;
}

// 常量定义
const SELECTORS = {
  SCROLLBAR: '.n-scrollbar',
  CONTAINER: '.n-scrollbar-container'
} as const;

const DEFAULT_POINT: Point = { x: 0, y: 0 };
const DEFAULT_RECT: Rect = { left: 0, top: 0, width: 0, height: 0 };
const SCROLL_INTERVAL = 16; // ~60fps
const ANIMATION_DURATION = '1.5s';

/**
 * NSelectionRect：文件列表区域拖拽框选。
 *
 * 滚动根节点通过 `fileListScrollHost` 契约解析（见 `constants/fileListScrollHost`）， 兼容 Naive UI `NScrollbar`
 * 与详情视图等「自带滚动层」的布局，无需猜测子组件挂载帧数。
 */
export default defineComponent({
  name: 'NSelectionRect',
  props: {
    /** 禁用拖选 */
    disabled: {
      type: Boolean,
      default: false
    },
    /** 容器 className */
    className: {
      type: String,
      default: ''
    },
    /** 选区矩形自定义样式 */
    rectStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },
    /** 鼠标移动最小距离触发选区 */
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
    /** 自动滚动触发的边距 */
    scrollEdge: {
      type: Number,
      default: 10
    },
    /** 可选元素标识属性名 */
    selectableSelector: {
      type: String,
      default: '[data-selectable-id]'
    },
    /** 阻止拖选的元素标识属性 */
    preventDragSelector: {
      type: String,
      default: 'data-prevent-selection'
    },
    /** 拖选开始回调 */
    onSelectionStart: Function as PropType<() => void>,
    /** 拖选中回调 */
    onSelectionChange: Function as PropType<(ids: string[]) => void>,
    /** 拖选结束回调 */
    onSelectionEnd: Function as PropType<(ids: string[]) => void>,
    /** 清除选择回调 */
    onClearSelection: Function as PropType<() => void>
  },

  setup(props, { slots, attrs }) {
    const themeVars = useThemeVars();

    // 使用 shallowRef 优化响应性能
    const containerRef = shallowRef<HTMLDivElement>();
    const scrollContainerInfo = shallowRef<ScrollContainerInfo>();
    /** 已绑定 scroll 监听的元素（与 scrollContainerInfo 同步，便于卸载时移除） */
    const scrollListenerTarget = shallowRef<HTMLElement | null>(null);

    // 选区状态
    const selectionState = ref<SelectionState>({
      isSelecting: false,
      isMouseDown: false,
      startPoint: { ...DEFAULT_POINT },
      currentPoint: { ...DEFAULT_POINT },
      selectedIds: new Set()
    });

    // 自动滚动相关
    const autoScrollTimer = ref<number>();
    const lastMouseEvent = shallowRef<MouseEvent>();
    /** 滚动时触发 displayRect 重算（scrollLeft/Top 非响应式） */
    const scrollTick = ref(0);

    /** 获取滚动容器元素 */
    const getScrollElement = () => scrollContainerInfo.value?.element;

    /** 滚动内容区在「内容坐标系」下的边界（原点 = 可滚动内容左上角） */
    const getScrollContentBounds = () => {
      const scroll = getScrollElement();
      if (!scroll) {
        return { minX: 0, minY: 0, maxX: Infinity, maxY: Infinity };
      }

      return {
        minX: 0,
        minY: 0,
        maxX: scroll.scrollWidth,
        maxY: scroll.scrollHeight
      };
    };

    /** 是否确实存在横向可滚动空间（容差 1px，避免亚像素误差误触发） */
    const hasHorizontalOverflow = (scroll: HTMLElement): boolean =>
      scroll.scrollWidth - scroll.clientWidth > 1;

    /**
     * 滚动宿主在 selection-container 坐标系下的可视视口。 须与 Naive `.n-scrollbar` 外框求交：详情视图 flex
     * 分栏时，`.n-scrollbar-container` 的 clientHeight 可能比外层高出 1～2px，底部会被外层 overflow:hidden 裁掉，仅用
     * clientHeight 画圈选会越界。 有横向滚动时，底部轨道叠在容器上，也需排除。
     */
    const getScrollViewportInContainer = (
      scroll: HTMLElement,
      container: HTMLElement
    ): { viewLeft: number; viewTop: number; viewRight: number; viewBottom: number } => {
      const scrollRect = scroll.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollRoot = scroll.closest(SELECTORS.SCROLLBAR) as HTMLElement | null;
      const clipRect = scrollRoot?.getBoundingClientRect() ?? scrollRect;

      let viewLeft = scrollRect.left - containerRect.left;
      let viewTop = scrollRect.top - containerRect.top;
      let viewRight = scrollRect.right - containerRect.left;
      let viewBottom = scrollRect.bottom - containerRect.top;

      const clipLeft = clipRect.left - containerRect.left;
      const clipTop = clipRect.top - containerRect.top;
      const clipRight = clipRect.right - containerRect.left;
      const clipBottom = clipRect.bottom - containerRect.top;

      viewLeft = Math.max(viewLeft, clipLeft);
      viewTop = Math.max(viewTop, clipTop);
      viewRight = Math.min(viewRight, clipRight);
      viewBottom = Math.min(viewBottom, clipBottom);

      if (hasHorizontalOverflow(scroll) && scrollRoot) {
        const xRail = scrollRoot.querySelector(
          `${SELECTORS.SCROLLBAR}-rail--horizontal[data-scrollbar-rail]`
        ) as HTMLElement | null;
        if (xRail) {
          const railTop = xRail.getBoundingClientRect().top - containerRect.top;
          viewBottom = Math.min(viewBottom, railTop);
        }
      }

      return { viewLeft, viewTop, viewRight, viewBottom };
    };

    /** 在 selection 子树内查找实际发生 scroll 的元素（契约类名优先，其次 Naive 默认结构） */
    const findScrollHostElement = (): HTMLElement | null => {
      const root = containerRef.value;
      if (!root) return null;
      const marked = root.querySelector(fileListScrollHostSelector) as HTMLElement | null;
      if (marked) return marked;
      const scrollbarRoot = root.querySelector(SELECTORS.SCROLLBAR) as HTMLElement | null;
      return (scrollbarRoot?.querySelector(SELECTORS.CONTAINER) as HTMLElement | null) ?? null;
    };

    /** 当滚动宿主落在 Naive `.n-scrollbar` 内时，尝试取得 `scrollBy` 实例（原生滚动宿主无实例） */
    const resolveNaiveScrollbarInstance = (scrollEl: HTMLElement): ScrollbarInst | undefined => {
      const bar = scrollEl.closest(SELECTORS.SCROLLBAR);
      if (!bar) return undefined;
      // @ts-expect-error -- Naive 内部实现，用于 scrollBy 与浏览器行为对齐
      const vnode = bar.__vueParentComponent;
      return vnode?.exposed as ScrollbarInst | undefined;
    };

    /** 不可圈选区域（如详情表头）在内容坐标系中的下边界。 跳过带 data-selectable-id 的节点（已选中的数据行也会带 prevent 标记）。 */
    const getMinSelectionTop = (): number => {
      const scroll = getScrollElement();
      if (!containerRef.value || !scroll) return 0;

      const scrollRect = scroll.getBoundingClientRect();
      let maxBottom = 0;

      const prevented = Array.from(
        containerRef.value.querySelectorAll<HTMLElement>(`[${props.preventDragSelector}]`)
      );

      for (const el of prevented) {
        if (el.dataset.selectableId) continue;

        const bounds = el.getBoundingClientRect();
        const bottom = bounds.bottom - scrollRect.top + scroll.scrollTop;
        maxBottom = Math.max(maxBottom, bottom);
      }

      return maxBottom;
    };

    /** 计算内容坐标下的选区矩形（带边界限制） */
    const selectionRect = computed<Rect>(() => {
      const scroll = getScrollElement();
      if (!containerRef.value || !scroll) return DEFAULT_RECT;

      const { startPoint, currentPoint } = selectionState.value;
      const minTop = getMinSelectionTop();

      const bounds = getScrollContentBounds();
      const maxXInView = scroll.scrollLeft + scroll.clientWidth;

      const left = Math.max(bounds.minX, Math.min(startPoint.x, currentPoint.x));
      const top = Math.max(minTop, Math.min(startPoint.y, currentPoint.y));
      // 无横向溢出时圈选不得超出当前视口，避免拖到右缘时误触横向滚动
      const maxRight = hasHorizontalOverflow(scroll) ? bounds.maxX : maxXInView;
      const right = Math.min(maxRight, Math.max(startPoint.x, currentPoint.x));
      const bottom = Math.min(bounds.maxY, Math.max(startPoint.y, currentPoint.y));

      return {
        left,
        top,
        width: right - left,
        height: Math.max(0, bottom - top)
      };
    });

    /** 圈选框绘制在 selection-container 上，坐标需映射到「滚动宿主」可视区； 选区层不得放进滚动容器内部，否则会撑大 scrollWidth。 */
    const displayRect = computed<Rect>(() => {
      // 依赖 scrollTick，在滚动时重算视口坐标（scrollLeft/Top 非响应式）
      const scrollVersion = scrollTick.value;
      if (scrollVersion < 0) return DEFAULT_RECT;

      const scroll = getScrollElement();
      const container = containerRef.value;
      if (!scroll || !container) return DEFAULT_RECT;

      const rect = selectionRect.value;
      const scrollRect = scroll.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const { viewLeft, viewTop, viewRight, viewBottom } = getScrollViewportInContainer(
        scroll,
        container
      );

      let left = scrollRect.left - containerRect.left + rect.left - scroll.scrollLeft;
      let top = scrollRect.top - containerRect.top + rect.top - scroll.scrollTop;
      let right = left + rect.width;
      let bottom = top + rect.height;

      left = Math.max(viewLeft, left);
      top = Math.max(viewTop, top);
      right = Math.min(viewRight, right);
      bottom = Math.min(viewBottom, bottom);

      return {
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
      };
    });

    /** 判断两个 Set 是否相等 */
    const areSetsEqual = (set1: Set<string>, set2: Set<string>): boolean => {
      if (set1.size !== set2.size) return false;
      for (const item of set1) {
        if (!set2.has(item)) return false;
      }
      return true;
    };

    /** 判断元素是否在选区内（优化的碰撞检测） */
    const isElementInSelection = (el: HTMLElement, rect: Rect): boolean => {
      const scroll = getScrollElement();
      if (!scroll) return false;

      const scrollRect = scroll.getBoundingClientRect();
      const elemBounds = el.getBoundingClientRect();

      // 转换为滚动内容坐标系（与 getContentPoint 一致）
      const elemRect = {
        left: elemBounds.left - scrollRect.left + scroll.scrollLeft,
        top: elemBounds.top - scrollRect.top + scroll.scrollTop,
        right: elemBounds.right - scrollRect.left + scroll.scrollLeft,
        bottom: elemBounds.bottom - scrollRect.top + scroll.scrollTop
      };

      // AABB 碰撞检测
      return !(
        elemRect.right < rect.left ||
        elemRect.left > rect.left + rect.width ||
        elemRect.bottom < rect.top ||
        elemRect.top > rect.top + rect.height
      );
    };

    /** 更新选中元素（批量处理优化） */
    const updateSelection = (rect: Rect): void => {
      if (!containerRef.value) return;

      const newSelectedIds = new Set<string>();
      const elements = Array.from(
        containerRef.value.querySelectorAll<HTMLElement>(props.selectableSelector)
      );

      // 使用 for...of 遍历数组，性能更好
      for (const el of elements) {
        const id = el.dataset.selectableId;
        if (id && isElementInSelection(el, rect)) {
          newSelectedIds.add(id);
        }
      }

      // 只在实际变化时触发回调
      if (!areSetsEqual(selectionState.value.selectedIds, newSelectedIds)) {
        selectionState.value.selectedIds = newSelectedIds;
        props.onSelectionChange?.(Array.from(newSelectedIds));
      }
    };

    /** 滚动事件处理（须在 updateSelection 之后定义，供 detachScrollListener / tryBindScrollHost 引用） */
    const handleScroll = (): void => {
      scrollTick.value += 1;
      if (selectionState.value.isSelecting) {
        updateSelection(selectionRect.value);
      }
    };

    const detachScrollListener = (): void => {
      if (scrollListenerTarget.value) {
        scrollListenerTarget.value.removeEventListener('scroll', handleScroll);
        scrollListenerTarget.value = null;
      }
      scrollContainerInfo.value = undefined;
    };

    /** 将 scroll 监听绑定到当前滚动宿主；宿主变化或 DOM 置换时安全重绑 */
    const tryBindScrollHost = (): boolean => {
      const current = scrollListenerTarget.value;
      if (current?.isConnected && scrollContainerInfo.value?.element === current) {
        return true;
      }

      const host = findScrollHostElement();
      if (!host) {
        detachScrollListener();
        return false;
      }

      detachScrollListener();

      scrollContainerInfo.value = {
        element: host,
        instance: resolveNaiveScrollbarInstance(host)
      };
      host.addEventListener('scroll', handleScroll, { passive: true });
      scrollListenerTarget.value = host;
      return true;
    };

    /** 计算滚动方向和速度 */
    const calculateScrollDelta = (mouseEvent: MouseEvent): { dx: number; dy: number } => {
      const scroll = getScrollElement();
      if (!scroll) return { dx: 0, dy: 0 };

      const { clientX, clientY } = mouseEvent;
      const rect = scroll.getBoundingClientRect();
      let dx = 0;
      let dy = 0;

      // 垂直滚动
      if (clientY - rect.top < props.scrollEdge && scroll.scrollTop > 0) {
        dy = -props.scrollSpeed;
      } else if (
        rect.bottom - clientY < props.scrollEdge &&
        scroll.scrollTop < scroll.scrollHeight - scroll.clientHeight
      ) {
        dy = props.scrollSpeed;
      }

      // 水平滚动：仅当内容真实溢出时才启用
      if (hasHorizontalOverflow(scroll)) {
        if (clientX - rect.left < props.scrollEdge && scroll.scrollLeft > 0) {
          dx = -props.scrollSpeed;
        } else if (
          rect.right - clientX < props.scrollEdge &&
          scroll.scrollLeft < scroll.scrollWidth - scroll.clientWidth
        ) {
          dx = props.scrollSpeed;
        }
      }

      return { dx, dy };
    };

    /** 鼠标在滚动内容坐标系中的位置（坐标相对「滚动宿主」可视区，而非 selection 外层）。 */
    const getContentPoint = (e: MouseEvent): Point | null => {
      tryBindScrollHost();
      const scroll = getScrollElement();
      if (!scroll) return null;

      const scrollRect = scroll.getBoundingClientRect();
      const bounds = getScrollContentBounds();
      const maxXInView = scroll.scrollLeft + scroll.clientWidth;
      const maxYInView = scroll.scrollTop + scroll.clientHeight;
      const maxX = hasHorizontalOverflow(scroll) ? bounds.maxX : maxXInView;

      return {
        x: Math.max(bounds.minX, Math.min(maxX, e.clientX - scrollRect.left + scroll.scrollLeft)),
        y: Math.max(
          bounds.minY,
          Math.min(bounds.maxY, maxYInView, e.clientY - scrollRect.top + scroll.scrollTop)
        )
      };
    };

    /** 执行自动滚动 */
    const performAutoScroll = (): void => {
      if (!props.autoScroll || !lastMouseEvent.value) return;

      const { dx, dy } = calculateScrollDelta(lastMouseEvent.value);
      if (dx === 0 && dy === 0) return;

      const scroll = getScrollElement();
      if (!scroll) return;

      // 优先使用 NScrollbar API
      const instance = scrollContainerInfo.value?.instance;
      if (instance?.scrollBy) {
        instance.scrollBy({ left: dx, top: dy, behavior: 'auto' });
      } else {
        scroll.scrollBy({ left: dx, top: dy, behavior: 'auto' });
      }

      scrollTick.value += 1;

      const point = getContentPoint(lastMouseEvent.value);
      if (point) {
        selectionState.value.currentPoint = point;
      }
    };

    /** 开始自动滚动（使用 requestAnimationFrame 优化） */
    const startAutoScroll = (): void => {
      if (autoScrollTimer.value) return;

      autoScrollTimer.value = window.setInterval(() => {
        performAutoScroll();
        if (selectionState.value.isSelecting) {
          updateSelection(selectionRect.value);
        }
      }, SCROLL_INTERVAL);
    };

    /** 停止自动滚动 */
    const stopAutoScroll = (): void => {
      if (autoScrollTimer.value) {
        clearInterval(autoScrollTimer.value);
        autoScrollTimer.value = undefined;
      }
    };

    /** 判断是否允许拖选 */
    const canStartDragSelection = (target: HTMLElement): boolean =>
      !target.closest(`[${props.preventDragSelector}]`);

    /** 鼠标按下事件 */
    const handleMouseDown = (e: MouseEvent): void => {
      if (props.disabled || e.button !== 0 || !canStartDragSelection(e.target as HTMLElement)) {
        return;
      }

      e.preventDefault();

      const point = getContentPoint(e);
      if (!point) return;

      selectionState.value = {
        isSelecting: false,
        isMouseDown: true,
        startPoint: point,
        currentPoint: { ...point },
        selectedIds: new Set()
      };
      lastMouseEvent.value = e;
    };

    /** 鼠标移动事件（节流优化） */
    const handleMouseMove = useThrottleFn((e: MouseEvent): void => {
      if (!selectionState.value.isMouseDown) return;

      lastMouseEvent.value = e;

      const point = getContentPoint(e);
      if (!point) return;

      selectionState.value.currentPoint = point;

      // 计算移动距离
      const distance = Math.hypot(
        point.x - selectionState.value.startPoint.x,
        point.y - selectionState.value.startPoint.y
      );

      if (distance > props.threshold) {
        if (!selectionState.value.isSelecting) {
          selectionState.value.isSelecting = true;
          props.onSelectionStart?.();
        }
        updateSelection(selectionRect.value);
        if (props.autoScroll) {
          startAutoScroll();
        }
      }
    }, SCROLL_INTERVAL);

    /** 鼠标抬起事件 */
    const handleMouseUp = (e?: MouseEvent): void => {
      if (!selectionState.value.isMouseDown) return;

      const wasSelecting = selectionState.value.isSelecting;
      const selectedIds = Array.from(selectionState.value.selectedIds);

      stopAutoScroll();

      if (wasSelecting) {
        props.onSelectionEnd?.(selectedIds);
        e?.stopPropagation?.();
      }

      selectionState.value = {
        isSelecting: false,
        isMouseDown: false,
        startPoint: { ...DEFAULT_POINT },
        currentPoint: { ...DEFAULT_POINT },
        selectedIds: new Set()
      };
      lastMouseEvent.value = undefined;
    };

    /** 点击空白区域清空选中 */
    const handleClickOutside = (e: MouseEvent): void => {
      if (selectionState.value.isSelecting) return;
      const target = e.target as HTMLElement;

      // 检查点击是否在容器内
      const container = containerRef.value;
      if (!container || !container.contains(target)) {
        // 点击在容器外部，不清空选中
        return;
      }

      // 检查是否点击在可选中元素或下拉菜单上
      if (!target.closest(props.selectableSelector) && !target.closest('[data-dropdown-option]')) {
        // 点击在容器内的空白区域，清空选中
        selectionState.value.selectedIds.clear();
        props.onClearSelection?.();
      }
    };

    /** 清理函数 */
    const cleanup = (): void => {
      stopAutoScroll();
      detachScrollListener();
    };

    // 事件监听
    useEventListener(document, 'mousedown', handleClickOutside);
    useEventListener(document, 'mousemove', handleMouseMove);
    useEventListener(document, 'mouseup', handleMouseUp);
    useEventListener(containerRef, 'selectstart', e => {
      if (selectionState.value.isSelecting || selectionState.value.isMouseDown) {
        e.preventDefault();
      }
    });

    onMounted(async () => {
      await nextTick();
      tryBindScrollHost();
    });

    /** 切换视图（如网格 ↔ 详情）后滚动宿主可能被替换，仅在监听目标失效时重绑 */
    onUpdated(() => {
      const bound = scrollListenerTarget.value;
      if (bound?.isConnected) return;
      tryBindScrollHost();
    });

    onBeforeUnmount(cleanup);

    /** 动态样式（缓存优化） */
    const dynamicStyles = computed(() => {
      const primary = themeVars.value.primaryColor;
      const primaryHover = themeVars.value.primaryColorHover;

      return `
        .selection-container {
          position: relative;
          user-select: none;
          overflow: hidden;
        }
        .selection-rect {
          position: absolute;
          pointer-events: none;
          z-index: 9999;
          border: 2px solid ${primary};
          background: ${primaryHover}14;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: opacity 0.1s ease;
        }
        .selection-rect-border {
          position: absolute;
          inset: -1px;
          border: 1px solid ${primaryHover}66;
          border-radius: 4px;
          animation: selection-pulse ${ANIMATION_DURATION} ease-in-out infinite;
        }
        @keyframes selection-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(0.98); }
        }
      `;
    });

    return () => {
      const { isSelecting } = selectionState.value;
      const { width, height, left, top } = displayRect.value;
      const showRect = isSelecting && width > 0 && height > 0;

      return (
        <div
          ref={containerRef}
          class={['selection-container', props.className, attrs.class as string]}
          style="display: flex; flex-direction: column; flex: 1; min-height: 0;"
          onMousedown={handleMouseDown}
        >
          {slots.default?.()}
          {showRect && (
            <div
              class="selection-rect"
              style={{
                left: `${Math.round(left)}px`,
                top: `${Math.round(top)}px`,
                width: `${Math.round(width)}px`,
                height: `${Math.round(height)}px`,
                boxSizing: 'border-box',
                ...props.rectStyle
              }}
            >
              <div class="selection-rect-border" />
            </div>
          )}
          <style>{dynamicStyles.value}</style>
        </div>
      );
    };
  }
});
