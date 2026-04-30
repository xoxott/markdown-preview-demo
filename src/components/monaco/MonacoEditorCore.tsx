/**
 * MonacoEditorCore — 纯编辑器组件（无 toolbar）
 *
 * 只负责创建和管理 Monaco editor 实例，不渲染任何工具栏。 通过 `ready` 事件暴露编辑器实例，供父组件调用编辑器操作。
 */
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import * as monaco from 'monaco-editor-core';
import { useMarkdownTheme } from '../markdown/hooks/useMarkdownTheme';
import { loadLanguage, registerHighlighter } from './highlight';
import { resolveLanguageFromFilename } from './languageMap';
import { getOrCreateModel } from './utils';
import './index.scss';

export interface MonacoEditorCoreProps {
  modelValue?: string;
  filename?: string;
  language?: string;
  readonly?: boolean;
  showLineNumbers?: boolean;
  folding?: boolean;
  minimap?: boolean;
  fontSize?: number;
  height?: string | number;
}

export interface MonacoEditorCoreEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'ready', editor: monaco.editor.IStandaloneCodeEditor): void;
}

export const MonacoEditorCore = defineComponent({
  name: 'MonacoEditorCore',
  props: {
    modelValue: { type: String, default: '' },
    filename: { type: String, default: 'untitled' },
    language: { type: String, default: '' },
    readonly: { type: Boolean, default: false },
    showLineNumbers: { type: Boolean, default: true },
    folding: { type: Boolean, default: true },
    minimap: { type: Boolean, default: false },
    fontSize: { type: Number, default: 14 },
    height: { type: [String, Number], default: '100%' }
  },
  emits: {
    'update:modelValue': (_value: string) => true,
    'change': (_value: string) => true,
    'ready': (_editor: monaco.editor.IStandaloneCodeEditor) => true
  },
  setup(props, { emit }) {
    const { darkMode } = useMarkdownTheme();
    const containerRef = ref<HTMLElement>();
    const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>();
    const model = shallowRef<monaco.editor.ITextModel>();

    // ==================== 计算属性 ====================

    /** 根据 language prop 或 filename 推断语言 */
    const lang = computed(() => {
      if (props.language) return props.language;
      return resolveLanguageFromFilename(props.filename);
    });

    /** 编辑器高度 */
    const editorHeight = computed(() => {
      if (typeof props.height === 'number') return `${props.height}px`;
      return props.height;
    });

    /** 主题名称 */
    const themeName = computed(() => {
      const themes = registerHighlighter();
      return darkMode.value ? themes.dark : themes.light;
    });

    // ==================== 编辑器操作 ====================

    /** 触发变更事件 */
    const emitChangeEvent = () => {
      if (editor.value) {
        const value = editor.value.getValue();
        emit('update:modelValue', value);
        emit('change', value);
      }
    };

    /** 初始化编辑器 */
    const initEditor = async () => {
      if (!containerRef.value) return;

      registerHighlighter();

      // 非核心语言 → 动态加载
      const currentLang = lang.value;
      if (currentLang && currentLang !== 'plaintext') {
        await loadLanguage(currentLang);
      }

      const uri = monaco.Uri.parse(`file:///${props.filename}`);
      model.value = getOrCreateModel(uri, currentLang, props.modelValue || '');

      editor.value = monaco.editor.create(containerRef.value, {
        model: model.value,
        language: currentLang,
        fontSize: props.fontSize,
        tabSize: 2,
        readOnly: props.readonly,
        theme: themeName.value,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        minimap: { enabled: props.minimap },
        lineNumbers: props.showLineNumbers ? 'on' : 'off',
        folding: props.folding,
        ...(props.readonly && {
          contextmenu: false,
          quickSuggestions: false,
          parameterHints: { enabled: false },
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnEnter: 'off',
          tabCompletion: 'off',
          wordBasedSuggestions: 'off'
        })
      });

      editor.value.onDidChangeModelContent(() => emitChangeEvent());
      emit('ready', editor.value);
    };

    // ==================== 监听器 ====================

    watch(
      () => props.modelValue,
      newVal => {
        if (editor.value && editor.value.getValue() !== newVal) {
          editor.value.setValue(newVal || '');
        }
      }
    );

    watch(themeName, theme => {
      monaco.editor.setTheme(theme);
    });

    watch(
      () => lang.value,
      async newLang => {
        if (!model.value || !newLang) return;
        await loadLanguage(newLang);
        monaco.editor.setModelLanguage(model.value, newLang);
      }
    );

    watch(
      () => props.readonly,
      readonly => {
        editor.value?.updateOptions({ readOnly: readonly });
      }
    );

    // ==================== 生命周期 ====================

    onMounted(() => initEditor());

    onBeforeUnmount(() => {
      editor.value?.dispose();
      model.value?.dispose();
    });

    // ==================== 渲染 ====================

    return () => (
      <div
        class="relative flex flex-col bg-white dark:bg-gray-900"
        style={{ height: editorHeight.value }}
      >
        <div ref={containerRef} class="w-full flex-1 overflow-hidden bg-white dark:bg-gray-900" />
      </div>
    );
  }
});
