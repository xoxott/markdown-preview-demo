export { MonacoEditor as default, MonacoEditor } from './MonacoEditor';
export type { MonacoEditorProps, MonacoEditorEmits, MonacoLanguage } from './MonacoEditor';
export { MonacoEditorCore } from './MonacoEditorCore';
export type { MonacoEditorCoreProps, MonacoEditorCoreEmits } from './MonacoEditorCore';
export { EditorToolbar } from './EditorToolbar';
export type { EditorToolbarProps, ToolbarAction } from './EditorToolbar';
export { getOrCreateModel } from './utils';
export {
  registerHighlighter,
  loadLanguage,
  preloadCommonLanguages,
  getHighlighter
} from './highlight';
export { resolveLanguage, resolveLanguageFromFilename, EXTENSION_TO_LANGUAGE } from './languageMap';
