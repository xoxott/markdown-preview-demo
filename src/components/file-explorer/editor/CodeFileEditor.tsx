import type { PropType } from 'vue';
import { computed, defineComponent, shallowRef } from 'vue';
import { NButton, NIcon, NTooltip } from 'naive-ui';
import { FileCode } from '@vicons/tabler';
import type * as monaco from 'monaco-editor-core';
import { MonacoEditor, resolveLanguage } from '@/components/monaco';
import type { IFileDataSource } from '../datasources/types';
import type { FileItem } from '../types/file-explorer';
import FileEditorToolbar from './FileEditorToolbar';
import { useFileEditorCore } from './useFileEditorCore';

export default defineComponent({
  name: 'CodeFileEditor',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    dataSource: { type: Object as PropType<IFileDataSource>, required: true },
    content: { type: String, default: '' },
    onClose: { type: Function as PropType<() => void>, default: undefined },
    onSave: {
      type: Function as PropType<(file: FileItem, content: string) => Promise<void>>,
      default: undefined
    }
  },
  setup(props) {
    const editorInstance = shallowRef<monaco.editor.IStandaloneCodeEditor>();
    const language = computed(() => resolveLanguage(props.file.extension || ''));

    const core = useFileEditorCore({
      file: props.file,
      dataSource: props.dataSource,
      content: props.content,
      onSave: props.onSave,
      onClose: props.onClose
    });

    const handleFormat = () => {
      editorInstance.value?.getAction('editor.action.formatDocument')?.run();
    };

    return () => (
      <div ref={core.wrapperRef} class="h-full min-h-0 flex flex-col flex-1 overflow-hidden">
        <FileEditorToolbar
          file={props.file}
          isDirty={core.isDirty.value}
          saving={core.saving.value}
          isFullscreen={core.isFullscreen.value}
          onSave={core.handleSave}
          onClose={core.handleClose}
          onCopy={() => core.copyContent(() => core.editorContent.value)}
          onToggleFullscreen={core.handleToggleFullscreen}
        >
          {{
            center: () => (
              <NTooltip>
                {{
                  trigger: () => (
                    <NButton quaternary size="small" onClick={handleFormat}>
                      <NIcon size={16}>
                        <FileCode />
                      </NIcon>
                    </NButton>
                  ),
                  default: () => '格式化代码'
                }}
              </NTooltip>
            )
          }}
        </FileEditorToolbar>

        <MonacoEditor
          modelValue={core.editorContent.value}
          filename={props.file.name}
          language={language.value}
          readonly={false}
          height="100%"
          onUpdate:modelValue={core.handleContentChange}
          onReady={editor => {
            editorInstance.value = editor;
          }}
        />
      </div>
    );
  }
});
