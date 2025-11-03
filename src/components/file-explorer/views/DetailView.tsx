import { defineComponent, PropType } from 'vue'
import { FileItem } from '../types/file-explorer'
import { ChevronDown, ChevronUp } from '@vicons/tabler' 
import FileIcon from '../items/FileIcon'
import { EllipsisVerticalOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'

type SortField = 'name' | 'modified' | 'type' | 'size'
type SortOrder = 'asc' | 'desc'

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
      return (
        <th
          class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => props.onSort(field)}
        >
          <div class="flex items-center gap-1">
            {label}
            {props.sortField === field ? <SortIconComp/> : null}
          </div>
        </th>
      )
    }

    return () => (
      <div class="overflow-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th class="px-4 py-3 w-8"></th>
              {SortHeader('name', '名称')}
              {SortHeader('modified', '修改时间')}
              {SortHeader('type', '类型')}
              {SortHeader('size', '大小')}
              <th class="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {props.items.map(item => {
              const isSelected = props.selectedIds.has(item.id)
              return (
                <tr
                  key={item.id}
                  class={[
                    'cursor-pointer transition-colors hover:bg-gray-50',
                    isSelected ? 'bg-blue-50' : ''
                  ]}
                  onClick={(e: MouseEvent) =>
                    props.onSelect(item.id, e.ctrlKey || e.metaKey)
                  }
                  onDblclick={() => props.onOpen(item)}
                >
                  {/* 选择框 */}
                  {/* <td class="px-4 py-3">
                    {isSelected ? (
                      <CheckSquare size={16} class="text-blue-600" />
                    ) : (
                      <Square size={16} class="text-gray-400" />
                    )}
                  </td> */}

                  {/* 名称 */}
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <FileIcon item={item} size={24} showThumbnail={false} />
                      <span class="text-sm text-gray-900">{item.name}</span>
                    </div>
                  </td>

                  {/* 修改时间 */}
                  <td class="px-4 py-3 text-sm text-gray-500">
                    {formatDate(item.modifiedAt)}
                  </td>

                  {/* 类型 */}
                  <td class="px-4 py-3 text-sm text-gray-500">
                    {item.type === 'folder'
                      ? '文件夹'
                      : item.extension?.toUpperCase() || '文件'}
                  </td>

                  {/* 大小 */}
                  <td class="px-4 py-3 text-sm text-gray-500">
                    {item.type === 'file' ? formatFileSize(item.size) : '-'}
                  </td>

                  {/* 操作 */}
                  <td class="px-4 py-3">
                    <button class="p-1 hover:bg-gray-200 rounded transition-colors">
                        <NIcon component={EllipsisVerticalOutline} size={16} class="text-gray-400" />
                    </button>
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
