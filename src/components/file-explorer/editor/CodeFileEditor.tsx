import type { PropType } from 'vue';
import { computed, defineComponent, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { NButton, NIcon, NTooltip } from 'naive-ui';
import { FileCode } from '@vicons/tabler';
import type * as monaco from 'monaco-editor-core';
import { MonacoEditor, resolveLanguage } from '@/components/monaco';
import type { IFileDataSource } from '../datasources/types';
import type { FileItem } from '../types/file-explorer';
import type { FileEditorSessionChangeHandler } from './fileEditorSession';
import FileEditorToolbar from './FileEditorToolbar';
import { useFileEditorCore } from './useFileEditorCore';

export default defineComponent({
  name: 'CodeFileEditor',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    dataSource: { type: Object as PropType<IFileDataSource>, required: true },
    content: { type: String, default: '' },
    onSave: {
      type: Function as PropType<(file: FileItem, content: string) => Promise<void>>,
      default: undefined
    },
    onSessionChange: {
      type: Function as PropType<FileEditorSessionChangeHandler>,
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
      onSave: props.onSave
    });

    const publishSession = () => {
      props.onSessionChange?.({
        isDirty: core.isDirty,
        saving: core.saving,
        save: core.handleSave
      });
    };

    onMounted(publishSession);
    onBeforeUnmount(() => props.onSessionChange?.(null));
    watch([core.isDirty, core.saving], publishSession);

    const handleFormat = () => {
      editorInstance.value?.getAction('editor.action.formatDocument')?.run();
    };

    return () => (
      <div ref={core.wrapperRef} class="h-full min-h-0 flex flex-col flex-1 overflow-hidden">
        <FileEditorToolbar
          isDirty={core.isDirty.value}
          saving={core.saving.value}
          onSave={core.handleSave}
          isFullscreen={core.isFullscreen.value}
          onCopy={() => core.copyContent(() => core.editorContent.value)}
          onToggleFullscreen={core.handleToggleFullscreen}
        >
          {{
            default: () => (
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
