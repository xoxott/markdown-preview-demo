import type { Ref } from 'vue';
import type { FileExplorerLogic } from '../composables/useFileExplorerLogic';
import type { UploadProgressInfo } from '../composables/useFileExplorerUpload';
import type { FileItem } from './file-explorer';

export type { FileExplorerLogic };

/** FileExplorer 壳组件 props — 由页面注入 logic 与交互回调 */
export interface FileExplorerShellProps {
  logic: FileExplorerLogic;
  containerRef: Ref<HTMLElement | null>;
  onOpen: (file: FileItem) => void | Promise<void>;
  onUpload: () => void;
  onFilesDrop: (files: File[]) => void | Promise<void>;
  uploadProgress: UploadProgressInfo | null;
}
