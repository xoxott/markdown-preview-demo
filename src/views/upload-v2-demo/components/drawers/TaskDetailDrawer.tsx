import { defineComponent, type PropType } from 'vue';
import { NCard, NCode, NProgress, NScrollbar, NSpace, NTag } from 'naive-ui';
import type { FileTask } from '@/hooks/upload-v2';
import { ChunkStatus, UploadStatus } from '@/hooks/upload-v2';
import type { TaskDetailData } from '../../types';

export default defineComponent({
  name: 'TaskDetailDrawer',
  props: {
    task: {
      type: Object as PropType<FileTask>,
      required: true
    },
    formatFileSize: {
      type: Function as PropType<(bytes: number) => string>,
      required: true
    },
    formatSpeed: {
      type: Function as PropType<(bytesPerSecond: number) => string>,
      required: true
    },
    formatTime: {
      type: Function as PropType<(seconds: number) => string>,
      required: true
    },
    getStatusText: {
      type: Function as PropType<(status: UploadStatus) => string>,
      required: true
    }
  },
  setup(props) {
    const getStatusType = (status: UploadStatus): 'success' | 'error' | 'info' => {
      if (status === UploadStatus.SUCCESS) return 'success';
      if (status === UploadStatus.ERROR) return 'error';
      return 'info';
    };

    const getChunkStatusType = (status: ChunkStatus): 'success' | 'error' | 'info' | 'default' => {
      if (status === ChunkStatus.SUCCESS) return 'success';
      if (status === ChunkStatus.ERROR) return 'error';
      if (status === ChunkStatus.UPLOADING) return 'info';
      return 'default';
    };

    const getChunkStatusText = (status: ChunkStatus): string => {
      if (status === ChunkStatus.SUCCESS) return '成功';
      if (status === ChunkStatus.ERROR) return '失败';
      if (status === ChunkStatus.UPLOADING) return '上传中';
      return '等待中';
    };

    return () => (
      <div class="task-detail-container p-4 space-y-4">
        {/* 基本信息卡片 */}
        <NCard title="基本信息" class="mb-4">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">文件名：</span>
              <span class="font-semibold">{props.task.file.name}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">文件大小：</span>
              <span class="font-semibold">{props.formatFileSize(props.task.file.size)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">文件类型：</span>
              <span class="font-semibold">{props.task.file.type || '未知'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">任务ID：</span>
              <span class="font-mono text-xs">{props.task.id}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">状态：</span>
              <NTag type={getStatusType(props.task.status)} size="small">
                {props.getStatusText(props.task.status)}
              </NTag>
            </div>
          </div>
        </NCard>

        {/* 上传进度卡片 */}
        <NCard title="上传进度" class="mb-4">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">总进度：</span>
              <span class="font-semibold">{Math.round(props.task.progress)}%</span>
            </div>
            <NProgress
              type="line"
              percentage={props.task.progress}
              status={getStatusType(props.task.status)}
              height={12}
            />
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">分片进度：</span>
              <span class="font-semibold">
                {props.task.uploadedChunks} / {props.task.totalChunks}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">已上传大小：</span>
              <span class="font-semibold">{props.formatFileSize(props.task.uploadedSize || 0)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-400">上传速度：</span>
              <span class="font-semibold">{props.formatSpeed(props.task.speed)}</span>
            </div>
          </div>
        </NCard>

        {/* 时间信息卡片 */}
        <NCard title="时间信息" class="mb-4">
          <div class="space-y-3">
            {props.task.startTime && (
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">开始时间：</span>
                <span class="font-semibold text-sm">{new Date(props.task.startTime).toLocaleString()}</span>
              </div>
            )}
            {props.task.endTime && (
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">结束时间：</span>
                <span class="font-semibold text-sm">{new Date(props.task.endTime).toLocaleString()}</span>
              </div>
            )}
            {props.task.pausedTime > 0 && (
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">暂停时间：</span>
                <span class="font-semibold text-sm">{new Date(props.task.pausedTime).toLocaleString()}</span>
              </div>
            )}
            {props.task.resumeTime > 0 && (
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">恢复时间：</span>
                <span class="font-semibold text-sm">{new Date(props.task.resumeTime).toLocaleString()}</span>
              </div>
            )}
            {props.task.startTime && props.task.endTime && (
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">总耗时：</span>
                <span class="font-semibold">
                  {props.formatTime((props.task.endTime - props.task.startTime) / 1000)}
                </span>
              </div>
            )}
          </div>
        </NCard>

        {/* 分片详情卡片 */}
        {props.task.chunks && props.task.chunks.length > 0 && (
          <NCard title="分片详情" class="mb-4">
            <div class="space-y-2">
              <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                共 {props.task.totalChunks} 个分片
              </div>
              <NScrollbar style="max-height: 300px">
                <div class="space-y-1">
                  {props.task.chunks.slice(0, 50).map((chunk) => (
                    <div
                      key={chunk.index}
                      class="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <span class="text-sm">分片 {chunk.index + 1}</span>
                      <NSpace size="small">
                        <span class="text-xs text-gray-500">{props.formatFileSize(chunk.size)}</span>
                        <NTag type={getChunkStatusType(chunk.status)} size="small">
                          {getChunkStatusText(chunk.status)}
                        </NTag>
                      </NSpace>
                    </div>
                  ))}
                </div>
              </NScrollbar>
              {props.task.chunks.length > 50 && (
                <div class="text-xs text-gray-500 text-center mt-2">
                  仅显示前 50 个分片，共 {props.task.chunks.length} 个
                </div>
              )}
            </div>
          </NCard>
        )}

        {/* 错误信息卡片 */}
        {props.task.error && (
          <NCard title="错误信息" class="mb-4">
            <div class="space-y-2">
              <div class="text-sm text-red-600 dark:text-red-400">
                {props.task.error?.message || String(props.task.error || '未知错误')}
              </div>
              {props.task.chunkErrors && props.task.chunkErrors.length > 0 && (
                <div class="mt-2">
                  <div class="text-sm font-semibold mb-2">分片错误：</div>
                  <div class="space-y-1">
                    {props.task.chunkErrors.map((err, index) => (
                      <div key={index} class="text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        分片 {err.chunkIndex + 1}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </NCard>
        )}

        {/* 结果信息卡片 */}
        {props.task.result && (
          <NCard title="上传结果" class="mb-4">
            <div class="space-y-3">
              {props.task.result?.fileUrl && (
                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-400">文件URL：</span>
                  <a
                    href={props.task.result.fileUrl}
                    target="_blank"
                    class="text-primary hover:underline text-sm font-mono break-all max-w-md"
                    rel="noopener noreferrer"
                  >
                    {props.task.result.fileUrl}
                  </a>
                </div>
              )}
              {props.task.result?.fileId && (
                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-400">文件ID：</span>
                  <span class="font-mono text-sm">{props.task.result.fileId}</span>
                </div>
              )}
            </div>
          </NCard>
        )}

        {/* 原始数据 */}
        <NCard title="原始数据" class="mb-4">
          <NCode
            code={JSON.stringify(props.task, null, 2)}
            language="json"
            wordWrap={true}
            showLineNumbers={false}
          />
        </NCard>
      </div>
    );
  }
});
