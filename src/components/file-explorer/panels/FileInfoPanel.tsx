import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import {
  NButton,
  NIcon,
  NScrollbar,
  NTag,
  NText,
  useThemeVars
} from 'naive-ui';
import { CloseOutline, InformationCircleOutline } from '@vicons/ionicons5';
import type { FileItem } from '../types/file-explorer';

export default defineComponent({
  name: 'FileInfoPanel',
  props: {
    /** 选中的文件列表 */
    selectedFiles: {
      type: Array as PropType<FileItem[]>,
      required: true
    },
    /** 是否显示面板 */
    show: {
      type: Boolean,
      default: false
    },
    /** 关闭回调 */
    onClose: {
      type: Function as PropType<() => void>,
      required: true
    }
  },
  setup(props) {
    const themeVars = useThemeVars();

    // 当前选中的文件（单选时）
    const currentFile = computed(() => {
      return props.selectedFiles.length === 1 ? props.selectedFiles[0] : null;
    });

    // 格式化文件大小
    const formatSize = (bytes?: number): string => {
      if (!bytes || bytes === 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const k = 1024;
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / k ** i).toFixed(1)} ${units[i]}`;
    };

    // 格式化日期
    const formatDate = (date?: Date | string): string => {
      if (!date) return '-';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };


    // 多选时的统计信息
    const selectionStats = computed(() => {
      if (props.selectedFiles.length <= 1) return null;

      const totalSize = props.selectedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
      const fileCount = props.selectedFiles.filter(f => f.type === 'file').length;
      const folderCount = props.selectedFiles.filter(f => f.type === 'folder').length;

      // 文件类型统计
      const typeMap = new Map<string, number>();
      props.selectedFiles.forEach(f => {
        const ext = f.extension?.toLowerCase() || '无扩展名';
        typeMap.set(ext, (typeMap.get(ext) || 0) + 1);
      });

      return {
        total: props.selectedFiles.length,
        fileCount,
        folderCount,
        totalSize,
        typeMap: Array.from(typeMap.entries())
      };
    });


    return () => {
      if (!props.show) return null;

      return (
        <div class="h-full flex flex-col" style={{ backgroundColor: themeVars.value.bodyColor }}>
          {/* 标题栏 */}
          <div
            class="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: themeVars.value.dividerColor,
              backgroundColor: themeVars.value.cardColor
            }}
          >
            <div class="flex items-center gap-2">
              <NIcon size={18} style={{ color: themeVars.value.primaryColor }}>
                <InformationCircleOutline />
              </NIcon>
              <NText strong>文件信息</NText>
            </div>
            <NButton
              text
              size="small"
              onClick={props.onClose}
              style={{ color: themeVars.value.textColor2 }}
            >
              <NIcon size={16}>
                <CloseOutline />
              </NIcon>
            </NButton>
          </div>

          {/* 内容区域 */}
          <NScrollbar class="flex-1">
            <div class="p-4">
              {/* 多选时的统计信息 */}
              {selectionStats.value && (
                <div class="space-y-3">
                  <div
                    class="mb-3 text-sm font-medium"
                    style={{ color: themeVars.value.textColorBase }}
                  >
                    选中统计
                  </div>
                  <div class="space-y-2.5 text-sm">
                    <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                      <span style={{ color: themeVars.value.textColor3 }}>总数</span>
                      <span style={{ color: themeVars.value.textColorBase }}>
                        {selectionStats.value.total} 项
                      </span>
                    </div>
                    <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                      <span style={{ color: themeVars.value.textColor3 }}>文件</span>
                      <span style={{ color: themeVars.value.textColorBase }}>
                        {selectionStats.value.fileCount} 个
                      </span>
                    </div>
                    <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                      <span style={{ color: themeVars.value.textColor3 }}>文件夹</span>
                      <span style={{ color: themeVars.value.textColorBase }}>
                        {selectionStats.value.folderCount} 个
                      </span>
                    </div>
                    <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                      <span style={{ color: themeVars.value.textColor3 }}>总大小</span>
                      <span style={{ color: themeVars.value.textColorBase }}>
                        {formatSize(selectionStats.value.totalSize)}
                      </span>
                    </div>
                    {selectionStats.value.typeMap.length > 0 && (
                      <div class="mt-3 pt-2 border-t" style={{ borderColor: themeVars.value.dividerColor }}>
                        <div
                          class="mb-2 text-xs"
                          style={{ color: themeVars.value.textColor3 }}
                        >
                          文件类型
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                          {selectionStats.value.typeMap.map(([type, count]) => (
                            <NTag size="small" type="info">
                              {type} ({count})
                            </NTag>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 单选时的详细信息 */}
              {currentFile.value && (
                <div class="space-y-3">
                  <div
                    class="mb-3 text-sm font-medium"
                    style={{ color: themeVars.value.textColorBase }}
                  >
                    基本信息
                  </div>
                  <div class="space-y-2.5 text-sm">
                    <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                      <span style={{ color: themeVars.value.textColor3 }}>名称</span>
                      <span
                        class="truncate max-w-[60%] text-right"
                        style={{ color: themeVars.value.textColorBase }}
                        title={currentFile.value.name}
                      >
                        {currentFile.value.name}
                      </span>
                    </div>
                    <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                      <span style={{ color: themeVars.value.textColor3 }}>类型</span>
                      <span style={{ color: themeVars.value.textColorBase }}>
                        {currentFile.value.type === 'file' ? '文件' : '文件夹'}
                      </span>
                    </div>
                    {currentFile.value.size !== undefined && (
                      <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                        <span style={{ color: themeVars.value.textColor3 }}>大小</span>
                        <span style={{ color: themeVars.value.textColorBase }}>
                          {formatSize(currentFile.value.size)}
                        </span>
                      </div>
                    )}
                    {currentFile.value.extension && (
                      <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                        <span style={{ color: themeVars.value.textColor3 }}>扩展名</span>
                        <span style={{ color: themeVars.value.textColorBase }}>
                          {currentFile.value.extension}
                        </span>
                      </div>
                    )}
                    {currentFile.value.path && (
                      <div class="flex justify-between items-start py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                        <span class="flex-shrink-0" style={{ color: themeVars.value.textColor3 }}>路径</span>
                        <span
                          class="truncate max-w-[65%] text-right text-xs break-all"
                          style={{ color: themeVars.value.textColor2 }}
                          title={currentFile.value.path}
                        >
                          {currentFile.value.path}
                        </span>
                      </div>
                    )}
                    {currentFile.value.createdAt && (
                      <div class="flex justify-between items-center py-1.5 border-b border-dashed" style={{ borderColor: themeVars.value.dividerColor }}>
                        <span style={{ color: themeVars.value.textColor3 }}>创建时间</span>
                        <span
                          class="text-xs"
                          style={{ color: themeVars.value.textColorBase }}
                        >
                          {formatDate(currentFile.value.createdAt)}
                        </span>
                      </div>
                    )}
                    {currentFile.value.modifiedAt && (
                      <div class="flex justify-between items-center py-1.5" style={{ borderColor: themeVars.value.dividerColor }}>
                        <span style={{ color: themeVars.value.textColor3 }}>修改时间</span>
                        <span
                          class="text-xs"
                          style={{ color: themeVars.value.textColorBase }}
                        >
                          {formatDate(currentFile.value.modifiedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 未选中任何文件 */}
              {props.selectedFiles.length === 0 && (
                <div
                  class="flex flex-col items-center justify-center py-8 text-center"
                  style={{ color: themeVars.value.textColor3 }}
                >
                  <NIcon size={48} style={{ marginBottom: '12px', opacity: 0.5 }}>
                    <InformationCircleOutline />
                  </NIcon>
                  <NText depth={3}>请选择一个文件查看详细信息</NText>
                </div>
              )}
            </div>
          </NScrollbar>
        </div>
      );
    };
  }
});

