import { h } from 'vue';
import { NButton, NProgress, NSpace, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import type { FileTask } from '@/hooks/upload-v2';
import { UploadStatus } from '@/hooks/upload-v2';
import type { FileListRow } from '../types';

export interface FileListColumnHandlers {
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRetrySingle: (taskId: string) => void;
  onViewTask: (task: FileTask) => void;
  onRemove: (taskId: string) => void;
}

export interface FileListColumnUtils {
  formatFileSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
  getStatusText: (status: UploadStatus) => string;
}

/**
 * 创建文件列表表格列定义
 */
export function createFileListColumns(
  handlers: FileListColumnHandlers,
  utils: FileListColumnUtils
): DataTableColumns<FileListRow> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (row: FileListRow) => row.index + 1
    },
    {
      title: '文件名',
      key: 'name',
      ellipsis: { tooltip: true },
      render: (row: FileListRow) => row.file.name
    },
    {
      title: '大小',
      key: 'size',
      width: 100,
      render: (row: FileListRow) => utils.formatFileSize(row.file.size)
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (row: FileListRow) => {
        const statusText = utils.getStatusText(row.status);
        const statusType =
          row.status === UploadStatus.SUCCESS
            ? 'success'
            : row.status === UploadStatus.ERROR
              ? 'error'
              : 'info';
        return h(NTag, { type: statusType, size: 'small' }, { default: () => statusText });
      }
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (row: FileListRow) => {
        return h(NProgress, {
          type: 'line',
          percentage: row.progress,
          status:
            row.status === UploadStatus.ERROR
              ? 'error'
              : row.status === UploadStatus.SUCCESS
                ? 'success'
                : 'default',
          height: 8,
          showIndicator: false
        });
      }
    },
    {
      title: '速度',
      key: 'speed',
      width: 100,
      render: (row: FileListRow) => utils.formatSpeed(row.speed)
    },
    {
      title: '分片',
      key: 'chunks',
      width: 100,
      render: (row: FileListRow) => `${row.uploadedChunks}/${row.totalChunks}`
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right' as const,
      render: (row: FileListRow) => {
        return h(NSpace, { size: 'small' }, {
          default: () => [
            row.status === UploadStatus.PENDING &&
              h(
                NTag,
                {
                  type: 'info',
                  size: 'small',
                  bordered: false
                },
                { default: () => '等待中' }
              ),
            row.status === UploadStatus.UPLOADING &&
              h(
                NButton,
                {
                  size: 'tiny',
                  onClick: () => handlers.onPause(row.id)
                },
                { default: () => '暂停' }
              ),
            row.status === UploadStatus.PAUSED &&
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'primary',
                  onClick: () => handlers.onResume(row.id)
                },
                { default: () => '恢复' }
              ),
            (row.status === UploadStatus.UPLOADING ||
              row.status === UploadStatus.PAUSED ||
              row.status === UploadStatus.PENDING) &&
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'error',
                  onClick: () => handlers.onCancel(row.id)
                },
                { default: () => '取消' }
              ),
            row.status === UploadStatus.ERROR &&
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'warning',
                  onClick: () => handlers.onRetrySingle(row.id)
                },
                { default: () => '重试' }
              ),
            h(
              NButton,
              {
                size: 'tiny',
                quaternary: true,
                onClick: () => handlers.onViewTask(row)
              },
              { default: () => '详情' }
            ),
            h(
              NButton,
              {
                size: 'tiny',
                quaternary: true,
                type: 'error',
                onClick: () => handlers.onRemove(row.id)
              },
              { default: () => '移除' }
            )
          ]
        });
      }
    }
  ];
}

