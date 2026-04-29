import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { useThemeVars } from 'naive-ui';
import { MermaidRenderer } from '@/components/markdown/components/MermaidRenderer';
import type { FileItem } from '../../types/file-explorer';

/** Mermaid 预览器 — 复用项目已有的 MermaidRenderer 组件 */
export const MermaidPreviewer = defineComponent({
  name: 'MermaidPreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();

    return () => (
      <div class="h-full overflow-auto" style={{ backgroundColor: themeVars.value.bodyColor }}>
        {typeof props.content === 'string' ? (
          <MermaidRenderer code={props.content} showToolbar={true} bordered={false} />
        ) : (
          <div class="h-full flex items-center justify-center text-sm text-gray-500">
            无法预览此 Mermaid 文件
          </div>
        )}
      </div>
    );
  }
});
