/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:56:55
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 16:57:08
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\views\GridView.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineComponent, computed, PropType } from 'vue'
import { NIcon, NText, NTag } from 'naive-ui'
import { formatFileSize } from '@/utils/fileHelpers'

export default defineComponent({
  name: 'GridView',
  props: {
    files: Array as PropType<FileItem[]>,
    viewConfig: Object as PropType<ViewConfig>,
    selectedIds: Array as PropType<string[]>,
    onFileClick: Function,
    onFileDblClick: Function
  },

  setup(props) {
    // 根据 iconSize 计算网格列数和图标尺寸
    const gridConfig = computed(() => {
      const sizeMap = {
        'extra-large': { cols: 3, iconSize: 80, gap: 24 },
        'large': { cols: 4, iconSize: 64, gap: 20 },
        'medium': { cols: 5, iconSize: 48, gap: 16 },
        'small': { cols: 6, iconSize: 32, gap: 12 }
      }
      return sizeMap[props.viewConfig?.iconSize || 'medium']
    })

    const gridStyle = computed(() => ({
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${180 / gridConfig.value.cols}px, 1fr))`,
      gap: `${gridConfig.value.gap}px`,
      padding: '20px'
    }))

    return () => (
      <div style={gridStyle.value}>
        {props.files?.map((file) => {
          const isSelected = props.selectedIds?.includes(file.id)
          
          return (
            <div
              key={file.id}
              data-selectable-id={file.id}
              class={[
                'file-grid-item',
                'rounded-lg cursor-pointer transition-all',
                'border-2 border-transparent',
                'hover:shadow-lg hover:scale-105',
                'p-4 flex flex-col items-center gap-3',
                isSelected && 'selected'
              ]}
              onClick={(e: MouseEvent) => props.onFileClick?.(file.id, e)}
              onDblclick={(e: MouseEvent) => props.onFileDblClick?.(file.id, e)}
            >
              <NIcon
                size={gridConfig.value.iconSize}
                color={getFileColor(file.type)}
              >
                {/* Icon Component */}
              </NIcon>
              
              <NText class="text-center truncate w-full text-sm">
                {file.name}
              </NText>
              
              {file.size && (
                <NTag size="small" type="info">
                  {formatFileSize(file.size)}
                </NTag>
              )}
            </div>
          )
        })}
      </div>
    )
  }
})