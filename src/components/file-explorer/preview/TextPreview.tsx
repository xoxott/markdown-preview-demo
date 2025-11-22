import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { NScrollbar, useThemeVars } from 'naive-ui';
import type { FileItem } from '../types/file-explorer';
import { MonacoEditor, MonacoLanguage } from '@/components/monaco';

export default defineComponent({
  name: 'TextPreview',
  props: {
    file: {
      type: Object as PropType<FileItem>,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    maxLines: {
      type: Number,
      default: 1000
    }
  },
  setup(props) {
    const themeVars = useThemeVars();

    // 限制预览行数
    const previewContent = computed(() => {
      const lines = props.content.split('\n');
      if (lines.length > props.maxLines) {
        return lines.slice(0, props.maxLines).join('\n') + `\n\n... (已截断，共 ${lines.length} 行，仅显示前 ${props.maxLines} 行)`;
      }
      return props.content;
    });

    // 推断语言
    const language = computed(() => {
      const ext = props.file.extension?.toLowerCase() || '';
      const langMap: Record<string, MonacoLanguage> = {
        js: 'javascript',
        ts: 'typescript',
        vue: 'vue',
        jsx: 'jsx',
        tsx: 'tsx',
        css: 'css',
        html: 'html',
        json: 'json',
        md: 'markdown',
        // xml: 'xml',
        // yaml: 'yaml',
        // yml: 'yaml',
        // sh: 'shell',
        // py: 'python',
        // java: 'java',
        // cpp: 'cpp',
        // c: 'c',
        // h: 'c'
      };
      return langMap[ext] || 'plaintext';
    });

    return () => (
      <div class="h-full flex flex-col" style={{ backgroundColor: themeVars.value.bodyColor }}>
        <NScrollbar class="flex-1" contentClass='h-full'>
          <MonacoEditor
            modelValue={previewContent.value}
            filename={props.file.name}
            language={language.value}
            readonly={true}
            showToolbar={true}
            height={'90vh'}
          />
        </NScrollbar>
      </div>
    );
  }
});

