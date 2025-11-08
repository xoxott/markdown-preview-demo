import { defineComponent, ref, computed, PropType, CSSProperties, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useEventListener, useThrottleFn } from '@vueuse/core'
import { useThemeVars } from 'naive-ui'
import type { ScrollbarInst } from 'naive-ui'

/**
 * 坐标点类型
 */
interface Point { x: number; y: number }

/**
 * 矩形类型
 */
interface Rect { left: number; top: number; width: number; height: number }

/**
 * SelectionRect 组件
 * - 专为 NScrollbar 设计的拖拽选择功能
 * - 支持自动滚动、阈值控制、选中元素回调
 */
export default defineComponent({
  name: 'NSelectionRect',
  props: {
    /** 禁用拖选 */
    disabled: { type: Boolean, default: false },
    /** 容器 className */
    className: { type: String, default: '' },
    /** 选区矩形自定义样式 */
    rectStyle: { type: Object as PropType<CSSProperties>, default: () => ({}) },
    /** 鼠标移动最小距离触发选区 */
    threshold: { type: Number, default: 5 },
    /** 是否启用自动滚动 */
    autoScroll: { type: Boolean, default: true },
    /** 自动滚动速度 */
    scrollSpeed: { type: Number, default: 8 },
    /** 自动滚动触发的边距 */
    scrollEdge: { type: Number, default: 10 },
    /** 可选元素标识属性名（如 data-selectable-id） */
    selectableSelector: { type: String, default: '[data-selectable-id]' },
    /** 阻止拖选的元素标识属性 */
    preventDragSelector: { type: String, default: 'data-prevent-selection' },
    /** 拖选开始回调 */
    onSelectionStart: Function as PropType<() => void>,
    /** 拖选中回调 */
    onSelectionChange: Function as PropType<(ids: string[]) => void>,
    /** 拖选结束回调 */
    onSelectionEnd: Function as PropType<(ids: string[]) => void>,
    /** 清除选择回调 */
    onClearSelection: Function as PropType<() => void>
  },
  setup(props, { slots }) {
    const themeVars = useThemeVars()

    // 容器引用
    const containerRef = ref<HTMLDivElement>()
    const scrollbarInst = ref<ScrollbarInst>()
    const scrollContainer = ref<HTMLElement>()

    // 拖选状态
    const isSelecting = ref(false)
    const isMouseDown = ref(false)
    const startPoint = ref<Point>({ x: 0, y: 0 })
    const currentPoint = ref<Point>({ x: 0, y: 0 })
    const selectedIds = ref<Set<string>>(new Set())

    // 自动滚动相关
    const autoScrollTimer = ref<number>()
    const lastMouseEvent = ref<MouseEvent>()

    /**
     * 初始化 NScrollbar 实例和滚动容器
     */
    const initScrollbar = async () => {
      await nextTick()
      
      if (!containerRef.value) return

      // 查找 NScrollbar 组件
      const scrollbarEl = containerRef.value.querySelector('.n-scrollbar') as HTMLElement
      if (!scrollbarEl) {
        console.warn('SelectionRect: 未找到 NScrollbar 组件')
        return
      }

      // 获取滚动容器 (.n-scrollbar-container)
      const container = scrollbarEl.querySelector('.n-scrollbar-container') as HTMLElement
      if (container) {
        scrollContainer.value = container
      }

      // 尝试从 Vue 实例中获取 NScrollbar 实例
      // @ts-ignore - 访问 Vue 内部属性
      const vnode = scrollbarEl.__vueParentComponent
      if (vnode?.exposed) {
        scrollbarInst.value = vnode.exposed as ScrollbarInst
      }
    }

    onMounted(() => {
      initScrollbar()
    })

    /**
     * 计算内容坐标下的选区矩形
     */
    const selectionRect = computed<Rect>(() => {
      if (!containerRef.value || !scrollContainer.value) {
        return { left: 0, top: 0, width: 0, height: 0 }
      }

      const scroll = scrollContainer.value
      const left = Math.max(0, Math.min(startPoint.value.x, currentPoint.value.x))
      const top = Math.max(0, Math.min(startPoint.value.y, currentPoint.value.y))
      const right = Math.min(scroll.scrollWidth, Math.max(startPoint.value.x, currentPoint.value.x))
      const bottom = Math.min(scroll.scrollHeight, Math.max(startPoint.value.y, currentPoint.value.y))

      return { left, top, width: right - left, height: bottom - top }
    })

    /**
     * 计算显示在容器中的选区矩形（减去滚动偏移）
     */
    const displayRect = computed<Rect>(() => {
      if (!scrollContainer.value) return { left: 0, top: 0, width: 0, height: 0 }
      
      const scroll = scrollContainer.value
      const rect = selectionRect.value
      return { 
        left: rect.left - scroll.scrollLeft, 
        top: rect.top - scroll.scrollTop, 
        width: rect.width, 
        height: rect.height 
      }
    })

    /** 判断两个 Set 是否相等 */
    const areSetsEqual = (set1: Set<string>, set2: Set<string>) =>
      set1.size === set2.size && Array.from(set1).every(i => set2.has(i))

    /**
     * 判断元素是否在选区内
     * @param el 目标元素
     * @param rect 选区矩形（内容坐标）
     */
    const isElementInSelection = (el: HTMLElement, rect: Rect) => {
      if (!containerRef.value || !scrollContainer.value) return false
      
      const containerRect = containerRef.value.getBoundingClientRect()
      const scroll = scrollContainer.value

      const r = el.getBoundingClientRect()
      const elemRect = {
        left: r.left - containerRect.left + scroll.scrollLeft,
        top: r.top - containerRect.top + scroll.scrollTop,
        right: r.right - containerRect.left + scroll.scrollLeft,
        bottom: r.bottom - containerRect.top + scroll.scrollTop
      }

      return !(
        elemRect.right < rect.left || 
        elemRect.left > rect.left + rect.width || 
        elemRect.bottom < rect.top || 
        elemRect.top > rect.top + rect.height
      )
    }

    /**
     * 更新选中元素
     * @param rect 当前选区矩形
     */
    const updateSelection = (rect: Rect) => {
      if (!containerRef.value) return
      
      const newSelectedIds = new Set<string>()
      containerRef.value.querySelectorAll<HTMLElement>(props.selectableSelector).forEach(el => {
        const id = el.dataset.selectableId
        if (id && isElementInSelection(el, rect)) {
          newSelectedIds.add(id)
        }
      })

      if (!areSetsEqual(selectedIds.value, newSelectedIds)) {
        selectedIds.value = newSelectedIds
        props.onSelectionChange?.(Array.from(newSelectedIds))
      }
    }

    /**
     * 执行自动滚动（使用 NScrollbar 的 scrollBy 方法）
     */
    const performAutoScroll = () => {
      if (!props.autoScroll || !scrollContainer.value || !lastMouseEvent.value) return

      const { clientX, clientY } = lastMouseEvent.value
      const scroll = scrollContainer.value
      const rect = scroll.getBoundingClientRect()
      let dx = 0, dy = 0

      // 垂直滚动
      if (clientY - rect.top < props.scrollEdge && scroll.scrollTop > 0) {
        dy = -props.scrollSpeed
      } else if (rect.bottom - clientY < props.scrollEdge && scroll.scrollTop < scroll.scrollHeight - scroll.clientHeight) {
        dy = props.scrollSpeed
      }

      // 水平滚动
      if (clientX - rect.left < props.scrollEdge && scroll.scrollLeft > 0) {
        dx = -props.scrollSpeed
      } else if (rect.right - clientX < props.scrollEdge && scroll.scrollLeft < scroll.scrollWidth - scroll.clientWidth) {
        dx = props.scrollSpeed
      }

      if (dx || dy) {
        // 优先使用 NScrollbar 的 scrollBy 方法
        if (scrollbarInst.value?.scrollBy) {
          scrollbarInst.value.scrollBy({ left: dx, top: dy, behavior: 'auto' })
        } else {
          // 降级到原生 scrollBy
          scroll.scrollBy({ left: dx, top: dy, behavior: 'auto' })
        }
        
        // 更新当前坐标点
        if (containerRef.value) {
          const containerRect = containerRef.value.getBoundingClientRect()
          currentPoint.value = {
            x: clientX - containerRect.left + scroll.scrollLeft,
            y: clientY - containerRect.top + scroll.scrollTop
          }
        }
      }
    }

    /** 开始自动滚动 */
    const startAutoScroll = () => {
      if (!autoScrollTimer.value) {
        autoScrollTimer.value = window.setInterval(() => {
          performAutoScroll()
          if (isSelecting.value) {
            updateSelection(selectionRect.value)
          }
        }, 16)
      }
    }

    /** 停止自动滚动 */
    const stopAutoScroll = () => {
      if (autoScrollTimer.value) {
        clearInterval(autoScrollTimer.value)
        autoScrollTimer.value = undefined
      }
    }

    /** 判断是否允许拖选 */
    const canStartDragSelection = (target: HTMLElement) => 
      !target.closest(`[${props.preventDragSelector}]`)

    /** 鼠标按下事件 */
    const handleMouseDown = (e: MouseEvent) => {
      if (props.disabled || e.button !== 0 || !canStartDragSelection(e.target as HTMLElement)) {
        return
      }
      
      e.preventDefault()
      
      if (!containerRef.value || !scrollContainer.value) return

      const scroll = scrollContainer.value
      const rect = containerRef.value.getBoundingClientRect()
      
      startPoint.value = { 
        x: e.clientX - rect.left + scroll.scrollLeft, 
        y: e.clientY - rect.top + scroll.scrollTop 
      }
      currentPoint.value = { ...startPoint.value }
      isMouseDown.value = true
      selectedIds.value.clear()
      lastMouseEvent.value = e
    }

    /** 鼠标移动事件 */
    const handleMouseMove = useThrottleFn((e: MouseEvent) => {
      if (!isMouseDown.value) return
      
      lastMouseEvent.value = e
      
      if (!containerRef.value || !scrollContainer.value) return

      const rect = containerRef.value.getBoundingClientRect()
      const scroll = scrollContainer.value
      
      currentPoint.value = { 
        x: e.clientX - rect.left + scroll.scrollLeft, 
        y: e.clientY - rect.top + scroll.scrollTop 
      }

      const distance = Math.hypot(
        currentPoint.value.x - startPoint.value.x, 
        currentPoint.value.y - startPoint.value.y
      )
      
      if (distance > props.threshold) {
        if (!isSelecting.value) {
          isSelecting.value = true
          props.onSelectionStart?.()
        }
        updateSelection(selectionRect.value)
        if (props.autoScroll) {
          startAutoScroll()
        }
      }
    }, 16)

    /** 鼠标抬起事件 */
    const handleMouseUp = (e?: MouseEvent) => {
      if (!isMouseDown.value) return
      
      isMouseDown.value = false
      stopAutoScroll()
      
      if (isSelecting.value) {
        isSelecting.value = false
        props.onSelectionEnd?.(Array.from(selectedIds.value))
        e?.stopPropagation?.()
      }
      
      selectedIds.value.clear()
      lastMouseEvent.value = undefined
    }

    /** 点击空白区域清空选中 */
    const handleClickOutside = (e: MouseEvent) => {
      if (isSelecting.value) return
      
      const target = e.target as HTMLElement
      const selectableEl = target.closest(props.selectableSelector)
      
      if (!selectableEl) {
        selectedIds.value.clear()
        props.onClearSelection?.()
      }
    }

    /** 滚动事件处理 */
    const handleScroll = () => {
      if (isSelecting.value) {
        updateSelection(selectionRect.value)
      }
    }

    // 全局事件监听
    useEventListener(document, 'mousedown', handleClickOutside)
    useEventListener(document, 'mousemove', handleMouseMove)
    useEventListener(document, 'mouseup', e => handleMouseUp(e))
    useEventListener(containerRef, 'selectstart', e => { 
      if (isSelecting.value || isMouseDown.value) e.preventDefault() 
    })

    // 监听 NScrollbar 的滚动事件
    onMounted(() => {
      if (scrollContainer.value) {
        scrollContainer.value.addEventListener('scroll', handleScroll)
      }
    })

    onBeforeUnmount(() => {
      stopAutoScroll()
      if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('scroll', handleScroll)
      }
    })

    /** 动态样式 */
    const dynamicStyles = computed(() => `
      .selection-container { 
        position: relative; 
        user-select: none; 
        overflow: hidden;
      }
      .selection-rect {
        position: absolute; 
        pointer-events: none; 
        z-index: 9999;
        border: 2px solid ${themeVars.value.primaryColor};
        background: ${themeVars.value.primaryColorHover}14; 
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      .selection-rect-border {
        position: absolute; 
        inset: -1px;
        border: 1px solid ${themeVars.value.primaryColorHover}66; 
        border-radius: 4px;
        animation: selection-pulse 1.5s ease-in-out infinite;
      }
      @keyframes selection-pulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(0.98); }
      }
    `)

    return () => (
      <div 
        ref={containerRef} 
        class={['selection-container', props.className]} 
        onMousedown={handleMouseDown}
      >
        {slots.default?.()}
        {isSelecting.value && displayRect.value.width > 0 && displayRect.value.height > 0 && (
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
        <style>{dynamicStyles.value}</style>
      </div>
    )
  }
})