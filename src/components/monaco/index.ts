export { MonacoEditor as default, MonacoEditor } from './components/MonacoEditor';
export type { MonacoEditorProps, MonacoEditorEmits } from './components/MonacoEditor';
export { EditorToolbar } from './components/EditorToolbar';
export type { EditorToolbarProps, ToolbarAction } from './components/EditorToolbar';
export { useMonacoEditorToolbar } from './composables/useMonacoEditorToolbar';
export type { UseMonacoEditorToolbarOptions } from './composables/useMonacoEditorToolbar';
export { setupMonacoEnvironment } from './lib/setupMonacoEnvironment';
export { getOrCreateModel } from './lib/utils';
export {
  registerHighlighter,
  loadLanguage,
  preloadCommonLanguages,
  getHighlighter
} from './lib/highlight';
export {
  resolveLanguage,
  resolveLanguageFromFilename,
  EXTENSION_TO_LANGUAGE
} from './lib/languageMap';
