/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:59:17
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 16:59:49
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\views\DetailView.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineComponent, PropType } from 'vue'
import { NDataTable, NIcon } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { formatDate, formatFileSize, getFileColor } from '../utils/fileHelpers'
import { FileItem } from '../types/file-explorer'

export default defineComponent({
  name: 'DetailView',
  props: {
    files: Array as PropType<FileItem[]>,
    selectedIds: Array as PropType<string[]>,
    onFileClick: Function,
    onFileDblClick: Function
  },

  setup(props) {
    const columns: DataTableColumns<FileItem> = [
      {
        title: '名称',
        key: 'name',
        render: (row) => (
          <div class="flex items-center gap-3">
            <NIcon size={24} color={getFileColor(row.type)} />
            <span>{row.name}</span>
          </div>
        )
      },
      {
        title: '修改日期',
        key: 'dateModified',
        render: (row) => formatDate(row.dateModified)
      },
      {
        title: '类型',
        key: 'type',
        render: (row) => row.type
      },
      {
        title: '大小',
        key: 'size',
        render: (row) => formatFileSize(row.size)
      }
    ]

    return () => (
      <div class="p-4">
        <NDataTable
          columns={columns}
          data={props.files || []}
          rowKey={(row) => row.id}
          checkedRowKeys={props.selectedIds}
          onUpdate:checkedRowKeys={(keys) => {
            // Handle selection
          }}
        />
      </div>
    )
  }
})