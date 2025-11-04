import { defineComponent, PropType, ref } from 'vue'
import { FileItem, SortField, SortOrder } from '../types/file-explorer'
import { ChevronDown, ChevronUp } from '@vicons/tabler'
import FileIcon from '../items/FileIcon'
import { NIcon, useThemeVars } from 'naive-ui'

export default defineComponent({
  name: 'DetailView',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    selectedIds: { type: Object as PropType<Set<string>>, required: true },
    onSelect: { type: Function as PropType<(id: string, multi: boolean) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true },
    sortField: { type: String as PropType<SortField>, required: true },
    sortOrder: { type: String as PropType<SortOrder>, required: true },
    onSort: { type: Function as PropType<(field: SortField) => void>, required: true }
  },
  setup(props) {
    const themeVars = useThemeVars()
    const hoveredHeader = ref<SortField | null>(null)

    const formatFileSize = (size?: number): string => {
      if (!size) return ''
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let num = size
      let i = 0
      while (num >= 1024 && i < units.length - 1) {
        num /= 1024
        i++
      }
      return `${num.toFixed(1)} ${units[i]}`
    }

    const formatDate = (date?: string | Date) => {
      if (!date) return ''
      const d = date instanceof Date ? date : new Date(date)
      return d.toLocaleString()
    }

    const getSortIcon = () => props.sortOrder === 'asc' ? ChevronUp : ChevronDown

    const SortHeader = (field: SortField, label: string) => {
      const SortIconComp = getSortIcon()
      const isActive = props.sortField === field
      const isHovered = hoveredHeader.value === field

      return (
        <th
          class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors select-none"
          style={{
            color: themeVars.value.textColor2,
            backgroundColor: themeVars.value.tableHeaderColor
          }}
          onMouseenter={() => hoveredHeader.value = field}
          onMouseleave={() => hoveredHeader.value = null}
          onClick={() => props.onSort(field)}
        >
          <div class="flex items-center gap-1">
            <span>{label}</span>
            {/* 始终占位，通过 opacity 控制显示 */}
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
        </th>
      )
    }

    return () => (
      <div 
        class="overflow-auto"
        style={{
          backgroundColor: themeVars.value.bodyColor
        }}
      >
        <table 
          class="min-w-full"
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0
          }}
        >
          <thead class="sticky top-0 z-10">
            <tr>
              {SortHeader('name', '名称')}
              {SortHeader('modifiedAt', '修改时间')}
              {SortHeader('type', '类型')}
              {SortHeader('size', '大小')}
            </tr>
          </thead>
          <tbody>
            {props.items.map(item => {
              const isSelected = props.selectedIds.has(item.id)
              return (
                <tr
                  key={item.id}
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
                    props.onSelect(item.id, e.ctrlKey || e.metaKey)
                  }
                  onDblclick={() => props.onOpen(item)}
                >
                  {/* 名称 */}
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <FileIcon item={item} size={24} showThumbnail={false} />
                      <span 
                        class="text-sm"
                        style={{
                          color: isSelected
                            ? themeVars.value.primaryColor
                            : themeVars.value.textColorBase
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                  </td>

                  {/* 修改时间 */}
                  <td 
                    class="px-4 py-3 text-sm"
                    style={{
                      color: isSelected
                        ? themeVars.value.primaryColor
                        : themeVars.value.textColor2
                    }}
                  >
                    {formatDate(item.modifiedAt)}
                  </td>

                  {/* 类型 */}
                  <td 
                    class="px-4 py-3 text-sm"
                    style={{
                      color: isSelected
                        ? themeVars.value.primaryColor
                        : themeVars.value.textColor2
                    }}
                  >
                    {item.type === 'folder'
                      ? '文件夹'
                      : item.extension?.toUpperCase() || '文件'}
                  </td>

                  {/* 大小 */}
                  <td 
                    class="px-4 py-3 text-sm"
                    style={{
                      color: isSelected
                        ? themeVars.value.primaryColor
                        : themeVars.value.textColor2
                    }}
                  >
                    {item.type === 'file' ? formatFileSize(item.size) : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }
})