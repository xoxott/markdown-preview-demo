import type { InjectionKey, Ref } from 'vue';

/** 编辑器向抽屉头部暴露的状态（保存、脏标记） */
export interface FileEditorSession {
  isDirty: Ref<boolean>;
  saving: Ref<boolean>;
  save: () => void | Promise<void>;
}

export type FileEditorSessionChangeHandler = (session: FileEditorSession | null) => void;

export const FILE_EDITOR_SESSION_KEY: InjectionKey<FileEditorSession> = Symbol('fileEditorSession');
