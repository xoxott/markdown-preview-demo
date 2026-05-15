import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { NTag, useThemeVars } from 'naive-ui';
import type { FileCategory } from '../preview/types';
import type { FileItem } from '../types/file-explorer';
import { formatFileSize } from '../utils/fileHelpers';

/** 分类显示名映射 */
const categoryLabels: Record<FileCategory, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  pdf: 'PDF',
  markdown: 'Markdown',
  code: '代码',
  office: 'Office',
  archive: '压缩包',
  svg: 'SVG',
  mermaid: 'Mermaid',
  echarts: 'ECharts',
  mindmap: '思维导图',
  font: '字体',
  unsupported: '未知'
};

/** 预览元信息条 — 类型、大小等（文件名由外层抽屉/页面标题展示） */
export const PreviewHeader = defineComponent({
  name: 'PreviewHeader',
  props: {
    file: {
      type: Object as PropType<FileItem>,
      required: true
    },
    category: {
      type: String as PropType<FileCategory>,
      default: 'unsupported'
    }
  },
  setup(props) {
    const themeVars = useThemeVars();

    return () => (
      <div
        class="flex items-center justify-between border-b px-4 py-2"
        style={{
          borderColor: themeVars.value.dividerColor,
          backgroundColor: themeVars.value.cardColor
        }}
      >
        <div class="flex items-center gap-2">
          <NTag size="small" type="info" bordered={false}>
            {categoryLabels[props.category]}
          </NTag>
          {props.file.extension && (
            <NTag size="small" bordered={false}>
              .{props.file.extension}
            </NTag>
          )}
        </div>

        <div class="flex items-center gap-3 text-xs" style={{ color: themeVars.value.textColor3 }}>
          {props.file.size !== undefined && <span>{formatFileSize(props.file.size)}</span>}
          {props.file.modifiedAt && (
            <span>
              {props.file.modifiedAt.toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>
    );
  }
});
