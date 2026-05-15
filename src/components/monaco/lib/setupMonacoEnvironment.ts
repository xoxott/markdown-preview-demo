import EditorWorker from 'monaco-editor-core/esm/vs/editor/editor.worker?worker';

let configured = false;

/** 配置 Monaco Web Worker（Vite 需通过 ?worker 导入，否则会回退到主线程） */
export function setupMonacoEnvironment(): void {
  if (configured) return;
  configured = true;

  globalThis.MonacoEnvironment = {
    getWorker() {
      return new EditorWorker();
    }
  };
}
