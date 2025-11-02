import { defineComponent, PropType } from 'vue'
import { NCard, NIcon, NText, NSpace } from 'naive-ui'
import { FileItem } from '../types/file-explorer'
import { formatDate, formatFileSize, getFileColor } from '../utils/fileHelpers'

export default defineComponent({
  name: 'ContentView',
  props: {
    files: Array as PropType<FileItem[]>,
    selectedIds: Array as PropType<string[]>,
    onFileClick: Function,
    onFileDblClick: Function
  },

  setup(props) {
    return () => (
      <div class="space-y-4 p-4">
        {props.files?.map((file) => {
          const isSelected = props.selectedIds?.includes(file.id)

          return (
            <div
              class={'w-full h-full'}
              onClick={(e: MouseEvent) => props.onFileClick?.(file.id, e)}
              onDblclick={(e: MouseEvent) => props.onFileDblClick?.(file.id, e)}>
              <NCard
                key={file.id}
                data-selectable-id={file.id}
                hoverable
                class={['cursor-pointer transition-all', isSelected && 'selected-card']}
              >
                <NSpace vertical size="large">
                  <NSpace align="center">
                    <NIcon size={48} color={getFileColor(file.type)} />
                    <div>
                      <NText strong class="text-lg">{file.name}</NText>
                      <NSpace size="small" class="mt-1">
                        {file.size && <NText depth={3}>{formatFileSize(file.size)}</NText>}
                        {file.dateModified && <NText depth={3}>{formatDate(file.dateModified)}</NText>}
                      </NSpace>
                    </div>
                  </NSpace>

                  {file.content && (
                    <div class="p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
                      <NText depth={2} class="line-clamp-3">
                        {file.content}
                      </NText>
                    </div>
                  )}
                </NSpace>
              </NCard>
            </div>
          )
        })}
      </div>
    )
  }
})