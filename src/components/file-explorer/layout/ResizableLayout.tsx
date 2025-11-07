import { defineComponent, ref, PropType, computed, onMounted, onBeforeUnmount } from 'vue'
import { NLayout, NLayoutSider, NLayoutContent, useThemeVars, NIcon } from 'naive-ui'
import { GripVertical } from '@vicons/tabler'

export interface LayoutConfig {
  leftWidth: number
  rightWidth: number
  minRightWidth?: number
  maxRightWidth?: number
  showLeft?: boolean
  showRight?: boolean
  leftCollapsed?: boolean
}

export default defineComponent({
  name: 'ResizableLayout',
  props: {
    config: {
      type: Object as PropType<LayoutConfig>,
      default: () => ({
        leftWidth: 240,
        rightWidth: 300,
        minRightWidth: 200,
        maxRightWidth: 600,
        showLeft: true,
        showRight: true,
        leftCollapsed: false
      })
    },
    onConfigChange: {
      type: Function as PropType<(config: LayoutConfig) => void>,
      default: undefined
    }
  },
  setup(props, { slots }) {
    const themeVars = useThemeVars()

    const leftWidth = ref(props.config.leftWidth)
    const rightWidth = ref(props.config.rightWidth)
    const showLeft = ref(props.config.showLeft ?? true)
    const showRight = ref(props.config.showRight ?? true)
    const leftCollapsed = ref(props.config.leftCollapsed ?? false)

    const isResizingRight = ref(false)
    const isHoveringHandle = ref(false)
    const startX = ref(0)
    const startWidth = ref(0)

    const minRightWidth = computed(() => props.config.minRightWidth ?? 200)
    const maxRightWidth = computed(() => props.config.maxRightWidth ?? 600)

    // 左侧折叠切换
    const handleLeftCollapse = () => {
      emitConfigChange()
    }

    // 右侧拖拽开始
    const handleRightMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isResizingRight.value = true
      startX.value = e.clientX
      startWidth.value = rightWidth.value
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRight.value) {
        // 计算偏移量：向左移动增加宽度，向右移动减少宽度
        const deltaX = startX.value - e.clientX
        const newWidth = startWidth.value + deltaX

        if (newWidth >= minRightWidth.value && newWidth <= maxRightWidth.value) {
          rightWidth.value = newWidth
          // 使用 requestAnimationFrame 使拖拽更流畅
          requestAnimationFrame(() => {
            emitConfigChange()
          })
        }
      }
    }

    const handleMouseUp = () => {
      if (isResizingRight.value) {
        isResizingRight.value = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    const emitConfigChange = () => {
      if (props.onConfigChange) {
        props.onConfigChange({
          leftWidth: leftWidth.value,
          rightWidth: rightWidth.value,
          minRightWidth: minRightWidth.value,
          maxRightWidth: maxRightWidth.value,
          showLeft: showLeft.value,
          showRight: showRight.value,
          leftCollapsed: leftCollapsed.value
        })
      }
    }

    onMounted(() => {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    })

    // 渲染右侧拖拽手柄
    const renderRightResizeHandle = () => {
      const isActive = isResizingRight.value || isHoveringHandle.value
      return (
        <div
          class="absolute top-0 left-0 bottom-0 w-0.5 cursor-col-resize group transition-all z-50"
          style={{
            backgroundColor: themeVars.value.dividerColor
          }}
           onMousedown={handleRightMouseDown}
          onMouseenter={() => isHoveringHandle.value = true}
          onMouseleave={() => isHoveringHandle.value = false}
        >
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 flex items-center justify-center rounded transition-all opacity-0 group-hover:opacity-100"
            style={{
              backgroundColor: themeVars.value.dividerColor,
              // boxShadow: themeVars.value.boxShadow2,
              border: `1px solid ${themeVars.value.dividerColor}`
            }}
          >
            <NIcon>
              <GripVertical
              />
            </NIcon>
          </div>
        </div>
      )
    }

    return () => (
      <NLayout class="h-full" hasSider>
        {showLeft.value && (
          <NLayoutSider
            width={leftWidth.value}
            collapsedWidth={64}
            nativeScrollbar={false}
            v-model:collapsed={leftCollapsed.value}
            collapseMode="width"
            show-trigger="arrow-circle"
            bordered
            onCollapse={handleLeftCollapse}
          >
            <div class="h-full overflow-auto">
              {slots.left?.()}
            </div>
          </NLayoutSider>
        )}

        <NLayoutContent
          class="h-full overflow-auto"
          nativeScrollbar={false}
        >
          {slots.default?.()}
        </NLayoutContent>

        {showRight.value && (
          <NLayoutSider
            width={rightWidth.value}
            nativeScrollbar={false}
            collapsed={false}
            showTrigger={false}
            bordered
            class="relative"
            style={{
              transition: isResizingRight.value ? 'none' : 'width 0.2s ease'
            }}
          >
            {renderRightResizeHandle()}
            <div class="h-full overflow-auto">
              {slots.right?.()}
            </div>
          </NLayoutSider>
        )}
      </NLayout>
    )
  }
})