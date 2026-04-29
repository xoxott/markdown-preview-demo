import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { useThemeVars } from 'naive-ui';
import Markdown from '@/components/markdown';
import type { FileItem } from '../../types/file-explorer';

/** Markdown 预览器 — 复用项目已有的 Markdown 渲染组件 */
export const MarkdownPreviewer = defineComponent({
  name: 'MarkdownPreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();

    return () => (
      <div class="h-full overflow-auto" style={{ backgroundColor: themeVars.value.bodyColor }}>
        {typeof props.content === 'string' ? (
          <Markdown content={props.content} />
        ) : (
          <div class="h-full flex items-center justify-center text-sm text-gray-500">
            无法预览此 Markdown 文件
          </div>
        )}
      </div>
    );
  }
});
