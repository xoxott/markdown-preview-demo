/**
 * BaseDialog - 基础可拖拽弹窗组件
 * 基于 Naive UI 的 NModal 进行二次封装,添加拖拽功能
 */

import { computed, defineComponent, PropType, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { NModal, NCard, NButton, NIcon, useThemeVars } from 'naive-ui'
import { Close } from '@vicons/ionicons5'
import { BaseDialogProps, DialogPosition, DEFAULT_DIALOG_CONFIG, ResizeDirection } from '../types/dialog'
import styles from './BaseDialog.module.scss'

export default defineComponent({
  name: 'BaseDialog',
  props: {
    show: { type: Boolean, required: true },
    title: { type: String, default: '' },
    width: { type: [Number, String], default: 600 },
    height: { type: [Number, String], default: 'auto' },
    minWidth: { type: Number, default: DEFAULT_DIALOG_CONFIG.minWidth },
    minHeight: { type: Number, default: DEFAULT_DIALOG_CONFIG.minHeight },
    maxWidth: { type: Number, default: undefined },
    maxHeight: { type: Number, default: undefined },
    draggable: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.draggable },
    resizable: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.resizable },
    maskClosable: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.maskClosable },
    showClose: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.showClose },
    closeOnEsc: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.closeOnEsc },
    position: {
      type: [String, Object] as PropType<'center' | DialogPosition>,
      default: DEFAULT_DIALOG_CONFIG.position
    },
    zIndex: { type: Number, default: undefined },
    class: { type: String, default: '' },
    contentClass: { type: String, default: '' },
    onClose: { type: Function as PropType<() => void>, default: undefined },
    onMaskClick: { type: Function as PropType<() => void>, default: undefined },
    onAfterEnter: { type: Function as PropType<() => void>, default: undefined },
    onAfterLeave: { type: Function as PropType<() => void>, default: undefined }
  },
  setup(props, { slots }) {
    const themeVars = useThemeVars()
    const dialogRef = ref<HTMLElement | null>(null)
    const headerRef = ref<HTMLElement | null>(null)

    // 拖拽状态
    const isDragging = ref(false)
    const currentPosition = ref<DialogPosition>({ x: 0, y: 0 })
    const dragStart = ref({ x: 0, y: 0, dialogX: 0, dialogY: 0 })

    // 调整大小状态
    const isResizing = ref(false)
    const resizeDirection = ref<ResizeDirection | null>(null)
    const currentSize = ref({ width: 0, height: 0 })
    const resizeStart = ref({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      dialogX: 0,
      dialogY: 0
    })

    // 计算弹窗样式
    const dialogStyle = computed(() => {
      const style: Record<string, string> = {}

      // 宽度
      if (currentSize.value.width > 0) {
        style.width = `${currentSize.value.width}px`
      } else if (typeof props.width === 'number') {
        style.width = `${props.width}px`
      } else {
        style.width = props.width
      }

      // 高度
      if (currentSize.value.height > 0) {
        style.height = `${currentSize.value.height}px`
      } else if (typeof props.height === 'number') {
        style.height = `${props.height}px`
      } else if (props.height !== 'auto') {
        style.height = props.height
      }

      // 最小/最大尺寸
      if (props.minWidth) style.minWidth = `${props.minWidth}px`
      if (props.minHeight) style.minHeight = `${props.minHeight}px`
      if (props.maxWidth) style.maxWidth = `${props.maxWidth}px`
      if (props.maxHeight) style.maxHeight = `${props.maxHeight}px`

      // 位置
      if (props.position !== 'center') {
        style.position = 'fixed'
        style.left = `${currentPosition.value.x}px`
        style.top = `${currentPosition.value.y}px`
        style.transform = 'none'
      }

      return style
    })

    // 初始化位置
    const initPosition = () => {
      if (props.position !== 'center' && typeof props.position === 'object') {
        currentPosition.value = { ...props.position }
      } else if (props.position === 'center' && dialogRef.value) {
        // 居中位置
        const rect = dialogRef.value.getBoundingClientRect()
        currentPosition.value = {
          x: (window.innerWidth - rect.width) / 2,
          y: (window.innerHeight - rect.height) / 2
        }
      }
    }

    // 开始拖拽
    const handleDragStart = (e: MouseEvent) => {
      if (!props.draggable) return
      if (!headerRef.value?.contains(e.target as Node)) return

      // 排除关闭按钮
      if ((e.target as HTMLElement).closest('.dialog-close-btn')) return

      e.preventDefault()
      isDragging.value = true

      dragStart.value = {
        x: e.clientX,
        y: e.clientY,
        dialogX: currentPosition.value.x,
        dialogY: currentPosition.value.y
      }

      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.body.style.cursor = 'move'
      document.body.style.userSelect = 'none'
    }

    // 拖拽移动
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging.value) return

      const deltaX = e.clientX - dragStart.value.x
      const deltaY = e.clientY - dragStart.value.y

      let newX = dragStart.value.dialogX + deltaX
      let newY = dragStart.value.dialogY + deltaY

      // 边界限制
      if (dialogRef.value) {
        const rect = dialogRef.value.getBoundingClientRect()
        const maxX = window.innerWidth - rect.width
        const maxY = window.innerHeight - rect.height

        newX = Math.max(0, Math.min(newX, maxX))
        newY = Math.max(0, Math.min(newY, maxY))
      }

      currentPosition.value = { x: newX, y: newY }
    }

    // 结束拖拽
    const handleDragEnd = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // 开始调整大小
    const handleResizeStart = (e: MouseEvent, direction: ResizeDirection) => {
      if (!props.resizable) return

      e.preventDefault()
      e.stopPropagation()
      isResizing.value = true
      resizeDirection.value = direction

      const rect = dialogRef.value?.getBoundingClientRect()
      if (!rect) return

      resizeStart.value = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
        dialogX: currentPosition.value.x,
        dialogY: currentPosition.value.y
      }

      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      document.body.style.userSelect = 'none'
    }

    // 调整大小移动
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing.value || !resizeDirection.value) return

      const deltaX = e.clientX - resizeStart.value.x
      const deltaY = e.clientY - resizeStart.value.y
      const direction = resizeDirection.value

      let newWidth = resizeStart.value.width
      let newHeight = resizeStart.value.height
      let newX = resizeStart.value.dialogX
      let newY = resizeStart.value.dialogY

      // 根据方向计算新尺寸和位置
      if (direction.includes('e')) {
        newWidth = resizeStart.value.width + deltaX
      }
      if (direction.includes('w')) {
        newWidth = resizeStart.value.width - deltaX
        newX = resizeStart.value.dialogX + deltaX
      }
      if (direction.includes('s')) {
        newHeight = resizeStart.value.height + deltaY
      }
      if (direction.includes('n')) {
        newHeight = resizeStart.value.height - deltaY
        newY = resizeStart.value.dialogY + deltaY
      }

      // 应用最小/最大尺寸限制
      const minW = props.minWidth || 200
      const minH = props.minHeight || 150
      const maxW = props.maxWidth || window.innerWidth
      const maxH = props.maxHeight || window.innerHeight

      newWidth = Math.max(minW, Math.min(newWidth, maxW))
      newHeight = Math.max(minH, Math.min(newHeight, maxH))

      // 边界检查
      if (direction.includes('w')) {
        const maxLeft = resizeStart.value.dialogX + resizeStart.value.width - minW
        newX = Math.min(newX, maxLeft)
        newX = Math.max(0, newX)
        newWidth = resizeStart.value.dialogX + resizeStart.value.width - newX
      }
      if (direction.includes('n')) {
        const maxTop = resizeStart.value.dialogY + resizeStart.value.height - minH
        newY = Math.min(newY, maxTop)
        newY = Math.max(0, newY)
        newHeight = resizeStart.value.dialogY + resizeStart.value.height - newY
      }

      currentSize.value = { width: newWidth, height: newHeight }
      if (direction.includes('w') || direction.includes('n')) {
        currentPosition.value = { x: newX, y: newY }
      }
    }

    // 结束调整大小
    const handleResizeEnd = () => {
      isResizing.value = false
      resizeDirection.value = null
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.body.style.userSelect = ''
    }

    // 获取调整大小手柄的光标样式
    const getResizeCursor = (direction: ResizeDirection): string => {
      const cursors: Record<ResizeDirection, string> = {
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize',
        ne: 'nesw-resize',
        nw: 'nwse-resize',
        se: 'nwse-resize',
        sw: 'nesw-resize'
      }
      return cursors[direction]
    }

    // 渲染调整大小手柄
    const renderResizeHandles = () => {
      if (!props.resizable) return null

      const directions: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

      return directions.map(direction => (
        <div
          key={direction}
          class={[styles['resize-handle'], styles[`resize-handle-${direction}`]]}
          style={{ cursor: getResizeCursor(direction) }}
          onMousedown={(e: MouseEvent) => handleResizeStart(e, direction)}
        />
      ))
    }

    // 关闭弹窗
    const handleClose = () => {
      props.onClose?.()
    }

    // 遮罩点击
    const handleMaskClick = () => {
      if (props.maskClosable) {
        props.onMaskClick?.()
        handleClose()
      }
    }

    // 键盘事件
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.closeOnEsc && props.show) {
        handleClose()
      }
    }

    // 监听显示状态
    watch(() => props.show, (show) => {
      if (show) {
        setTimeout(() => {
          initPosition()
          props.onAfterEnter?.()
        }, 50)
      } else {
        props.onAfterLeave?.()
      }
    })

    // 生命周期
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown)
      handleDragEnd()
      handleResizeEnd()
    })

    return () => (
      <NModal
        show={props.show}
        maskClosable={props.maskClosable}
        onMaskClick={handleMaskClick}
        onUpdateShow={(show: boolean) => !show && handleClose()}
        class={[styles['base-dialog-modal'], props.class]}
        zIndex={props.zIndex}
        transformOrigin="center"
      >
        <NCard
          ref={dialogRef}
          class={[
            styles['base-dialog'],
            props.draggable && styles['draggable'],
            props.resizable && styles['resizable'],
            isDragging.value && styles['dragging'],
            isResizing.value && styles['resizing']
          ]}
          style={dialogStyle.value}
          bordered={false}
          role="dialog"
          aria-modal="true"
        >
          {/* 调整大小手柄 */}
          {renderResizeHandles()}
          {{
            header: () => (
              <div
                ref={headerRef}
                class={styles['dialog-header']}
                onMousedown={handleDragStart}
                style={{
                  cursor: props.draggable ? 'move' : 'default',
                  backgroundColor: themeVars.value.cardColor
                }}
              >
                {slots.header ? (
                  slots.header()
                ) : (
                  <div class={styles['dialog-title']} style={{ color: themeVars.value.textColor1 }}>
                    {props.title}
                  </div>
                )}
                {props.showClose && (
                  <NButton
                    text
                    class={[styles['dialog-close-btn'], 'dialog-close-btn']}
                    onClick={handleClose}
                    style={{
                      color: themeVars.value.textColor3
                    }}
                  >
                    {{
                      icon: () => <NIcon size={20}><Close /></NIcon>
                    }}
                  </NButton>
                )}
              </div>
            ),
            default: () => (
              <div class={[styles['dialog-content'], props.contentClass]}>
                {slots.default?.()}
              </div>
            ),
            footer: slots.footer
              ? () => (
                  <div class={styles['dialog-footer']}>
                    {slots.footer?.()}
                  </div>
                )
              : undefined
          }}
        </NCard>
      </NModal>
    )
  }
})

