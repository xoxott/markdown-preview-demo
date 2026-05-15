import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { IFileDataSource } from '../datasources/types';
import type { FileItem } from '../types/file-explorer';
import CodeFileEditor from './CodeFileEditor';
import MarkdownFileEditor from './MarkdownFileEditor';
import { resolveEditorKind } from './resolveEditorKind';

/** 按文件类型分发到代码编辑器或 Markdown 编辑器 */
export default defineComponent({
  name: 'FileEditor',
  props: {
    file: { 
      type: Object as PropType<FileItem>, 
      required: true 
    },
    dataSource: { 
      type: Object as PropType<IFileDataSource>, 
      required: true 
    },
    content: { 
      type: String, 
      default: '' 
    },
    onSave: {
      type: Function as PropType<(file: FileItem, content: string) => Promise<void>>,
      default: undefined
    },
    onSessionChange: {
      type: Function as PropType<(session: import('./fileEditorSession').FileEditorSession | null) => void>,
      default: undefined
    }
  },
  setup(props) {
    const editorKind = computed(() => resolveEditorKind(props.file.extension));

    return () => {
      const shared = {
        file: props.file,
        dataSource: props.dataSource,
        content: props.content,
        onSave: props.onSave,
        onSessionChange: props.onSessionChange
      };

      return editorKind.value === 'markdown' ? (
        <MarkdownFileEditor {...shared} />
      ) : (
        <CodeFileEditor {...shared} />
      );
    };
  }
});
