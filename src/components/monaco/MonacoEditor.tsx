/** Monaco Editor 组件 支持编辑和只读模式，代码折叠，语法高亮等功能 */
import { type PropType, computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { NButton, NIcon, NSpace, NTooltip } from 'naive-ui';
import { ArrowsMaximize, ArrowsMinimize, ChevronDown, ChevronRight, Code, Copy, FileCode } from '@vicons/tabler';
import * as monaco from 'monaco-editor-core';
import { useMarkdownTheme } from '../markdown/hooks/useMarkdownTheme';
import { registerHighlighter } from './highlight';
import { getOrCreateModel } from './utils';
import './index.scss';

export type MonacoLanguage = 'javascript' | 'typescript' | 'vue' | 'jsx' | 'tsx' | 'css' | 'html' | 'json' | 'markdown';

export interface MonacoEditorProps {
  /** 编辑器内容 */
  modelValue?: string;
  /** 文件名（用于推断语言） */
  filename?: string;
  /** 是否只读 */
  readonly?: boolean;
  /** 语言模式 */
  language?: MonacoLanguage;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否显示行号 */
  showLineNumbers?: boolean;
  /** 是否启用代码折叠 */
  folding?: boolean;
  /** 是否显示 minimap */
  minimap?: boolean;
  /** 字体大小 */
  fontSize?: number;
  /** 高度 */
  height?: string | number;
}

export interface MonacoEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}

/** Monaco 编辑器组件 */
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
    readonly: {
      type: Boolean,
      default: false
    },
    language: {
      type: String as PropType<MonacoLanguage>,
      default: 'javascript'
    },
    showToolbar: {
      type: Boolean,
      default: true
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
      default: '300px'
    }
  },
  emits: {
    'update:modelValue': (_value: string) => true,
    change: (_value: string) => true
  },
  setup(props, { emit }) {
    // ==================== 状态管理 ====================
    const { darkMode } = useMarkdownTheme();
    const containerRef = ref<HTMLElement>();
    const wrapperRef = ref<HTMLElement>();
    const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>();
    const model = shallowRef<monaco.editor.ITextModel>();
    const isFullscreen = ref(false);
    const isFolded = ref(false);

    // ==================== 计算属性 ====================
    /** 根据文件名或 language 推断语言 */
    const lang = computed(() => {
      if (props.language) return props.language;
      if (props.filename.endsWith('.vue')) return 'vue';
      if (props.filename.endsWith('.ts')) return 'typescript';
      if (props.filename.endsWith('.tsx')) return 'tsx';
      if (props.filename.endsWith('.jsx')) return 'jsx';
      if (props.filename.endsWith('.css')) return 'css';
      if (props.filename.endsWith('.html')) return 'html';
      if (props.filename.endsWith('.json')) return 'json';
      if (props.filename.endsWith('.md')) return 'markdown';
      return 'javascript';
    });

    /** 编辑器高度 */
    const editorHeight = computed(() => {
      if (isFullscreen.value) return '100vh';
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
    const initEditor = () => {
      if (!containerRef.value) return;

      registerHighlighter();
      const uri = monaco.Uri.parse(`file:///${props.filename}`);
      model.value = getOrCreateModel(uri, lang.value, props.modelValue || '');

      editor.value = monaco.editor.create(containerRef.value, {
        model: model.value,
        language: lang.value,
        fontSize: props.fontSize,
        tabSize: 2,
        readOnly: props.readonly,
        theme: themeName.value,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        minimap: { enabled: props.minimap },
        lineNumbers: props.showLineNumbers ? 'on' : 'off',
        folding: props.folding,
        // 只读模式下的特殊配置
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
    };

    // ==================== 工具栏操作 ====================
    /** 复制代码 */
    const handleCopy = async () => {
      if (editor.value) {
        const value = editor.value.getValue();
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
      if (editor.value && !props.readonly) {
        editor.value.getAction('editor.action.formatDocument')?.run();
      }
    };

    /** 切换折叠/展开 */
    const handleToggleFold = () => {
      if (editor.value) {
        if (isFolded.value) {
          editor.value.getAction('editor.unfoldAll')?.run();
        } else {
          editor.value.getAction('editor.foldAll')?.run();
        }
        isFolded.value = !isFolded.value;
      }
    };

    /** 切换全屏 */
    const handleToggleFullscreen = () => {
      if (!wrapperRef.value) return;

      if (!isFullscreen.value) {
        // 进入全屏
        if (wrapperRef.value.requestFullscreen) {
          wrapperRef.value.requestFullscreen();
        } else if ((wrapperRef.value as any).webkitRequestFullscreen) {
          (wrapperRef.value as any).webkitRequestFullscreen();
        } else if ((wrapperRef.value as any).mozRequestFullScreen) {
          (wrapperRef.value as any).mozRequestFullScreen();
        } else if ((wrapperRef.value as any).msRequestFullscreen) {
          (wrapperRef.value as any).msRequestFullscreen();
        }
      } else {
        // 退出全屏
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    };

    /** 监听全屏状态变化 */
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      isFullscreen.value = isCurrentlyFullscreen;
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
      () => props.language,
      newLang => {
        if (model.value && newLang) {
          monaco.editor.setModelLanguage(model.value, newLang);
        }
      }
    );

    watch(
      () => props.readonly,
      readonly => {
        editor.value?.updateOptions({ readOnly: readonly });
      }
    );

    // ==================== 生命周期 ====================
    onMounted(() => {
      initEditor();
      // 监听全屏状态变化
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    });

    onBeforeUnmount(() => {
      editor.value?.dispose();
      model.value?.dispose();
      // 移除全屏监听
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
        {/* 工具栏 */}
        {props.showToolbar && (
          <div class="flex items-center justify-between border-b border-gray-200 from-gray-50 to-gray-100 bg-gradient-to-r px-3 py-2 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 border border-gray-200 rounded-md bg-white px-2.5 py-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <NIcon size={16} class="text-blue-500 dark:text-blue-400">
                  <Code />
                </NIcon>
                <span class="text-xs text-gray-700 font-medium tracking-wide uppercase dark:text-gray-300">
                  {lang.value}
                </span>
              </div>
              {props.readonly && (
                <div class="flex items-center gap-1 border border-blue-200 rounded-md bg-blue-50 px-2 py-1 dark:border-blue-800 dark:bg-blue-900/30">
                  <div class="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                  <span class="text-xs text-blue-600 font-medium dark:text-blue-400">只读</span>
                </div>
              )}
            </div>

            <NSpace size={4}>
              {/* 折叠控制（只读模式） */}
              {props.readonly && props.folding && (
                <NTooltip>
                  {{
                    trigger: () => (
                      <NButton quaternary size="small" onClick={handleToggleFold}>
                        <NIcon size={16}>{isFolded.value ? <ChevronRight /> : <ChevronDown />}</NIcon>
                      </NButton>
                    ),
                    default: () => (isFolded.value ? '展开所有' : '折叠所有')
                  }}
                </NTooltip>
              )}

              {/* 格式化（编辑模式） */}
              {!props.readonly && (
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
              )}

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
                      <NIcon size={16}>{isFullscreen.value ? <ArrowsMinimize /> : <ArrowsMaximize />}</NIcon>
                    </NButton>
                  ),
                  default: () => (isFullscreen.value ? '退出全屏' : '全屏')
                }}
              </NTooltip>
            </NSpace>
          </div>
        )}

        {/* 编辑器容器 */}
        <div ref={containerRef} class="w-full flex-1 overflow-hidden bg-white dark:bg-gray-900" />
      </div>
    );
  }
});

export default MonacoEditor;
