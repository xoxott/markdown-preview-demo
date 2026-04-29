import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import { NIcon, NText, useThemeVars } from 'naive-ui';
import { DocumentTextOutline } from '@vicons/ionicons5';
import type { FileItem } from '../../types/file-explorer';
import { formatFileSize } from '../../utils/fileHelpers';

/** Office 文件类型映射 */
const officeTypeLabels: Record<string, string> = {
  doc: 'Word 文档',
  docx: 'Word 文档',
  xls: 'Excel 表格',
  xlsx: 'Excel 表格',
  ppt: 'PowerPoint 演示',
  pptx: 'PowerPoint 演示'
};

/** Office 预览器 — 本地文件显示提示信息，有公网 URL 时使用微软在线预览 */
export const OfficePreviewer = defineComponent({
  name: 'OfficePreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const iframeLoading = ref(true);
    const iframeError = ref(false);

    const officeLabel = computed(() => {
      const ext = props.file.extension?.toLowerCase() || '';
      return officeTypeLabels[ext] || 'Office 文档';
    });

    const canUseOnlinePreview = computed(() => {
      const path = props.file.path || '';
      return path.startsWith('http://') || path.startsWith('https://');
    });

    const onlinePreviewUrl = computed(() => {
      if (!canUseOnlinePreview.value) return '';
      return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(props.file.path)}`;
    });

    return () => {
      if (canUseOnlinePreview.value && onlinePreviewUrl.value) {
        return (
          <div class="h-full flex flex-col" style={{ backgroundColor: themeVars.value.bodyColor }}>
            {iframeLoading.value && (
              <div class="absolute inset-0 z-10 flex items-center justify-center">
                <NText depth={3} class="text-sm">
                  正在加载在线预览...
                </NText>
              </div>
            )}
            <iframe
              src={onlinePreviewUrl.value}
              class="w-full flex-1 border-none"
              onLoad={() => {
                iframeLoading.value = false;
              }}
              onError={() => {
                iframeError.value = true;
                iframeLoading.value = false;
              }}
            />
            {iframeError.value && (
              <div class="h-full flex flex-col items-center justify-center gap-4">
                <NIcon size={48} style={{ color: themeVars.value.textColor3 }}>
                  <DocumentTextOutline />
                </NIcon>
                <NText depth={3} class="text-sm">
                  在线预览加载失败
                </NText>
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          class="h-full flex flex-col items-center justify-center gap-4"
          style={{ backgroundColor: themeVars.value.bodyColor }}
        >
          <NIcon size={56} style={{ color: themeVars.value.primaryColor }}>
            <DocumentTextOutline />
          </NIcon>
          <div class="text-center space-y-1">
            <NText strong class="text-base">
              {officeLabel.value}
            </NText>
            <NText depth={3} class="text-sm">
              {props.file.name}
            </NText>
            {props.file.size !== undefined && (
              <NText depth={3} class="text-xs">
                {formatFileSize(props.file.size)}
              </NText>
            )}
          </div>
          <NText depth={3} class="mt-2 text-xs">
            Office 文档需要公网 URL 才能在线预览，本地文件请下载后打开
          </NText>
        </div>
      );
    };
  }
});
