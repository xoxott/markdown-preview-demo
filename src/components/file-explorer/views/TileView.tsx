import { defineComponent, PropType } from 'vue'
import { NIcon, NText, NTag, NSpace } from 'naive-ui'
import { formatDate, formatFileSize, getFileColor } from '../utils/fileHelpers'
import { FileItem } from '../types/file-explorer'

export default defineComponent({
  name: 'TileView',
  props: {
    files: Array as PropType<FileItem[]>,
    selectedIds: Array as PropType<string[]>,
    onFileClick: Function,
    onFileDblClick: Function
  },

  setup(props) {
    return () => (
      <div class="grid grid-cols-2 gap-4 p-4">
        {props.files?.map((file) => {
          const isSelected = props.selectedIds?.includes(file.id)
          
          return (
            <div
              key={file.id}
              data-selectable-id={file.id}
              class={[
                'file-tile-item',
                'flex items-center gap-4 p-4 rounded-lg cursor-pointer',
                'border-2 border-transparent transition-all',
                'hover:shadow-md',
                isSelected && 'selected'
              ]}
              onClick={(e: MouseEvent) => props.onFileClick?.(file.id, e)}
              onDblclick={(e: MouseEvent) => props.onFileDblClick?.(file.id, e)}
            >
              <NIcon size={48} color={getFileColor(file.type)}>
                {/* Icon Component */}
              </NIcon>
              
              <div class="flex-1 min-w-0">
                <NText class="block truncate font-medium">{file.name}</NText>
                <NSpace size="small" class="mt-1">
                  {file.size && (
                    <NText depth={3} class="text-xs">
                      {formatFileSize(file.size)}
                    </NText>
                  )}
                  {file.dateModified && (
                    <NText depth={3} class="text-xs">
                      {formatDate(file.dateModified)}
                    </NText>
                  )}
                </NSpace>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
})