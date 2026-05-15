import type { PropType } from 'vue';
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NButton, NButtonGroup, NIcon, NScrollbar, NSplit, useThemeVars } from 'naive-ui';
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
    onSave: {
      type: Function as PropType<(file: FileItem, content: string) => Promise<void>>,
      default: undefined
    },
    onSessionChange: {
      type: Function as PropType<
        (session: import('./fileEditorSession').FileEditorSession | null) => void
      >,
      default: undefined
    }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const viewMode = ref<MarkdownViewMode>('preview');

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

    const paneHeaderStyle = {
      borderColor: themeVars.value.dividerColor,
      color: themeVars.value.textColor3,
      backgroundColor: themeVars.value.tableHeaderColor
    };

    const paneBackgroundStyle = {
      backgroundColor: themeVars.value.bodyColor
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
          isDirty={core.isDirty.value}
          saving={core.saving.value}
          onSave={core.handleSave}
          isFullscreen={core.isFullscreen.value}
          onCopy={() => core.copyContent(() => core.editorContent.value)}
          onToggleFullscreen={core.handleToggleFullscreen}
        >
          {{ default: renderViewToggle }}
        </FileEditorToolbar>

        <div class="min-h-0 flex flex-col flex-1 overflow-hidden">
          {viewMode.value === 'edit' && renderEditorPane()}
          {viewMode.value === 'preview' && renderPreviewPane()}
          {viewMode.value === 'split' && (
            <NSplit
              direction="horizontal"
              class="min-h-0 flex-1"
              style={{ height: '100%' }}
              defaultSize={0.5}
              min={0.25}
              max={0.75}
              pane1Class="min-h-0 flex flex-col overflow-hidden"
              pane2Class="min-h-0 flex flex-col overflow-hidden"
              pane1Style={paneBackgroundStyle}
              pane2Style={paneBackgroundStyle}
            >
              {{
                1: () => renderEditorPane(),
                2: () => renderPreviewPane()
              }}
            </NSplit>
          )}
        </div>
      </div>
    );
  }
});
