import {
  type MaybeRefOrGetter,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toValue
} from 'vue';
import type * as monaco from 'monaco-editor-core';
import type { ToolbarAction } from '../components/EditorToolbar';

export interface UseMonacoEditorToolbarOptions {
  readonly?: MaybeRefOrGetter<boolean>;
  folding?: MaybeRefOrGetter<boolean>;
  actions?: MaybeRefOrGetter<ToolbarAction[] | undefined>;
  /** 全屏前容器高度，如 `350px`、`100%` */
  baseHeight?: MaybeRefOrGetter<string | number | undefined>;
}

function resolveShellHeight(
  fullscreen: boolean,
  base: string | number | undefined
): Record<string, string> | undefined {
  if (fullscreen) return { height: '100vh' };
  if (base === undefined) return undefined;
  if (typeof base === 'number') return { height: `${base}px` };
  return { height: base };
}

export function useMonacoEditorToolbar(options: UseMonacoEditorToolbarOptions = {}) {
  const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>();
  const wrapperRef = ref<HTMLElement>();
  const isFullscreen = ref(false);
  const isFolded = ref(false);

  const actions = computed<ToolbarAction[]>(() => {
    const custom = options.actions ? toValue(options.actions) : undefined;
    if (custom) return custom;
    return toValue(options.readonly)
      ? ['fold', 'copy', 'fullscreen']
      : ['format', 'copy', 'fullscreen'];
  });

  const shellStyle = computed(() =>
    resolveShellHeight(isFullscreen.value, toValue(options.baseHeight))
  );

  const bindEditor = (instance: monaco.editor.IStandaloneCodeEditor) => {
    editor.value = instance;
  };

  const handleCopy = async () => {
    if (!editor.value) return;
    try {
      await navigator.clipboard.writeText(editor.value.getValue());
      window.$message?.success('复制成功');
    } catch (err) {
      window.$message?.error('复制失败');
      console.error(err);
    }
  };

  const handleFormat = () => {
    if (editor.value && !toValue(options.readonly)) {
      editor.value.getAction('editor.action.formatDocument')?.run();
    }
  };

  const handleToggleFold = () => {
    if (!editor.value) return;
    if (isFolded.value) {
      editor.value.getAction('editor.unfoldAll')?.run();
    } else {
      editor.value.getAction('editor.foldAll')?.run();
    }
    isFolded.value = !isFolded.value;
  };

  const requestFullscreen = (el: HTMLElement): Promise<void> | undefined => {
    if (el.requestFullscreen) return el.requestFullscreen();
    const legacy = el as HTMLElement & {
      webkitRequestFullscreen?: () => void;
      mozRequestFullScreen?: () => void;
      msRequestFullscreen?: () => void;
    };
    legacy.webkitRequestFullscreen?.();
    legacy.mozRequestFullScreen?.();
    legacy.msRequestFullscreen?.();
    return undefined;
  };

  const exitFullscreen = (): Promise<void> => {
    if (document.exitFullscreen) return document.exitFullscreen();
    const doc = document as Document & {
      webkitExitFullscreen?: () => void;
      mozCancelFullScreen?: () => void;
      msExitFullscreen?: () => void;
    };
    doc.webkitExitFullscreen?.();
    doc.mozCancelFullScreen?.();
    doc.msExitFullscreen?.();
    return Promise.resolve();
  };

  const handleToggleFullscreen = () => {
    if (!wrapperRef.value) return;
    if (!isFullscreen.value) {
      const result = requestFullscreen(wrapperRef.value);
      result?.catch(() => {});
    } else {
      exitFullscreen().catch(() => {});
    }
  };

  const handleFullscreenChange = () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    isFullscreen.value = Boolean(
      document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
    );
  };

  onMounted(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  });

  onBeforeUnmount(() => {
    editor.value = undefined;
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  });

  return {
    editor,
    wrapperRef,
    isFullscreen,
    isFolded,
    actions,
    shellStyle,
    bindEditor,
    handleCopy,
    handleFormat,
    handleToggleFold,
    handleToggleFullscreen
  };
}
