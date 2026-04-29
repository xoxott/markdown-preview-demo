import type { PropType } from 'vue';
import { defineComponent, ref, watch } from 'vue';
import { NText, useThemeVars } from 'naive-ui';
import type { FileItem } from '../../types/file-explorer';

/** PDF 预览器 — 使用 iframe 渲染，兼容性最好 */
export const PDFPreviewer = defineComponent({
  name: 'PDFPreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const pdfUrl = ref<string>('');
    const error = ref(false);

    const createPdfUrl = () => {
      error.value = false;
      if (pdfUrl.value && pdfUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl.value);
      }
      if (props.content instanceof Blob) {
        pdfUrl.value = URL.createObjectURL(props.content);
      } else if (typeof props.content === 'string') {
        pdfUrl.value = props.content;
      } else {
        pdfUrl.value = '';
        error.value = true;
      }
    };

    watch(() => props.content, createPdfUrl, { immediate: true });

    return () => {
      if (error.value) {
        return (
          <div
            class="h-full flex items-center justify-center"
            style={{ backgroundColor: themeVars.value.bodyColor }}
          >
            <NText depth={3} class="text-sm">
              PDF 加载失败
            </NText>
          </div>
        );
      }

      if (pdfUrl.value) {
        return (
          <div
            class="h-full flex flex-col overflow-hidden"
            style={{ backgroundColor: themeVars.value.bodyColor }}
          >
            <iframe src={pdfUrl.value} class="w-full flex-1 border-none" title={props.file.name} />
          </div>
        );
      }

      return null;
    };
  }
});
