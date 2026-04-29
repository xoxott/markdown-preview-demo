import type { PropType } from 'vue';
import { computed, defineComponent, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { NButton, NIcon, NTooltip, useMessage, useThemeVars } from 'naive-ui';
import { ArrowsMaximize, ArrowsMinimize, Copy, FileCode } from '@vicons/tabler';
import { Close, Save } from '@vicons/ionicons5';
import type * as monaco from 'monaco-editor-core';
import { MonacoEditorCore } from '@/components/monaco';
import { resolveLanguage } from '@/components/monaco/languageMap';
import type { IFileDataSource } from '../datasources/types';
import type { FileItem } from '../types/file-explorer';

/** 扩展 HTMLElement 以包含非标准 webkit 全屏方法 */
interface ElementWithWebkitFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

/** 扩展 Document 以包含非标准 webkit 全屏属性和方法 */
interface DocumentWithWebkitFullscreen extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
}

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
    onClose: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onSave: {
      type: Function as PropType<(file: FileItem, content: string) => Promise<void>>,
      default: undefined
    }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const message = useMessage();
    const editorContent = ref(props.content);
    const isDirty = ref(false);
    const saving = ref(false);
    const editorInstance = shallowRef<monaco.editor.IStandaloneCodeEditor>();
    const wrapperRef = ref<HTMLElement>();
    const isFullscreen = ref(false);

    // 推断语言 — 使用集中映射
    const language = computed(() => resolveLanguage(props.file.extension || ''));

    // 监听内容变化
    watch(
      () => props.content,
      newContent => {
        if (editorContent.value !== newContent) {
          editorContent.value = newContent;
          isDirty.value = false;
        }
      }
    );

    // 处理内容变更
    const handleContentChange = (value: string) => {
      editorContent.value = value;
      isDirty.value = value !== props.content;
    };

    // 编辑器 ready 回调
    const handleReady = (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorInstance.value = editor;
    };

    // ==================== 工具栏操作 ====================

    /** 复制代码 */
    const handleCopy = async () => {
      if (editorInstance.value) {
        const value = editorInstance.value.getValue();
        try {
          await navigator.clipboard.writeText(value);
          window.$message?.success('复制成功');
        } catch (err) {
          window.$message?.error('复制失败');
          console.error(err);
        }
      }
    };

    /** 格式化代码 */
    const handleFormat = () => {
      if (editorInstance.value) {
        editorInstance.value.getAction('editor.action.formatDocument')?.run();
      }
    };

    /** 切换全屏 */
    const handleToggleFullscreen = () => {
      if (!wrapperRef.value) return;
      if (!isFullscreen.value) {
        if (wrapperRef.value.requestFullscreen) {
          wrapperRef.value.requestFullscreen();
        } else if ((wrapperRef.value as ElementWithWebkitFullscreen).webkitRequestFullscreen) {
          (wrapperRef.value as ElementWithWebkitFullscreen).webkitRequestFullscreen!();
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as DocumentWithWebkitFullscreen).webkitExitFullscreen) {
        (document as DocumentWithWebkitFullscreen).webkitExitFullscreen!();
      }
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as DocumentWithWebkitFullscreen).webkitFullscreenElement
      );
      isFullscreen.value = isCurrentlyFullscreen;
    };

    // 保存文件
    const handleSave = async () => {
      if (!isDirty.value) {
        message.info('文件未修改');
        return;
      }

      try {
        saving.value = true;

        if (props.onSave) {
          await props.onSave(props.file, editorContent.value);
        } else {
          await props.dataSource.writeFile(props.file.path, editorContent.value);
        }

        isDirty.value = false;
        message.success('保存成功');
      } catch (error: unknown) {
        message.error(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
        console.error('保存文件失败:', error);
      } finally {
        saving.value = false;
      }
    };

    // 处理关闭
    const handleClose = () => {
      if (isDirty.value) {
        message.warning('文件已修改，请先保存');
        return;
      }
      props.onClose?.();
    };

    // ==================== 生命周期 ====================

    onBeforeUnmount(() => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    });

    // 挂载全屏监听
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => (
      <div
        ref={wrapperRef}
        class="h-full flex flex-col"
        style={{ backgroundColor: themeVars.value.bodyColor, ...(isFullscreen.value ? {} : {}) }}
      >
        {/* 自定义工具栏 */}
        <div
          class="flex items-center justify-between border-b px-4 py-2"
          style={{
            borderColor: themeVars.value.dividerColor,
            backgroundColor: themeVars.value.cardColor
          }}
        >
          <div class="flex items-center gap-2">
            <span class="font-medium" style={{ color: themeVars.value.textColorBase }}>
              {props.file.name}
            </span>
            {isDirty.value && (
              <span class="text-xs" style={{ color: themeVars.value.warningColor }}>
                (已修改)
              </span>
            )}
          </div>
          <div class="flex items-center gap-1">
            {/* 格式化 */}
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

            {/* 复制 */}
            <NTooltip>
              {{
                trigger: () => (
                  <NButton quaternary size="small" onClick={handleCopy}>
                    <NIcon size={16}>
                      <Copy />
                    </NIcon>
                  </NButton>
                ),
                default: () => '复制代码'
              }}
            </NTooltip>

            {/* 全屏 */}
            <NTooltip>
              {{
                trigger: () => (
                  <NButton quaternary size="small" onClick={handleToggleFullscreen}>
                    <NIcon size={16}>
                      {isFullscreen.value ? <ArrowsMinimize /> : <ArrowsMaximize />}
                    </NIcon>
                  </NButton>
                ),
                default: () => (isFullscreen.value ? '退出全屏' : '全屏')
              }}
            </NTooltip>

            <NButton
              type="primary"
              size="small"
              loading={saving.value}
              disabled={!isDirty.value}
              onClick={handleSave}
            >
              <NIcon size={16}>
                <Save />
              </NIcon>
              <span class="ml-1">保存</span>
            </NButton>
            {props.onClose && (
              <NButton size="small" onClick={handleClose}>
                <NIcon size={16}>
                  <Close />
                </NIcon>
              </NButton>
            )}
          </div>
        </div>

        {/* 编辑器核心 — 无内置 toolbar */}
        <div class="flex-1 overflow-hidden">
          <MonacoEditorCore
            modelValue={editorContent.value}
            filename={props.file.name}
            language={language.value}
            readonly={false}
            height="100%"
            onUpdate:modelValue={handleContentChange}
            onReady={handleReady}
          />
        </div>
      </div>
    );
  }
});
