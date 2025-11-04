import {
  defineComponent,
  ref,
  computed,
  PropType,
  CSSProperties,
  onMounted,
  onBeforeUnmount,
  watch
} from 'vue'
import { useEventListener, useThrottleFn } from '@vueuse/core'
import { useThemeVars } from 'naive-ui'

// ==================== 类型定义 ====================

/** 坐标点 */
interface Point {
  x: number
  y: number
}

/** 矩形区域 */
interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** 滚动容器选择器类型 */
type ScrollContainerSelector = string | HTMLElement | (() => HTMLElement | null)

/** 选择模式 */
type SelectionMode = 'replace' | 'add' | 'remove' | 'toggle'

// ==================== 工具函数 ====================

/** 判断两个 Set 是否相等 */
const areSetsEqual = function<T>(set1: Set<T>, set2: Set<T>): boolean {
  if (set1.size !== set2.size) return false
  for (const item of set1) {
    if (!set2.has(item)) return false
  }
  return true
}

/** 计算两点之间的距离 */
const calculateDistance = (p1: Point, p2: Point): number => {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

/** 限制数值范围 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

// ==================== 组件定义 ====================
export default defineComponent({
  name: 'SelectionRect',

  props: {
    /** 禁用拖选 */
    disabled: {
      type: Boolean,
      default: false
    },

    /** 容器类名 */
    className: {
      type: String,
      default: ''
    },

    /** 选区矩形自定义样式 */
    rectStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },

    /** 鼠标移动最小距离触发选区（像素） */
    threshold: {
      type: Number,
      default: 2,
      validator: (value: number) => value >= 0
    },

    /** 是否启用自动滚动 */
    autoScroll: {
      type: Boolean,
      default: true
    },

    /** 自动滚动速度（像素/帧） */
    scrollSpeed: {
      type: Number,
      default: 10,
      validator: (value: number) => value > 0
    },

    /** 自动滚动触发的边距（像素） */
    scrollEdge: {
      type: Number,
      default: 10,
      validator: (value: number) => value > 0
    },

    /** 滚动容器选择器 */
    scrollContainerSelector: {
      type: [String, Object, Function] as PropType<ScrollContainerSelector>,
      required: true
    },

    /** 阻止拖选的元素标识属性 */
    preventDragSelector: {
      type: String,
      default: 'data-prevent-selection'
    },

    /** 可选中元素的标识属性 */
    selectableAttribute: {
      type: String,
      default: 'data-selectable-id'
    },

    /** 选择模式 */
    selectionMode: {
      type: String as PropType<SelectionMode>,
      default: 'replace'
    },

    /** 是否显示选区动画 */
    showAnimation: {
      type: Boolean,
      default: true
    },

    /** 节流延迟（毫秒） */
    throttleDelay: {
      type: Number,
      default: 16,
      validator: (value: number) => value > 0
    },

    /** 拖选开始回调 */
    onSelectionStart: {
      type: Function as PropType<() => void>
    },

    /** 拖选变化回调 */
    onSelectionChange: {
      type: Function as PropType<(ids: string[]) => void>
    },

    /** 拖选结束回调 */
    onSelectionEnd: {
      type: Function as PropType<(ids: string[]) => void>
    },

    /** 点击空白区域回调 */
    onClickOutside: {
      type: Function as PropType<() => void>
    }
  },

  setup(props, { slots }) {
    const themeVars = useThemeVars()

    // ==================== 引用 ====================

    const containerRef = ref<HTMLDivElement>()
    const scrollContainerRef = ref<HTMLElement>()

    // ==================== 状态管理 ====================

    /** 是否正在拖选 */
    const isSelecting = ref(false)

    /** 鼠标是否按下 */
    const isMouseDown = ref(false)

    /** 起始点（内容坐标系） */
    const startPoint = ref<Point>({ x: 0, y: 0 })

    /** 当前点（内容坐标系） */
    const currentPoint = ref<Point>({ x: 0, y: 0 })

    /** 当前选中的元素 ID 集合 */
    const selectedIds = ref<Set<string>>(new Set())

    /** 自动滚动定时器 */
    const autoScrollTimer = ref<number>()

    /** 最后一次鼠标事件 */
    const lastMouseEvent = ref<MouseEvent>()

    // ==================== 滚动容器管理 ====================

    /**
     * 解析滚动容器
     */
    const resolveScrollContainer = (): HTMLElement | null => {
      const selector = props.scrollContainerSelector

      if (!selector) return null

      if (typeof selector === 'function') {
        return selector()
      }

      if (typeof selector === 'string') {
        return document.querySelector(selector) as HTMLElement
      }

      if (selector instanceof HTMLElement) {
        return selector
      }

      return null
    }

    /**
     * 初始化滚动容器
     */
    const initScrollContainer = () => {
      scrollContainerRef.value = resolveScrollContainer() || undefined
    }

    // 监听滚动容器选择器变化
    watch(() => props.scrollContainerSelector, initScrollContainer)

    onMounted(initScrollContainer)

    // ==================== 坐标计算 ====================

    /**
     * 将鼠标事件坐标转换为内容坐标系
     */
    const eventToContentPoint = (e: MouseEvent): Point | null => {
      if (!containerRef.value || !scrollContainerRef.value) return null

      const containerRect = containerRef.value.getBoundingClientRect()
      const scroll = scrollContainerRef.value

      return {
        x: e.clientX - containerRect.left + scroll.scrollLeft,
        y: e.clientY - containerRect.top + scroll.scrollTop
      }
    }

    /**
     * 计算内容坐标系下的选区矩形
     */
    const selectionRect = computed<Rect>(() => {
      if (!scrollContainerRef.value) {
        return { left: 0, top: 0, width: 0, height: 0 }
      }

      const scroll = scrollContainerRef.value
      const start = startPoint.value
      const current = currentPoint.value

      const left = clamp(
        Math.min(start.x, current.x),
        0,
        scroll.scrollWidth
      )
      const top = clamp(
        Math.min(start.y, current.y),
        0,
        scroll.scrollHeight
      )
      const right = clamp(
        Math.max(start.x, current.x),
        0,
        scroll.scrollWidth
      )
      const bottom = clamp(
        Math.max(start.y, current.y),
        0,
        scroll.scrollHeight
      )

      return {
        left,
        top,
        width: right - left,
        height: bottom - top
      }
    })

    /**
     * 计算显示坐标系下的选区矩形（视口坐标）
     */
    const displayRect = computed<Rect>(() => {
      if (!scrollContainerRef.value) {
        return { left: 0, top: 0, width: 0, height: 0 }
      }

      const scroll = scrollContainerRef.value
      const rect = selectionRect.value

      return {
        left: rect.left - scroll.scrollLeft,
        top: rect.top - scroll.scrollTop,
        width: rect.width,
        height: rect.height
      }
    })

    // ==================== 元素选择逻辑 ====================

    /**
     * 判断元素是否与选区相交
     */
    const isElementIntersectingSelection = (
      element: HTMLElement,
      selectionRect: Rect
    ): boolean => {
      if (!containerRef.value || !scrollContainerRef.value) return false

      const containerRect = containerRef.value.getBoundingClientRect()
      const scroll = scrollContainerRef.value

      // 获取元素在内容坐标系中的位置
      const elementRect = element.getBoundingClientRect()
      const elementInContent = {
        left: elementRect.left - containerRect.left + scroll.scrollLeft,
        top: elementRect.top - containerRect.top + scroll.scrollTop,
        right: elementRect.right - containerRect.left + scroll.scrollLeft,
        bottom: elementRect.bottom - containerRect.top + scroll.scrollTop
      }

      // 判断矩形相交
      return !(
        elementInContent.right < selectionRect.left ||
        elementInContent.left > selectionRect.left + selectionRect.width ||
        elementInContent.bottom < selectionRect.top ||
        elementInContent.top > selectionRect.top + selectionRect.height
      )
    }

    /**
     * 获取所有可选中的元素
     */
    const getAllSelectableElements = (): HTMLElement[] => {
      if (!containerRef.value) return []

      return Array.from(
        containerRef.value.querySelectorAll<HTMLElement>(
          `[${props.selectableAttribute}]`
        )
      )
    }

    /**
     * 更新选中的元素
     */
    const updateSelection = (rect: Rect) => {
      const elements = getAllSelectableElements()
      const newSelectedIds = new Set<string>()

      elements.forEach(element => {
        const id = element.getAttribute(props.selectableAttribute)
        if (id && isElementIntersectingSelection(element, rect)) {
          newSelectedIds.add(id)
        }
      })

      // 只有选中集合发生变化时才触发回调
      if (!areSetsEqual(selectedIds.value, newSelectedIds)) {
        selectedIds.value = newSelectedIds
        props.onSelectionChange?.(Array.from(newSelectedIds))
      }
    }

    // ==================== 自动滚动 ====================

    /**
     * 执行自动滚动
     */
    const performAutoScroll = () => {
      if (!props.autoScroll || !scrollContainerRef.value || !lastMouseEvent.value) {
        return
      }

      const { clientX, clientY } = lastMouseEvent.value
      const scroll = scrollContainerRef.value
      const scrollRect = scroll.getBoundingClientRect()

      let deltaX = 0
      let deltaY = 0

      // 垂直方向滚动
      if (clientY - scrollRect.top < props.scrollEdge && scroll.scrollTop > 0) {
        deltaY = -props.scrollSpeed
      } else if (
        scrollRect.bottom - clientY < props.scrollEdge &&
        scroll.scrollTop < scroll.scrollHeight - scroll.clientHeight
      ) {
        deltaY = props.scrollSpeed
      }

      // 水平方向滚动
      if (clientX - scrollRect.left < props.scrollEdge && scroll.scrollLeft > 0) {
        deltaX = -props.scrollSpeed
      } else if (
        scrollRect.right - clientX < props.scrollEdge &&
        scroll.scrollLeft < scroll.scrollWidth - scroll.clientWidth
      ) {
        deltaX = props.scrollSpeed
      }

      // 执行滚动
      if (deltaX !== 0 || deltaY !== 0) {
        scroll.scrollBy({ left: deltaX, top: deltaY, behavior: 'auto' })

        // 更新当前点坐标
        const point = eventToContentPoint(lastMouseEvent.value)
        if (point) {
          currentPoint.value = point
        }
      }
    }

    /**
     * 启动自动滚动
     */
    const startAutoScroll = () => {
      if (autoScrollTimer.value) return

      autoScrollTimer.value = window.setInterval(() => {
        performAutoScroll()
        if (isSelecting.value) {
          updateSelection(selectionRect.value)
        }
      }, props.throttleDelay)
    }

    /**
     * 停止自动滚动
     */
    const stopAutoScroll = () => {
      if (autoScrollTimer.value) {
        clearInterval(autoScrollTimer.value)
        autoScrollTimer.value = undefined
      }
    }

    // ==================== 拖选权限检查 ====================

    /**
     * 检查目标元素是否允许开始拖选
     */
    const canStartDragSelection = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false

      // 检查是否在阻止拖选的元素内
      if (target.closest(`[${props.preventDragSelector}]`)) {
        return false
      }

      // 检查是否是表单元素
      const tagName = target.tagName.toLowerCase()
      const isFormElement = ['input', 'textarea', 'select', 'button'].includes(tagName)
      if (isFormElement) {
        return false
      }

      // 检查是否有 contenteditable 属性
      if (target.isContentEditable) {
        return false
      }

      return true
    }

    // ==================== 事件处理 ====================

    /**
     * 鼠标按下事件
     */
    const handleMouseDown = (e: MouseEvent) => {
      // 基础检查
      if (props.disabled || e.button !== 0) return
      if (!canStartDragSelection(e.target)) return
      if (!containerRef.value || !scrollContainerRef.value) return

      e.preventDefault()

      // 记录起始点
      const point = eventToContentPoint(e)
      if (!point) return

      startPoint.value = point
      currentPoint.value = { ...point }
      isMouseDown.value = true
      lastMouseEvent.value = e

      // 清空之前的选择
      selectedIds.value.clear()
    }

    /**
     * 鼠标移动事件（节流）
     */
    const handleMouseMove = useThrottleFn((e: MouseEvent) => {
      if (!isMouseDown.value) return

      lastMouseEvent.value = e

      const point = eventToContentPoint(e)
      if (!point) return

      currentPoint.value = point

      // 检查是否超过阈值
      const distance = calculateDistance(startPoint.value, currentPoint.value)
      if (distance > props.threshold) {
        // 开始拖选
        if (!isSelecting.value) {
          isSelecting.value = true
          props.onSelectionStart?.()
        }

        // 更新选择
        updateSelection(selectionRect.value)

        // 启动自动滚动
        if (props.autoScroll) {
          startAutoScroll()
        }
      }
    }, props.throttleDelay)

    /**
     * 鼠标抬起事件
     */
    const handleMouseUp = (e: MouseEvent) => {
      if (!isMouseDown.value) return

      const wasSelecting = isSelecting.value

      isMouseDown.value = false
      stopAutoScroll()

      if (wasSelecting) {
        isSelecting.value = false
        props.onSelectionEnd?.(Array.from(selectedIds.value))
        
        // 阻止事件传播，避免触发其他点击事件
        e.stopPropagation()
      } else {
        // 没有发生拖选，判断是否点击空白区域
        const target = e.target as HTMLElement
        const selectableElement = target.closest(`[${props.selectableAttribute}]`)
        
        if (!selectableElement) {
          // 点击空白区域，触发清空回调
          props.onClickOutside?.()
        }
      }

      // 清理状态
      selectedIds.value.clear()
      lastMouseEvent.value = undefined
    }

    /**
     * 滚动事件
     */
    const handleScroll = () => {
      if (isSelecting.value) {
        updateSelection(selectionRect.value)
      }
    }

    /**
     * 阻止文本选择
     */
    const handleSelectStart = (e: Event) => {
      if (isSelecting.value || isMouseDown.value) {
        e.preventDefault()
      }
    }

    // ==================== 事件监听 ====================

    useEventListener(document, 'mousemove', handleMouseMove)
    useEventListener(document, 'mouseup', handleMouseUp)
    useEventListener(containerRef, 'selectstart', handleSelectStart)
    useEventListener(scrollContainerRef, 'scroll', handleScroll)

    onBeforeUnmount(() => {
      stopAutoScroll()
    })

    // ==================== 样式计算 ====================

    const dynamicStyles = computed(() => {
      const primary = themeVars.value.primaryColor
      const primaryHover = themeVars.value.primaryColorHover

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
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: opacity 0.1s ease;
        }

        .selection-rect-border {
          position: absolute;
          inset: -1px;
          border: 1px solid ${primaryHover}66;
          border-radius: 4px;
          ${props.showAnimation ? 'animation: selection-pulse 1.5s ease-in-out infinite;' : ''}
        }

        @keyframes selection-pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(0.98);
          }
        }
      `
    })

    // ==================== 渲染 ====================

    return () => (
      <div
        ref={containerRef}
        class={['selection-container', props.className]}
        onMousedown={handleMouseDown}
      >
        {slots.default?.()}

        {/* 选区矩形 */}
        {isSelecting.value &&
          displayRect.value.width > 0 &&
          displayRect.value.height > 0 && (
            <div
              class="selection-rect"
              style={{
                left: `${displayRect.value.left}px`,
                top: `${displayRect.value.top}px`,
                width: `${displayRect.value.width}px`,
                height: `${displayRect.value.height}px`,
                ...props.rectStyle
              }}
            >
              <div class="selection-rect-border" />
            </div>
          )}

        {/* 动态样式 */}
        <style>{dynamicStyles.value}</style>
      </div>
    )
  }
})