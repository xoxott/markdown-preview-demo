import { type PropType, defineComponent } from 'vue';
import { NDataTable, NSpace, NTag } from 'naive-ui';
import type { FileListRow } from '../types';
import {
  type FileListColumnHandlers,
  type FileListColumnUtils,
  createFileListColumns
} from './FileListColumns';
import FileCard from './FileCard';

interface _Props {
  allFiles: FileListRow[];
  uploadQueueLength: number;
  activeUploadsSize: number;
  completedUploadsLength: number;
  handlers: FileListColumnHandlers;
  utils: FileListColumnUtils;
  isMobile: boolean;
  themeVars: {
    primaryColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
  };
}

export default defineComponent({
  name: 'FileList',
  props: {
    allFiles: {
      type: Array as PropType<FileListRow[]>,
      required: true
    },
    uploadQueueLength: {
      type: Number,
      required: true
    },
    activeUploadsSize: {
      type: Number,
      required: true
    },
    completedUploadsLength: {
      type: Number,
      required: true
    },
    handlers: {
      type: Object as PropType<FileListColumnHandlers>,
      required: true
    },
    utils: {
      type: Object as PropType<FileListColumnUtils>,
      required: true
    },
    isMobile: {
      type: Boolean,
      required: true
    },
    themeVars: {
      type: Object as PropType<_Props['themeVars']>,
      required: true
    }
  },
  setup(props) {
    const columns = createFileListColumns(props.handlers, props.utils);

    return () => (
      <div class="border border-gray-200 rounded-lg shadow-sm dark:border-gray-700">
        {/* 头部 */}
        <div class="flex items-center justify-between p-3 sm:p-4">
          <h3 class="text-sm text-gray-700 font-semibold dark:text-gray-300">文件列表</h3>
          <NSpace size="small">
            <NTag type="info" size="small" bordered={false}>
              队列: {props.uploadQueueLength}
            </NTag>
            <NTag size="small" bordered={false} style={{ color: props.themeVars.primaryColor }}>
              上传中: {props.activeUploadsSize}
            </NTag>
            <NTag type="success" size="small" bordered={false}>
              完成: {props.completedUploadsLength}
            </NTag>
          </NSpace>
        </div>

        {/* 文件内容 */}
        {props.isMobile ? (
          /* 移动端：卡片列表 */
          <div class="px-3 pb-3 space-y-2 sm:px-4 sm:pb-4">
            {props.allFiles.length === 0 && (
              <div class="py-8 text-center text-xs text-gray-400">暂无文件</div>
            )}
            {props.allFiles.map(row => (
              <FileCard
                key={row.id}
                row={row}
                handlers={props.handlers}
                utils={props.utils}
                themeVars={props.themeVars}
              />
            ))}
          </div>
        ) : (
          /* 桌面端：数据表格 */
          <div class="px-3 pb-3 sm:px-4 sm:pb-4">
            {props.allFiles.length === 0 && (
              <div class="py-8 text-center text-xs text-gray-400">暂无文件</div>
            )}
            <NDataTable
              columns={columns}
              data={props.allFiles}
              pagination={false}
              max-height={400}
              scroll-x={900}
              virtual-scroll
              size="small"
            />
          </div>
        )}
      </div>
    );
  }
});
