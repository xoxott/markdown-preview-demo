import { defineComponent, type PropType } from 'vue';
import { NCard, NDataTable, NSpace, NTag } from 'naive-ui';
import type { FileListRow } from '../types';
import { createFileListColumns, type FileListColumnHandlers, type FileListColumnUtils } from './FileListColumns';

interface Props {
  allFiles: FileListRow[];
  uploadQueueLength: number;
  activeUploadsSize: number;
  completedUploadsLength: number;
  handlers: FileListColumnHandlers;
  utils: FileListColumnUtils;
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
    }
  },
  setup(props) {
    const columns = createFileListColumns(props.handlers, props.utils);

    return () => (
      <NCard title="文件列表" class="flex-1">
        {{
          'header-extra': () => (
            <NSpace>
              <NTag type="info" size="small">
                队列: {props.uploadQueueLength}
              </NTag>
              <NTag type="primary" size="small">
                上传中: {props.activeUploadsSize}
              </NTag>
              <NTag type="success" size="small">
                已完成: {props.completedUploadsLength}
              </NTag>
            </NSpace>
          ),
          default: () => (
            <NDataTable
              columns={columns}
              data={props.allFiles}
              pagination={false}
              max-height={400}
              scroll-x={1200}
              virtual-scroll
            />
          )
        }}
      </NCard>
    );
  }
});

