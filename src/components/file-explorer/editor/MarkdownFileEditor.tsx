import type { PropType } from 'vue';
import { defineComponent, ref } from 'vue';
import { NButton, NButtonGroup, NIcon, NScrollbar, useThemeVars } from 'naive-ui';
import { LayoutColumns, LayoutNavbar, Markdown } from '@vicons/tabler';
import MarkdownPreview from '@/components/markdown';
import { MonacoEditor } from '@/components/monaco';
import type { IFileDataSource } from '../datasources/types';
import type { FileItem } from '../types/file-explorer';
import FileEditorToolbar from './FileEditorToolbar';
import { useFileEditorCore } from './useFileEditorCore';

type MarkdownViewMode = 'edit' | 'split' | 'preview';

const PANE_SHELL_CLASS = 'flex min-h-0 flex-1 flex-col overflow-hidden';

export default defineComponent({
  name: 'MarkdownFileEditor',
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
    const themeVars = useThemeVars();
    const viewMode = ref<MarkdownViewMode>('split');

    const core = useFileEditorCore({
      file: props.file,
      dataSource: props.dataSource,
      content: props.content,
      onSave: props.onSave,
      onClose: props.onClose
    });

    const paneHeaderStyle = {
      borderColor: themeVars.value.dividerColor,
      color: themeVars.value.textColor3,
      backgroundColor: themeVars.value.tableHeaderColor
    };

    const renderViewToggle = () => (
      <NButtonGroup size="small">
        <NButton
          type={viewMode.value === 'edit' ? 'primary' : 'default'}
          onClick={() => {
            viewMode.value = 'edit';
          }}
        >
          <NIcon size={14} class="mr-1">
            <LayoutNavbar />
          </NIcon>
          编辑
        </NButton>
        <NButton
          type={viewMode.value === 'split' ? 'primary' : 'default'}
          onClick={() => {
            viewMode.value = 'split';
          }}
        >
          <NIcon size={14} class="mr-1">
            <LayoutColumns />
          </NIcon>
          分屏
        </NButton>
        <NButton
          type={viewMode.value === 'preview' ? 'primary' : 'default'}
          onClick={() => {
            viewMode.value = 'preview';
          }}
        >
          <NIcon size={14} class="mr-1">
            <Markdown />
          </NIcon>
          预览
        </NButton>
      </NButtonGroup>
    );

    const renderEditorPane = () => (
      <div class={PANE_SHELL_CLASS}>
        <div class="shrink-0 border-b px-3 py-1.5 text-xs" style={paneHeaderStyle}>
          Markdown 源码
        </div>
        <MonacoEditor
          modelValue={core.editorContent.value}
          filename={props.file.name}
          language="markdown"
          readonly={false}
          minimap={false}
          height="100%"
          onUpdate:modelValue={core.handleContentChange}
        />
      </div>
    );

    const renderPreviewPane = () => (
      <div class={PANE_SHELL_CLASS}>
        <div class="shrink-0 border-b px-3 py-1.5 text-xs" style={paneHeaderStyle}>
          实时预览
        </div>
        <NScrollbar class="min-h-0 flex-1">
          <div
            class="p-4"
            style={{
              backgroundColor: themeVars.value.cardColor,
              color: themeVars.value.textColorBase
            }}
          >
            <MarkdownPreview content={core.editorContent.value} />
          </div>
        </NScrollbar>
      </div>
    );

    return () => (
      <div
        ref={core.wrapperRef}
        class="h-full min-h-0 flex flex-col flex-1 overflow-hidden"
        style={{ backgroundColor: themeVars.value.bodyColor }}
      >
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
          {{ center: renderViewToggle }}
        </FileEditorToolbar>

        <div class="min-h-0 flex flex-col flex-1 overflow-hidden">
          {viewMode.value === 'edit' && renderEditorPane()}
          {viewMode.value === 'preview' && renderPreviewPane()}
          {viewMode.value === 'split' && (
            <div
              class="grid min-h-0 flex-1 gap-px"
              style={{
                gridTemplateColumns: '1fr 1fr',
                backgroundColor: themeVars.value.dividerColor
              }}
            >
              <div
                class="min-h-0 flex flex-col overflow-hidden"
                style={{ backgroundColor: themeVars.value.bodyColor }}
              >
                {renderEditorPane()}
              </div>
              <div
                class="min-h-0 flex flex-col overflow-hidden"
                style={{ backgroundColor: themeVars.value.bodyColor }}
              >
                {renderPreviewPane()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
});
