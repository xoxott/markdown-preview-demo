import type { PropType } from 'vue';
import { defineComponent, ref, watch } from 'vue';
import { useThemeVars } from 'naive-ui';
import { SvgRenderer } from '@/components/markdown/components/SvgRenderer';
import type { FileItem } from '../../types/file-explorer';

/** SVG 预览器 — 复用项目已有的 SvgRenderer 组件 */
export const SvgPreviewer = defineComponent({
  name: 'SvgPreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const svgText = ref<string>('');
    const error = ref(false);

    const loadSvg = async () => {
      error.value = false;
      if (typeof props.content === 'string') {
        svgText.value = props.content;
      } else if (props.content instanceof Blob) {
        try {
          svgText.value = await props.content.text();
        } catch {
          error.value = true;
        }
      } else {
        svgText.value = '';
        error.value = true;
      }
    };

    watch(() => props.content, loadSvg, { immediate: true });

    return () => (
      <div class="h-full overflow-auto" style={{ backgroundColor: themeVars.value.bodyColor }}>
        {svgText.value && !error.value ? (
          <SvgRenderer content={svgText.value} showToolbar={true} bordered={false} />
        ) : (
          <div class="h-full flex items-center justify-center text-sm text-gray-500">
            无法预览此 SVG 文件
          </div>
        )}
      </div>
    );
  }
});
