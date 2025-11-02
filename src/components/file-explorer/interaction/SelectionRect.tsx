import { defineComponent, ref, reactive, computed, PropType, CSSProperties } from 'vue'
import { useEventListener, useThrottleFn } from '@vueuse/core'

interface Point {
  x: number
  y: number
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface SelectionOptions {
  /** 是否禁用圈选 */
  disabled?: boolean
  /** 触发圈选的最小拖动距离（px） */
  threshold?: number
  /** 是否自动滚动（当拖到边缘时） */
  autoScroll?: boolean
  /** 自动滚动速度 */
  scrollSpeed?: number
  /** 自动滚动触发边距（px） */
  scrollEdge?: number
}

export default defineComponent({
  name: 'SelectionRect',
  props: {
    /** 是否禁用 */
    disabled: { type: Boolean, default: false },
    /** 容器类名 */
    className: { type: String, default: '' },
    /** 圈选框样式 */
    rectStyle: { type: Object as PropType<CSSProperties>, default: () => ({}) },
    /** 触发阈值 */
    threshold: { type: Number, default: 5 },
    /** 是否启用自动滚动 */
    autoScroll: { type: Boolean, default: false },
    /** 滚动速度 */
    scrollSpeed: { type: Number, default: 10 },
    /** 滚动边距 */
    scrollEdge: { type: Number, default: 50 },
    /** 选中变化回调 */
    onSelectionStart: Function as PropType<() => void>,
    onSelectionChange: Function as PropType<(ids: string[]) => void>,
    onSelectionEnd: Function as PropType<(ids: string[]) => void>
  },

  setup(props, { slots }) {
    const containerRef = ref<HTMLDivElement>()
    const isSelecting = ref(false)
    const isMouseDown = ref(false)
    const startPoint = ref<Point>({ x: 0, y: 0 })
    const currentPoint = ref<Point>({ x: 0, y: 0 })
    const selectedIds = ref<Set<string>>(new Set())
    const scrollTimer = ref<number>()

    /** 计算实际的圈选矩形（带边界限制） */
    const selectionRect = computed<Rect>(() => {
      if (!containerRef.value) {
        return { left: 0, top: 0, width: 0, height: 0 }
      }

      const container = containerRef.value.getBoundingClientRect()
      const containerWidth = container.width
      const containerHeight = container.height

      // 限制在容器边界内
      const clampX = (x: number) => Math.max(0, Math.min(x, containerWidth))
      const clampY = (y: number) => Math.max(0, Math.min(y, containerHeight))

      const clampedStart = {
        x: clampX(startPoint.value.x),
        y: clampY(startPoint.value.y)
      }

      const clampedCurrent = {
        x: clampX(currentPoint.value.x),
        y: clampY(currentPoint.value.y)
      }

      return {
        left: Math.min(clampedStart.x, clampedCurrent.x),
        top: Math.min(clampedStart.y, clampedCurrent.y),
        width: Math.abs(clampedCurrent.x - clampedStart.x),
        height: Math.abs(clampedCurrent.y - clampedStart.y)
      }
    })

    /** 检查元素是否在选框内 */
    const isElementInSelection = (element: HTMLElement, rect: Rect): boolean => {
      if (!containerRef.value) return false

      const containerRect = containerRef.value.getBoundingClientRect()
      const elemRect = element.getBoundingClientRect()

      // 计算元素相对于容器的位置
      const elemRelative = {
        left: elemRect.left - containerRect.left + containerRef.value.scrollLeft,
        top: elemRect.top - containerRect.top + containerRef.value.scrollTop,
        right: elemRect.right - containerRect.left + containerRef.value.scrollLeft,
        bottom: elemRect.bottom - containerRect.top + containerRef.value.scrollTop
      }

      const rectRight = rect.left + rect.width
      const rectBottom = rect.top + rect.height

      // 相交检测
      return !(
        elemRelative.right < rect.left ||
        elemRelative.left > rectRight ||
        elemRelative.bottom < rect.top ||
        elemRelative.top > rectBottom
      )
    }

    /** 更新选中状态 */
    const updateSelection = (rect: Rect) => {
      if (!containerRef.value) return

      const selectableElements = containerRef.value.querySelectorAll('[data-selectable-id]')
      const newSelectedIds = new Set<string>()

      selectableElements.forEach((elem) => {
        const el = elem as HTMLElement
        const id = el.dataset.selectableId
        if (!id) return

        if (isElementInSelection(el, rect)) {
          newSelectedIds.add(id)
          el.classList.add('selection-active')
        } else {
          el.classList.remove('selection-active')
        }
      })

      // 只在选中项变化时触发回调
      if (!areSetsEqual(selectedIds.value, newSelectedIds)) {
        selectedIds.value = newSelectedIds
        props.onSelectionChange?.(Array.from(newSelectedIds))
      }
    }

    /** 比较两个 Set 是否相等 */
    const areSetsEqual = (set1: Set<string>, set2: Set<string>): boolean => {
      if (set1.size !== set2.size) return false
      for (const item of set1) {
        if (!set2.has(item)) return false
      }
      return true
    }

    /** 自动滚动 */
    const handleAutoScroll = (e: MouseEvent) => {
      if (!props.autoScroll || !containerRef.value) return

      const container = containerRef.value
      const rect = container.getBoundingClientRect()
      const { scrollEdge, scrollSpeed } = props

      let scrollX = 0
      let scrollY = 0

      // 检测是否接近边缘
      if (e.clientX - rect.left < scrollEdge) scrollX = -scrollSpeed
      else if (rect.right - e.clientX < scrollEdge) scrollX = scrollSpeed

      if (e.clientY - rect.top < scrollEdge) scrollY = -scrollSpeed
      else if (rect.bottom - e.clientY < scrollEdge) scrollY = scrollSpeed

      if (scrollX !== 0 || scrollY !== 0) {
        container.scrollBy(scrollX, scrollY)
      }
    }

    /** 清除选中样式 */
    const clearSelectionStyles = () => {
      if (!containerRef.value) return
      const selectableElements = containerRef.value.querySelectorAll('[data-selectable-id]')
      selectableElements.forEach((elem) => {
        elem.classList.remove('selection-active')
      })
    }

    /** 鼠标按下 */
    const handleMouseDown = (e: MouseEvent) => {
      if (props.disabled || e.button !== 0) return

      const target = e.target as HTMLElement
      // 如果点击在可选择项上，不触发圈选
      if (target.closest('[data-selectable-id]')) return

      e.preventDefault()

      if (!containerRef.value) return

      const containerRect = containerRef.value.getBoundingClientRect()
      startPoint.value = {
        x: e.clientX - containerRect.left + containerRef.value.scrollLeft,
        y: e.clientY - containerRect.top + containerRef.value.scrollTop
      }
      currentPoint.value = { ...startPoint.value }

      isMouseDown.value = true
      clearSelectionStyles()
    }

    /** 鼠标移动（节流优化） */
    const handleMouseMove = useThrottleFn((e: MouseEvent) => {
      if (!isMouseDown.value || !containerRef.value) return

      const containerRect = containerRef.value.getBoundingClientRect()
      currentPoint.value = {
        x: e.clientX - containerRect.left + containerRef.value.scrollLeft,
        y: e.clientY - containerRect.top + containerRef.value.scrollTop
      }

      // 计算移动距离
      const distance = Math.hypot(
        currentPoint.value.x - startPoint.value.x,
        currentPoint.value.y - startPoint.value.y
      )

      // 超过阈值才开始圈选
      if (distance > props.threshold) {
        if (!isSelecting.value) {
          isSelecting.value = true
          props.onSelectionStart?.()
        }
        updateSelection(selectionRect.value)
        handleAutoScroll(e)
      }
    }, 16) // 约 60fps

    /** 鼠标抬起 */
    const handleMouseUp = () => {
      if (!isMouseDown.value) return

      isMouseDown.value = false

      if (isSelecting.value) {
        isSelecting.value = false
        props.onSelectionEnd?.(Array.from(selectedIds.value))
      }

      clearSelectionStyles()
      if (scrollTimer.value) {
        clearInterval(scrollTimer.value)
        scrollTimer.value = undefined
      }
    }

    // 注册全局事件
    useEventListener(document, 'mousemove', handleMouseMove)
    useEventListener(document, 'mouseup', handleMouseUp)

    // 阻止拖拽时的默认选中行为
    useEventListener(containerRef, 'selectstart', (e) => {
      if (isSelecting.value) e.preventDefault()
    })

    return () => (
      <div
        ref={containerRef}
        class={['selection-container', props.className]}
        onMousedown={handleMouseDown}
      >
        {slots.default?.()}

        {/* 圈选矩形框 */}
        {isSelecting.value && selectionRect.value.width > 0 && selectionRect.value.height > 0 && (
          <div
            class="selection-rect"
            style={{
              left: `${selectionRect.value.left}px`,
              top: `${selectionRect.value.top}px`,
              width: `${selectionRect.value.width}px`,
              height: `${selectionRect.value.height}px`,
              ...props.rectStyle
            }}
          >
            <div class="selection-rect-border" />
          </div>
        )}

        {/* 注入样式 */}
        <style>{`
          .selection-container {
            position: relative;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }

          .selection-rect {
            position: absolute;
            pointer-events: none;
            z-index: 9999;
            border: 2px solid var(--n-color-primary, #18a058);
            background: color-mix(in srgb, var(--n-color-primary, #18a058) 8%, transparent);
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transition: none;
          }

          .selection-rect-border {
            position: absolute;
            inset: -1px;
            border: 1px solid color-mix(in srgb, var(--n-color-primary, #18a058) 40%, transparent);
            border-radius: 4px;
            animation: selection-pulse 1.5s ease-in-out infinite;
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

          /* 被圈选中的元素样式 */
          .selection-active {
            outline: 2px solid var(--n-color-primary, #18a058) !important;
            outline-offset: 2px;
            background: color-mix(in srgb, var(--n-color-primary, #18a058) 5%, transparent) !important;
            box-shadow: 0 2px 12px color-mix(in srgb, var(--n-color-primary, #18a058) 20%, transparent) !important;
            z-index: 1;
            position: relative;
          }

          /* 暗色主题适配 */
          .n-config-provider[theme-mode="dark"] .selection-rect {
            border-color: var(--n-color-primary, #63e2b7);
            background: color-mix(in srgb, var(--n-color-primary, #63e2b7) 12%, transparent);
            box-shadow: 0 2px 12px rgba(99, 226, 183, 0.15);
          }

          .n-config-provider[theme-mode="dark"] .selection-rect-border {
            border-color: color-mix(in srgb, var(--n-color-primary, #63e2b7) 50%, transparent);
          }

          .n-config-provider[theme-mode="dark"] .selection-active {
            outline-color: var(--n-color-primary, #63e2b7) !important;
            background: color-mix(in srgb, var(--n-color-primary, #63e2b7) 8%, transparent) !important;
            box-shadow: 0 2px 12px color-mix(in srgb, var(--n-color-primary, #63e2b7) 25%, transparent) !important;
          }

          /* 性能优化 */
          .selection-container * {
            pointer-events: auto;
          }

          .selection-rect,
          .selection-rect * {
            pointer-events: none !important;
          }
        `}</style>
      </div>
    )
  }
})