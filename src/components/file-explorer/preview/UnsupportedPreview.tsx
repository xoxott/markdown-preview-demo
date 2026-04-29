import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { NIcon, NText, useThemeVars } from 'naive-ui';
import { DocumentTextOutline, DownloadOutline } from '@vicons/ionicons5';
import type { FileItem } from '../types/file-explorer';
import { formatFileSize } from '../utils/fileHelpers';

/** 不支持预览类型的提示组件 — 显示文件信息和下载建议 */
export const UnsupportedPreview = defineComponent({
  name: 'UnsupportedPreview',
  props: {
    file: {
      type: Object as PropType<FileItem>,
      required: true
    }
  },
  setup(props) {
    const themeVars = useThemeVars();

    return () => (
      <div
        class="h-full flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: themeVars.value.bodyColor }}
      >
        <NIcon size={56} style={{ color: themeVars.value.textColor3, opacity: 0.5 }}>
          <DocumentTextOutline />
        </NIcon>

        <div class="text-center space-y-2">
          <NText depth={2} class="text-base font-medium">
            不支持预览此文件类型
          </NText>
          <NText depth={3} class="text-sm">
            {props.file.name}（{props.file.extension || '未知格式'}）
          </NText>
          {props.file.size !== undefined && (
            <NText depth={3} class="text-xs">
              {formatFileSize(props.file.size)}
            </NText>
          )}
        </div>

        <div class="mt-2 flex items-center gap-2">
          <NIcon size={16} style={{ color: themeVars.value.textColor3 }}>
            <DownloadOutline />
          </NIcon>
          <NText depth={3} class="text-xs">
            请下载文件后使用本地程序打开
          </NText>
        </div>
      </div>
    );
  }
});
