import { defineComponent, PropType, ref, computed, onUnmounted, Ref } from 'vue'
import { FileItem, SortField, SortOrder } from '../types/file-explorer'
import { ChevronDown, ChevronUp } from '@vicons/tabler'
import FileIcon from '../items/FileIcon'
import { NIcon, useThemeVars } from 'naive-ui'
import { formatFileSize } from '../utils/fileHelpers'

interface ColumnConfig {
  id: SortField
  label: string
  width: number
  minWidth?: number
  maxWidth?: number
}

const DEFAULT_MIN_WIDTH = 40

function clampWidth(width: number, minWidth?: number, maxWidth?: number) {
  return Math.min(maxWidth ?? Infinity, Math.max(minWidth ?? DEFAULT_MIN_WIDTH, width))
}

export default defineComponent({
  name: 'DetailView',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    selectedIds: { type: Object as PropType<Ref<Set<string>>>, required: true },
    onSelect: { type: Function as PropType<(id: string[], event?: MouseEvent) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true },
    sortField: { type: String as PropType<SortField>, required: true },
    sortOrder: { type: String as PropType<SortOrder>, required: true },
    onSort: { type: Function as PropType<(field: SortField) => void>, required: true }
  },
  setup(props, { expose }) {
    const themeVars = useThemeVars()
    const tableRef = ref<HTMLTableElement | null>(null)
    const hoveredHeader = ref<SortField | null>(null)
    const hoveredResizer = ref<SortField | null>(null)
    // 列配置 - 自动应用约束
    const columns = ref<ColumnConfig[]>([
      { id: 'name', label: '名称', width: 300 },
      { id: 'modifiedAt', label: '修改时间', width: 180 },
      { id: 'createdAt', label: '创建时间', width: 180 },
      { id: 'type', label: '类型', width: 120 },
      { id: 'size', label: '大小', width: 120 }
    ])

    // 调整列宽状态
    const resizing = ref<{
      columnId: SortField
      startX: number
      leftColumn: ColumnConfig
      rightColumn: ColumnConfig | null
      leftStartWidth: number
      rightStartWidth: number
      columnIndex: number
      animationFrame: number | null
    } | null>(null)

    // 拖拽列顺序状态
    const draggingColumn = ref<{
      id: SortField
      index: number
    } | null>(null)
    const dropTargetIndex = ref<number | null>(null)

    // 计算表格总宽度
    const totalWidth = computed(() => {
      return columns.value.reduce((sum, col) => sum + col.width, 0)
    })

    // 格式化日期
    const formatDate = (date?: string | Date) => {
      if (!date) return ''
      const d = date instanceof Date ? date : new Date(date)
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 获取排序图标
    const getSortIcon = () => props.sortOrder === 'asc' ? ChevronUp : ChevronDown

    // 优化的列宽调整逻辑
    const startResize = (e: MouseEvent, columnId: SortField) => {
      e.stopPropagation()
      e.preventDefault()

      const columnIndex = columns.value.findIndex(c => c.id === columnId)
      const leftCol = columns.value[columnIndex]
      if (!leftCol) return

      const rightIndex = columnIndex + 1
      const rightCol = columns.value[rightIndex] || null

      resizing.value = {
        columnId,
        startX: e.clientX,
        leftColumn: leftCol,
        rightColumn: rightCol,
        leftStartWidth: leftCol.width,
        rightStartWidth: rightCol?.width || 0,
        columnIndex,
        animationFrame: null
      }

      const handleMouseMove = (evt: MouseEvent) => {
        if (!resizing.value) return

        // 使用 requestAnimationFrame 节流，避免过度计算
        if (resizing.value.animationFrame !== null) {
          cancelAnimationFrame(resizing.value.animationFrame)
        }

        resizing.value.animationFrame = requestAnimationFrame(() => {
          if (!resizing.value) return

          const {
            startX,
            leftColumn,
            rightColumn,
            leftStartWidth,
            rightStartWidth
          } = resizing.value

          const delta = evt.clientX - startX

          if (rightColumn) {
            // 双向调整：左列变化，右列反向变化
            const leftMin = leftColumn.minWidth
            const leftMax = leftColumn.maxWidth
            const rightMin = rightColumn.minWidth
            const rightMax = rightColumn.maxWidth

            // 计算左列期望宽度
            let newLeftWidth = leftStartWidth + delta

            // 应用左列约束
            newLeftWidth = clampWidth(newLeftWidth, leftMin, leftMax)

            // 计算实际变化量
            const actualDelta = newLeftWidth - leftStartWidth

            // 右列相应调整
            let newRightWidth = rightStartWidth - actualDelta

            // 应用右列约束
            newRightWidth = clampWidth(newRightWidth, rightMin, rightMax)

            // 如果右列到达边界，回推左列
            const rightActualDelta = rightStartWidth - newRightWidth
            if (Math.abs(rightActualDelta - actualDelta) > 0.5) {
              newLeftWidth = leftStartWidth + rightActualDelta
              newLeftWidth = clampWidth(newLeftWidth, leftMin, leftMax)
            }

            // 批量更新宽度
            leftColumn.width = Math.round(newLeftWidth)
            rightColumn.width = Math.round(newRightWidth)
          } else {
            // 单列调整：最后一列自由调整
            let newWidth = leftStartWidth + delta
            const min = leftColumn.minWidth
            const max = leftColumn.maxWidth

            newWidth = clampWidth(newWidth, min, max)
            leftColumn.width = Math.round(newWidth)
          }
        })
      }

      const handleMouseUp = () => {
        if (resizing.value && resizing.value?.animationFrame !== null) {
          cancelAnimationFrame(resizing.value.animationFrame)
        }
        resizing.value = null
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    // 开始拖拽列
    const startDragColumn = (e: DragEvent, index: number) => {
      const column = columns.value[index]
      draggingColumn.value = { id: column.id, index }

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', column.id)

        const dragPreview = document.createElement('div')
        dragPreview.textContent = column.label
        dragPreview.style.cssText = `
          position: absolute;
          top: -1000px;
          padding: 8px 16px;
          background: ${themeVars.value.primaryColor};
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        `
        document.body.appendChild(dragPreview)
        e.dataTransfer.setDragImage(dragPreview, 0, 0)
        setTimeout(() => document.body.removeChild(dragPreview), 0)
      }
    }

    const handleDragOver = (e: DragEvent, index: number) => {
      e.preventDefault()
      if (!draggingColumn.value || draggingColumn.value.index === index) {
        dropTargetIndex.value = null
        return
      }

      const currentTarget = e.currentTarget as HTMLElement
      const rect = currentTarget.getBoundingClientRect()
      const mouseX = e.clientX
      const columnCenterX = rect.left + rect.width / 2
      const dragIndex = draggingColumn.value.index

      const isOverCenter = dragIndex < index
        ? mouseX > columnCenterX
        : mouseX < columnCenterX

      if (isOverCenter) {
        dropTargetIndex.value = index
      } else if (dropTargetIndex.value === index) {
        dropTargetIndex.value = null
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement
      if (relatedTarget && relatedTarget.tagName === 'TH') return
      dropTargetIndex.value = null
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()

      if (!draggingColumn.value || dropTargetIndex.value === null) return

      const fromIndex = draggingColumn.value.index
      const toIndex = dropTargetIndex.value

      if (fromIndex === toIndex) return

      const newColumns = [...columns.value]
      const [draggedColumn] = newColumns.splice(fromIndex, 1)
      newColumns.splice(toIndex, 0, draggedColumn)
      columns.value = newColumns

      draggingColumn.value = null
      dropTargetIndex.value = null
    }

    const handleDragEnd = () => {
      draggingColumn.value = null
      dropTargetIndex.value = null
    }

    // 计算列的平移距离
    const getColumnTransform = (index: number) => {
      if (!draggingColumn.value || dropTargetIndex.value === null) {
        return 'translateX(0)'
      }

      const dragIndex = draggingColumn.value.index
      const dropIndex = dropTargetIndex.value

      if (index === dragIndex) {
        let offset = 0
        if (dragIndex < dropIndex) {
          for (let i = dragIndex + 1; i <= dropIndex; i++) {
            offset += columns.value[i].width
          }
        } else {
          for (let i = dropIndex; i < dragIndex; i++) {
            offset -= columns.value[i].width
          }
        }
        return `translateX(${offset}px)`
      }

      if (dragIndex < dropIndex && index > dragIndex && index <= dropIndex) {
        return `translateX(-${columns.value[dragIndex].width}px)`
      }
      if (dragIndex > dropIndex && index >= dropIndex && index < dragIndex) {
        return `translateX(${columns.value[dragIndex].width}px)`
      }

      return 'translateX(0)'
    }

    const getColumnZIndex = (index: number) => {
      if (!draggingColumn.value) return 1
      return index === draggingColumn.value.index ? 100 : 10
    }

    // 渲染表头
    const SortHeader = (column: ColumnConfig, index: number) => {
      const SortIconComp = getSortIcon()
      const isActive = props.sortField === column.id
      const isHovered = hoveredHeader.value === column.id
      const isResizerHovered = hoveredResizer.value === column.id
      const isDragging = draggingColumn.value?.id === column.id
      const isResizing = resizing.value?.columnId === column.id

      return (
        <th
          key={column.id}
          class="relative px-4 py-3 text-left text-xs font-medium uppercase tracking-wider select-none"
          style={{
            color: themeVars.value.textColor2,
            backgroundColor: themeVars.value.tableHeaderColor,
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.5 : 1,
            transform: getColumnTransform(index),
            transition: draggingColumn.value
              ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease'
              : 'none',
            zIndex: getColumnZIndex(index),
            borderBottom: `1px solid ${themeVars.value.dividerColor}`,
            borderRight: dropTargetIndex.value === index
              ? `2px solid ${themeVars.value.primaryColor}`
              : 'none'
          }}
          draggable
          onDragstart={(e: DragEvent) => startDragColumn(e, index)}
          onDragover={(e: DragEvent) => handleDragOver(e, index)}
          onDragleave={(e: DragEvent) => handleDragLeave(e)}
          onDrop={(e: DragEvent) => handleDrop(e)}
          onDragend={handleDragEnd}
          onMouseenter={() => hoveredHeader.value = column.id}
          onMouseleave={() => hoveredHeader.value = null}
          onClick={(e: MouseEvent) => {
            if (resizing.value || (e.target as HTMLElement).closest('.resize-handle')) {
              return
            }
            props.onSort(column.id)
          }}
        >
          <div class="flex items-center gap-1 pointer-events-none">
            <span>{column.label}</span>
            <NIcon
              size={16}
              style={{
                color: isActive ? themeVars.value.primaryColor : themeVars.value.textColor3,
                opacity: (isActive || isHovered) ? 1 : 0,
                transition: 'opacity 0.15s ease'
              }}
            >
              <SortIconComp />
            </NIcon>
          </div>

          {/* 调整大小手柄 */}
          <div
            class="resize-handle absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-col-resize z-20"
            style={{
              marginRight: '-6px',
              pointerEvents: 'auto'
            }}
            onMousedown={(e: MouseEvent) => {
              e.stopPropagation()
              startResize(e, column.id)
            }}
            onMouseenter={() => hoveredResizer.value = column.id}
            onMouseleave={() => hoveredResizer.value = null}
            onClick={(e: MouseEvent) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onDragstart={(e: DragEvent) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            draggable={false}
          >
            <div class="absolute inset-0" style={{ cursor: 'col-resize' }} />
            <div
              class="w-0.5 h-full pointer-events-none"
              style={{
                backgroundColor: isResizing
                  ? themeVars.value.primaryColor
                  : isResizerHovered
                    ? themeVars.value.primaryColor
                    : themeVars.value.dividerColor,
                opacity: isResizerHovered || isResizing ? 1 : 0.6,
                transform: isResizerHovered || isResizing ? 'scaleY(1.2)' : 'scaleY(1)',
                transition: isResizing ? 'none' : 'all 200ms ease-out',
                boxShadow: isResizing || isResizerHovered
                  ? `0 0 6px ${themeVars.value.primaryColor}80`
                  : 'none'
              }}
            />
          </div>
        </th>
      )
    }

    // 渲染单元格内容
    const renderCell = (item: FileItem, column: ColumnConfig, isSelected: boolean) => {
      const textStyle = {
        color: isSelected ? themeVars.value.primaryColor : themeVars.value.textColor2
      }

      switch (column.id) {
        case 'name':
          return (
            <div class="flex items-center gap-3 overflow-hidden">
              <FileIcon item={item} size={24} showThumbnail={false} />
              <span
                class="text-sm truncate"
                style={{
                  color: isSelected
                    ? themeVars.value.primaryColor
                    : themeVars.value.textColorBase
                }}
                title={item.name}
              >
                {item.name}
              </span>
            </div>
          )

        case 'modifiedAt':
          return (
            <span class="text-sm truncate block" style={textStyle} title={formatDate(item.modifiedAt)}>
              {formatDate(item.modifiedAt)}
            </span>
          )

        case 'type':
          const typeText = item.type === 'folder'
            ? '文件夹'
            : item.extension?.toUpperCase() || '文件'
          return (
            <span class="text-sm truncate block" style={textStyle} title={typeText}>
              {typeText}
            </span>
          )

        case 'size':
          const sizeText = item.type === 'file' ? formatFileSize(item.size) : '-'
          return (
            <span class="text-sm truncate block" style={textStyle} title={sizeText}>
              {sizeText}
            </span>
          )
        case 'createdAt':
          return (
            <span class="text-sm truncate block" style={textStyle} title={formatDate(item.createdAt)}>
              {formatDate(item.createdAt)}
            </span>
          )
        default:
          return null
      }
    }

    // 清理资源
    onUnmounted(() => {
      if (resizing.value && resizing.value?.animationFrame !== null) {
        cancelAnimationFrame(resizing.value.animationFrame)
      }
    })
    return () => (
      <div
        class="overflow-auto"
        style={{
          backgroundColor: themeVars.value.bodyColor,
          overflowX: 'auto'
        }}
      >
        <table
          ref={tableRef}
          class="min-w-full"
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
            width: '100%'
            // width: `${totalWidth.value}px`
          }}
        >
          <colgroup>
            {columns.value.map(column => (
              <col key={column.id} style={{ width: `${column.width}px` }} />
            ))}
          </colgroup>
          <thead class="sticky top-0 z-10">
            <tr>
              {columns.value.map((column, index) => SortHeader(column, index))}
            </tr>
          </thead>
          <tbody data-selector="content-viewer">
            {props.items.map(item => {
              const isSelected = props.selectedIds.value.has(item.id)
              return (
                <tr
                  key={item.id}
                  data-selectable-id={item.id}
                  class="cursor-pointer transition-colors select-none"
                  style={{
                    backgroundColor: isSelected
                      ? `${themeVars.value.primaryColorHover}20`
                      : themeVars.value.cardColor,
                    borderBottom: `1px solid ${themeVars.value.dividerColor}`
                  }}
                  onMouseenter={(e: MouseEvent) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        themeVars.value.hoverColor
                    }
                  }}
                  onMouseleave={(e: MouseEvent) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        themeVars.value.cardColor
                    }
                  }}
                  onClick={(e: MouseEvent) =>
                    props.onSelect([item.id], e)
                  }
                  onDblclick={() => props.onOpen(item)}
                >
                  {columns.value.map(column => (
                    <td
                      key={column.id}
                      class="px-4 py-3"
                    >
                      {renderCell(item, column, isSelected)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }
})
