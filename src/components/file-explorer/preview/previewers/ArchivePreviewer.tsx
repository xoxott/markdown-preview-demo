import type { PropType } from 'vue';
import { defineComponent, ref, watch } from 'vue';
import { NIcon, NScrollbar, NSpin, NText, NTree, useThemeVars } from 'naive-ui';
import type { TreeOption } from 'naive-ui';
import {
  ArchiveOutline as ArchiveIcon,
  DocumentOutline as FileIcon,
  FolderOutline
} from '@vicons/ionicons5';
import type { FileItem } from '../../types/file-explorer';
import { formatFileSize } from '../../utils/fileHelpers';

/** 压缩包文件项 */
interface ArchiveEntry {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  children?: ArchiveEntry[];
}

/** 将扁平路径列表转换为树形结构 */
function buildTree(entries: ArchiveEntry[]): ArchiveEntry[] {
  const root: ArchiveEntry[] = [];
  const map = new Map<string, ArchiveEntry>();

  for (const entry of entries) {
    map.set(entry.path, entry);
  }

  for (const entry of entries) {
    const parts = entry.path.split('/').filter(Boolean);
    if (parts.length <= 1) {
      root.push(entry);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = map.get(parentPath);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(entry);
      }
    }
  }

  return root;
}

/** 将 ArchiveEntry 转换为 NTree 的 TreeOption */
function toTreeOptions(entries: ArchiveEntry[]): TreeOption[] {
  return entries.map(entry => ({
    key: entry.path,
    label: entry.name,
    prefix: () => (
      <NIcon size={16} style={{ color: entry.isDirectory ? '#60a5fa' : '#9ca3af' }}>
        {entry.isDirectory ? <FolderOutline /> : <FileIcon />}
      </NIcon>
    ),
    children: entry.children ? toTreeOptions(entry.children) : undefined
  }));
}

/** 压缩包预览器 — 使用 JSZip 解析 zip 文件并展示文件列表树 */
export const ArchivePreviewer = defineComponent({
  name: 'ArchivePreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const loading = ref(true);
    const error = ref<string | null>(null);
    const treeData = ref<TreeOption[]>([]);
    const totalFiles = ref(0);
    const totalSize = ref(0);

    const parseArchive = async () => {
      loading.value = true;
      error.value = null;

      if (!(props.content instanceof Blob)) {
        error.value = '无法读取压缩包内容';
        loading.value = false;
        return;
      }

      try {
        const JSZip = await import('jszip');
        const zip = await JSZip.default.loadAsync(props.content);

        const entries: ArchiveEntry[] = [];
        let fileCount = 0;

        zip.forEach((relativePath, file) => {
          const name = relativePath.split('/').filter(Boolean).pop() || relativePath;
          const isDir = file.dir;

          entries.push({
            path: relativePath,
            name: name || relativePath,
            size: 0,
            isDirectory: isDir
          });

          if (!isDir) {
            fileCount++;
          }
        });

        const tree = buildTree(entries);
        treeData.value = toTreeOptions(tree);
        totalFiles.value = fileCount;
        totalSize.value = props.file.size || 0;
      } catch (err: unknown) {
        error.value = `压缩包解析失败: ${err instanceof Error ? err.message : String(err)}`;
      } finally {
        loading.value = false;
      }
    };

    watch(() => props.content, parseArchive, { immediate: true });

    const renderContent = () => {
      if (loading.value) {
        return (
          <div class="flex flex-1 items-center justify-center">
            <NSpin size="large" />
          </div>
        );
      }

      if (error.value) {
        return (
          <div class="flex flex-1 items-center justify-center">
            <NText depth={3} class="text-sm">
              {error.value}
            </NText>
          </div>
        );
      }

      return (
        <NScrollbar class="flex-1">
          <div class="p-2">
            <NTree
              data={treeData.value}
              blockLine
              defaultExpandAll
              virtualScroll
              style={{ minHeight: '200px' }}
            />
          </div>
        </NScrollbar>
      );
    };

    return () => (
      <div class="h-full flex flex-col" style={{ backgroundColor: themeVars.value.bodyColor }}>
        <div
          class="flex items-center gap-3 border-b px-4 py-2"
          style={{ borderColor: themeVars.value.dividerColor }}
        >
          <NIcon size={20} style={{ color: themeVars.value.primaryColor }}>
            <ArchiveIcon />
          </NIcon>
          <NText strong class="text-sm">
            {props.file.name}
          </NText>
          <NText depth={3} class="text-xs">
            {totalFiles.value} 个文件
          </NText>
          {totalSize.value > 0 && (
            <NText depth={3} class="text-xs">
              {formatFileSize(totalSize.value)}
            </NText>
          )}
        </div>
        {renderContent()}
      </div>
    );
  }
});
