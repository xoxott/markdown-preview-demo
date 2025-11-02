/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:57:20
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 16:57:52
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\views\ListView.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineComponent, PropType } from 'vue'
import { NIcon, NText, NTag } from 'naive-ui'
import { FileItem, ViewConfig } from '../types/file-explorer'
import { formatFileSize, getFileColor } from '../utils/fileHelpers'

export default defineComponent({
  name: 'ListView',
  props: {
    files: Array as PropType<FileItem[]>,
    viewConfig: Object as PropType<ViewConfig>,
    selectedIds: Array as PropType<string[]>,
    onFileClick: Function,
    onFileDblClick: Function
  },

  setup(props) {
    return () => (
      <div class="space-y-1 p-4">
        {props.files?.map((file) => {
          const isSelected = props.selectedIds?.includes(file.id)
          
          return (
            <div
              key={file.id}
              data-selectable-id={file.id}
              class={[
                'file-list-item',
                'flex items-center gap-4 p-3 rounded-lg cursor-pointer',
                'border-2 border-transparent transition-all',
                'hover:shadow-md',
                isSelected && 'selected'
              ]}
              onClick={(e: MouseEvent) => props.onFileClick?.(file.id, e)}
              onDblclick={(e: MouseEvent) => props.onFileDblClick?.(file.id, e)}
            >
              <NIcon size={32} color={getFileColor(file.type)}>
                {/* Icon Component */}
              </NIcon>
              
              <NText class="flex-1">{file.name}</NText>
              
              {file.size && (
                <NTag type="info">{formatFileSize(file.size)}</NTag>
              )}
            </div>
          )
        })}
      </div>
    )
  }
})
