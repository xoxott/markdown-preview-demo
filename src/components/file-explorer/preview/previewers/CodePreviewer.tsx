import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { useThemeVars } from 'naive-ui';
import { MonacoEditor } from '@/components/monaco';
import { resolveLanguage } from '@/components/monaco/languageMap';
import type { FileItem } from '../../types/file-explorer';

/** 代码/文本预览器 — 复用 MonacoEditor 只读模式，集中语言映射 */
export const CodePreviewer = defineComponent({
  name: 'CodePreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();

    const language = computed(() => resolveLanguage(props.file.extension || ''));

    const maxLines = 2000;
    const previewContent = computed(() => {
      if (typeof props.content !== 'string') return '';
      const lines = props.content.split('\n');
      if (lines.length > maxLines) {
        return `${lines.slice(0, maxLines).join('\n')}\n\n... (已截断，共 ${lines.length} 行，仅显示前 ${maxLines} 行)`;
      }
      return props.content;
    });

    return () => (
      <div class="h-full flex flex-col" style={{ backgroundColor: themeVars.value.bodyColor }}>
        {typeof props.content === 'string' ? (
          <MonacoEditor
            modelValue={previewContent.value}
            filename={props.file.name}
            language={language.value}
            readonly={true}
            showToolbar={true}
            height="100%"
          />
        ) : (
          <div class="h-full flex items-center justify-center text-sm text-gray-500">
            无法预览此文件
          </div>
        )}
      </div>
    );
  }
});
