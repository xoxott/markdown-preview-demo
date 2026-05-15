/**
 * 单 DOM 挂载点。铺满父级（height 为 100%/auto）时依赖父级 flex 列 + `flex:1; min-height:0`； Drawer 等场景首帧高度可能为 0，用
 * ResizeObserver 在容器有尺寸后再 create（之后由 automaticLayout 接管）。
 */
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import * as monaco from 'monaco-editor-core';
import { useMarkdownTheme } from '../../markdown/hooks/useMarkdownTheme';
import { loadLanguage, registerHighlighter } from '../lib/highlight';
import { resolveLanguageFromFilename } from '../lib/languageMap';
import { getOrCreateModel } from '../lib/utils';
import '../styles/index.scss';

export interface MonacoEditorProps {
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

export interface MonacoEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'ready', editor: monaco.editor.IStandaloneCodeEditor): void;
}

/**
 * 判断是否是 flex 填充高度
 *
 * @param height 高度
 * @returns 是否是 flex 填充高度
 */
function isFlexFillHeight(height: string | number): boolean {
  if (typeof height === 'number') return false;
  return height === '100%' || height === 'auto';
}

export const MonacoEditor = defineComponent({
  name: 'MonacoEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    filename: {
      type: String,
      default: 'untitled'
    },
    language: {
      type: String,
      default: ''
    },
    readonly: {
      type: Boolean,
      default: false
    },
    showLineNumbers: {
      type: Boolean,
      default: true
    },
    folding: {
      type: Boolean,
      default: true
    },
    minimap: {
      type: Boolean,
      default: false
    },
    fontSize: {
      type: Number,
      default: 14
    },
    height: {
      type: [String, Number],
      default: '100%'
    }
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
    let resizeObserver: ResizeObserver | undefined;

    const flexFill = computed(() => isFlexFillHeight(props.height));

    // 计算容器样式
    const containerStyle = computed(() => {
      if (typeof props.height === 'number') {
        return { height: `${props.height}px`, flex: 'none' };
      }
      if (!flexFill.value) {
        return { height: props.height as string, flex: 'none' };
      }
      return { flex: '1 1 0%', minHeight: 0 };
    });

    const lang = computed(() => {
      if (props.language) return props.language;
      return resolveLanguageFromFilename(props.filename);
    });

    const themeName = computed(() => {
      const themes = registerHighlighter();
      return darkMode.value ? themes.dark : themes.light;
    });

    const emitChangeEvent = () => {
      if (editor.value) {
        const value = editor.value.getValue();
        emit('update:modelValue', value);
        emit('change', value);
      }
    };

    const initEditor = async () => {
      if (!containerRef.value || editor.value) return;

      registerHighlighter();

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
      resizeObserver?.disconnect();
      resizeObserver = undefined;
    };

    const tryInitWhenSized = () => {
      if (!containerRef.value || editor.value) return;
      const { width, height } = containerRef.value.getBoundingClientRect();
      if (width > 0 && height > 0) {
        initEditor().catch(() => {});
      }
    };

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

    onMounted(() => {
      const el = containerRef.value;
      if (!el) return;

      resizeObserver = new ResizeObserver(tryInitWhenSized);
      resizeObserver.observe(el);
      tryInitWhenSized();
    });

    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      editor.value?.dispose();
      editor.value = undefined;
      model.value?.dispose();
      model.value = undefined;
    });

    return () => (
      <div
        ref={containerRef}
        class="monaco-editor-core min-h-0 w-full overflow-hidden bg-white dark:bg-gray-900"
        style={containerStyle.value}
      />
    );
  }
});
