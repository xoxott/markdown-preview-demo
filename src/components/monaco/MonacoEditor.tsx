/**
 * MonacoEditor — 向后兼容的组合 wrapper
 *
 * 组合 MonacoEditorCore + EditorToolbar，保持原有 props 接口不变。 现有使用方无需修改代码即可获得动态语言加载能力。
 */
import {
  type PropType,
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef
} from 'vue';
import type * as monaco from 'monaco-editor-core';
import { useMarkdownTheme } from '../markdown/hooks/useMarkdownTheme';
import { MonacoEditorCore } from './MonacoEditorCore';
import { EditorToolbar } from './EditorToolbar';
import type { ToolbarAction } from './EditorToolbar';
import { resolveLanguageFromFilename } from './languageMap';

/** MonacoLanguage 类型 — 现接受任意 string，不再限制固定值 */
export type MonacoLanguage = string;

export interface MonacoEditorProps {
  modelValue?: string;
  filename?: string;
  readonly?: boolean;
  language?: string;
  showToolbar?: boolean;
  showLineNumbers?: boolean;
  folding?: boolean;
  minimap?: boolean;
  fontSize?: number;
  height?: string | number;
}

export interface MonacoEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}

export const MonacoEditor = defineComponent({
  name: 'MonacoEditor',
  props: {
    modelValue: { type: String, default: '' },
    filename: { type: String, default: 'untitled' },
    readonly: { type: Boolean, default: false },
    language: { type: String as PropType<MonacoLanguage>, default: '' },
    showToolbar: { type: Boolean, default: true },
    showLineNumbers: { type: Boolean, default: true },
    folding: { type: Boolean, default: true },
    minimap: { type: Boolean, default: false },
    fontSize: { type: Number, default: 14 },
    height: { type: [String, Number], default: '300px' }
  },
  emits: {
    'update:modelValue': (_value: string) => true,
    'change': (_value: string) => true
  },
  setup(props, { emit }) {
    const { darkMode: _darkMode } = useMarkdownTheme();
    const editorRef = shallowRef<monaco.editor.IStandaloneCodeEditor>();
    const wrapperRef = ref<HTMLElement>();
    const isFullscreen = ref(false);
    const isFolded = ref(false);

    // ==================== 计算属性 ====================

    const lang = computed(() => {
      if (props.language) return props.language;
      return resolveLanguageFromFilename(props.filename);
    });

    const editorHeight = computed(() => {
      if (isFullscreen.value) return '100vh';
      if (typeof props.height === 'number') return `${props.height}px`;
      return props.height;
    });

    /** toolbar actions 根据 readonly 自动选择 */
    const toolbarActions = computed<ToolbarAction[]>(() => {
      if (props.readonly) return ['fold', 'copy', 'fullscreen'];
      return ['format', 'copy', 'fullscreen'];
    });

    // ==================== 编辑器操作 ====================

    const handleCopy = async () => {
      if (editorRef.value) {
        const value = editorRef.value.getValue();
        try {
          await navigator.clipboard.writeText(value);
          window.$message?.success('复制成功');
        } catch (err) {
          window.$message?.error('复制失败');
          console.error(err);
        }
      }
    };

    const handleFormat = () => {
      if (editorRef.value && !props.readonly) {
        editorRef.value.getAction('editor.action.formatDocument')?.run();
      }
    };

    const handleToggleFold = () => {
      if (editorRef.value) {
        if (isFolded.value) {
          editorRef.value.getAction('editor.unfoldAll')?.run();
        } else {
          editorRef.value.getAction('editor.foldAll')?.run();
        }
        isFolded.value = !isFolded.value;
      }
    };

    const handleToggleFullscreen = () => {
      if (!wrapperRef.value) return;

      if (!isFullscreen.value) {
        if (wrapperRef.value.requestFullscreen) {
          wrapperRef.value.requestFullscreen();
        } else if ((wrapperRef.value as any).webkitRequestFullscreen) {
          (wrapperRef.value as any).webkitRequestFullscreen();
        } else if ((wrapperRef.value as any).mozRequestFullScreen) {
          (wrapperRef.value as any).mozRequestFullScreen();
        } else if ((wrapperRef.value as any).msRequestFullscreen) {
          (wrapperRef.value as any).msRequestFullscreen();
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      isFullscreen.value = isCurrentlyFullscreen;
    };

    const handleReady = (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.value = editor;
    };

    const handleModelValueChange = (value: string) => {
      emit('update:modelValue', value);
      emit('change', value);
    };

    // ==================== 生命周期 ====================

    onMounted(() => {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    });

    onBeforeUnmount(() => {
      editorRef.value = undefined;
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    });

    // ==================== 渲染 ====================

    return () => (
      <div
        ref={wrapperRef}
        class="relative flex flex-col bg-white dark:bg-gray-900"
        style={{ height: editorHeight.value }}
      >
        {props.showToolbar && (
          <EditorToolbar
            language={lang.value}
            readonly={props.readonly}
            folding={props.folding}
            actions={toolbarActions.value}
            isFolded={isFolded.value}
            isFullscreen={isFullscreen.value}
            onCopy={handleCopy}
            onFormat={handleFormat}
            onToggleFold={handleToggleFold}
            onToggleFullscreen={handleToggleFullscreen}
          />
        )}
        <MonacoEditorCore
          modelValue={props.modelValue}
          filename={props.filename}
          language={lang.value}
          readonly={props.readonly}
          showLineNumbers={props.showLineNumbers}
          folding={props.folding}
          minimap={props.minimap}
          fontSize={props.fontSize}
          height="100%"
          onUpdate:modelValue={handleModelValueChange}
          onReady={handleReady}
        />
      </div>
    );
  }
});

export default MonacoEditor;
