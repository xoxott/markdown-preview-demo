import { markRaw } from 'vue';
import {
  CloudUploadOutline,
  CopyOutline,
  CreateOutline,
  CutOutline,
  DownloadOutline,
  FolderOpenOutline,
  FunnelOutline,
  InformationCircleOutline,
  OpenOutline,
  ShareSocialOutline,
  StarOutline,
  TrashOutline
} from '@vicons/ionicons5';

/** 右键菜单图标（markRaw 避免被 ref 深度响应式包装） */
export const contextMenuIcons = {
  open: markRaw(OpenOutline),
  cut: markRaw(CutOutline),
  copy: markRaw(CopyOutline),
  create: markRaw(CreateOutline),
  trash: markRaw(TrashOutline),
  download: markRaw(DownloadOutline),
  share: markRaw(ShareSocialOutline),
  star: markRaw(StarOutline),
  info: markRaw(InformationCircleOutline),
  upload: markRaw(CloudUploadOutline),
  folder: markRaw(FolderOpenOutline),
  funnel: markRaw(FunnelOutline)
} as const;
