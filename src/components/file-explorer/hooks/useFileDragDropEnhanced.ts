import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { DragDropOptions, FileItem, DragState, DropZoneState } from '../types/file-explorer'

export function useFileDragDropEnhanced(options: DragDropOptions = {}) {
  const {
    onDragStart,
    onDragEnd,
    onDrop,
    onMove,
    onCopy,
    validateDrop,
    allowMultiple = true,
    acceptedTypes = ['file', 'folder']
  } = options

  // 拖拽状态
  const dragState = ref<DragState>({
    isDragging: false,
    draggedItems: [],
    dragStartPos: null,
    dragCurrentPos: null
  })

  // 放置区域状态映射
  const dropZones = ref<Map<string, DropZoneState>>(new Map())

  // 当前操作类型
  const dragOperation = ref<'move' | 'copy'>('move')

  // 计算属性
  const isDragging = computed(() => dragState.value.isDragging)
  const draggedCount = computed(() => dragState.value.draggedItems.length)
  const dragOffset = computed(() => {
    if (!dragState.value.dragStartPos || !dragState.value.dragCurrentPos) {
      return { x: 0, y: 0 }
    }
    return {
      x: dragState.value.dragCurrentPos.x - dragState.value.dragStartPos.x,
      y: dragState.value.dragCurrentPos.y - dragState.value.dragStartPos.y
    }
  })

  /**
   * 开始拖拽
   */
  const startDrag = (
    items: FileItem[],
    event: DragEvent,
    operation: 'move' | 'copy' = 'move'
  ) => {
    if (!allowMultiple && items.length > 1) {
      items = [items[0]]
    }

    const validItems = items.filter(item => acceptedTypes.includes(item.type))
    if (validItems.length === 0) return

    dragState.value = {
      isDragging: true,
      draggedItems: validItems,
      dragStartPos: { x: event.clientX, y: event.clientY },
      dragCurrentPos: { x: event.clientX, y: event.clientY }
    }

    dragOperation.value = operation

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = operation === 'copy' ? 'copy' : 'move'
      event.dataTransfer.setData('application/file-explorer', JSON.stringify({
        items: validItems.map(item => item.id),
        operation
      }))
      
      // 设置一个透明的拖拽图像，让我们的自定义预览生效
      const dragImage = document.createElement('div')
      dragImage.style.opacity = '0'
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-9999px'
      document.body.appendChild(dragImage)
      event.dataTransfer.setDragImage(dragImage, 0, 0)
      // 清理
      setTimeout(() => document.body.removeChild(dragImage), 0)
    }

    onDragStart?.(validItems)
  }

  /**
   * 更新拖拽位置（优化版）
   */
  const updateDragPosition = (event: DragEvent | MouseEvent) => {
   if (!dragState.value.isDragging) return
    const x = event.clientX
    const y = event.clientY
    // 过滤掉无效的坐标
    // 1. 坐标为 0 的情况（浏览器在某些元素上会返回 0）
    // 2. 坐标为负数的情况
    // 3. 坐标没有变化的情况（避免不必要的更新）
    if (x === 0 && y === 0) {
      // 坐标全为 0，保持上一次的位置
      return
    }
    
    if (x < 0 || y < 0) {
      // 负数坐标，无效
      return
    }
    // 检查是否与上次位置相同（避免无意义的更新）
    const lastPos = dragState.value.dragCurrentPos
    if (lastPos && lastPos.x === x && lastPos.y === y) {
      return
    }
    // 更新位置
    dragState.value.dragCurrentPos = { x, y }
  }

  /**
   * 更新操作类型
   */
  const updateDragOperation = (event: DragEvent | KeyboardEvent) => {
    const newOperation = (event.ctrlKey || event.metaKey) ? 'copy' : 'move'
    
    if (dragOperation.value !== newOperation) {
      dragOperation.value = newOperation
    }
    
    // 更新 dataTransfer 的 dropEffect
    if ('dataTransfer' in event && event.dataTransfer) {
      event.dataTransfer.dropEffect = newOperation
    }
  }

  /**
   * 结束拖拽
   */
  const endDrag = () => {
    dragState.value = {
      isDragging: false,
      draggedItems: [],
      dragStartPos: null,
      dragCurrentPos: null
    }

    dropZones.value.clear()
    onDragEnd?.()
  }

  /**
   * 注册放置区域
   */
  const registerDropZone = (zoneId: string, targetPath: string) => {
    if (!dropZones.value.has(zoneId)) {
      dropZones.value.set(zoneId, {
        isOver: false,
        canDrop: false,
        targetPath
      })
    }
  }

  /**
   * 注销放置区域
   */
  const unregisterDropZone = (zoneId: string) => {
    dropZones.value.delete(zoneId)
  }

  /**
   * 获取放置区域状态
   */
  const getDropZoneState = (zoneId: string): DropZoneState | undefined => {
    return dropZones.value.get(zoneId)
  }

  /**
   * 进入放置区域
   */
  const enterDropZone = (zoneId: string, targetPath: string) => {
    const items = dragState.value.draggedItems
    if (items.length === 0) return

    const canDrop = validateDropInternal(items, targetPath)

    dropZones.value.set(zoneId, {
      isOver: true,
      canDrop,
      targetPath
    })
  }

  /**
   * 离开放置区域
   */
  const leaveDropZone = (zoneId: string) => {
    const zone = dropZones.value.get(zoneId)
    if (zone) {
      dropZones.value.set(zoneId, {
        ...zone,
        isOver: false
      })
    }
  }

  /**
   * 内部验证
   */
  const validateDropInternal = (items: FileItem[], targetPath: string): boolean => {
    if (validateDrop && !validateDrop(items, targetPath)) {
      return false
    }

    return items.every(item => {
      if (item.path === targetPath) return false
      if (targetPath.startsWith(item.path + '/')) return false
      return true
    })
  }

  /**
   * 执行放置
   */
  const executeDrop = async (zoneId: string) => {
    const zone = dropZones.value.get(zoneId)
    if (!zone || !zone.canDrop || !zone.targetPath) return 

    const items = dragState.value.draggedItems
    const targetPath = zone.targetPath
    const operation = dragOperation.value

    try {
      await onDrop?.(items, targetPath)

      if (operation === 'copy') {
        await onCopy?.(items, targetPath)
      } else {
        await onMove?.(items, targetPath)
      }
    } finally {
      endDrag()
    }
  }

  // 🔥 关键优化：全局事件监听，确保预览始终跟随鼠标
  let globalListenersAttached = false

  const attachGlobalListeners = () => {
    if (globalListenersAttached) return
    
    const handleGlobalDrag = (e: DragEvent) => {
      if (isDragging.value) {
        updateDragPosition(e)
      }
    }
    
    const handleGlobalDragOver = (e: DragEvent) => {
      if (isDragging.value) {
        e.preventDefault() // 必须调用才能触发 drop
        updateDragPosition(e)
        updateDragOperation(e)
      }
    }
    
    const handleGlobalKeyChange = (e: KeyboardEvent) => {
      if (isDragging.value) {
        updateDragOperation(e)
      }
    }
    
    // 🔥 全局 dragend 事件处理
    const handleGlobalDragEnd = (e: DragEvent) => {
      if (isDragging.value) {
        console.log('🛑 全局 dragend 触发，清理拖拽状态')
        endDrag()
      }
    }
    
    // 🔥 全局 drop 事件处理（备用）
    const handleGlobalDrop = (e: DragEvent) => {
      if (isDragging.value) {
        console.log('📦 全局 drop 触发')
        // drop 事件会在 dragend 之前触发，这里不做处理
        // 让具体的 DropZone 处理 drop 逻辑
      }
    }
    
    // 监听拖拽事件
    document.addEventListener('drag', handleGlobalDrag, true)
    document.addEventListener('dragover', handleGlobalDragOver, true)
    document.addEventListener('dragend', handleGlobalDragEnd, true)
    document.addEventListener('drop', handleGlobalDrop, true)
    
    // 监听键盘事件
    document.addEventListener('keydown', handleGlobalKeyChange, true)
    document.addEventListener('keyup', handleGlobalKeyChange, true)
    
    globalListenersAttached = true
    
    // 返回清理函数
    return () => {
      document.removeEventListener('drag', handleGlobalDrag, true)
      document.removeEventListener('dragover', handleGlobalDragOver, true)
      document.removeEventListener('dragend', handleGlobalDragEnd, true)
      document.removeEventListener('drop', handleGlobalDrop, true)
      document.removeEventListener('keydown', handleGlobalKeyChange, true)
      document.removeEventListener('keyup', handleGlobalKeyChange, true)
      globalListenersAttached = false
    }
  }

  // 自动管理全局监听器
  let cleanup: (() => void) | undefined

  // 在组件挂载时附加全局监听器
  if (typeof window !== 'undefined') {
    onMounted(() => {
      cleanup = attachGlobalListeners()
    })
    
    onUnmounted(() => {
      cleanup?.()
    })
  }

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
    executeDrop,
    
    // 工具方法
    attachGlobalListeners
  }
}