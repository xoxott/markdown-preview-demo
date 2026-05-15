import type { Ref } from 'vue';
import { computed, shallowRef } from 'vue';
import { contextMenuIcons } from '../config/contextMenuIcons';
import type { ContextMenuItem } from '../interaction/ContextMenu';
import type { DataSourceType } from '../datasources/types';
import { getOpenWithMenuItems } from '../open/resolveFileOpenMode';
import type { FileItem } from '../types/file-explorer';

interface UseContextMenuOptionsParams {
  selectedIds: Ref<Set<string>>;
  onSelect: (ids: string[], event?: MouseEvent) => void;
  items: Ref<FileItem[]>;
  dataSourceType?: Ref<DataSourceType>;
}

function buildFileMenuOptions(
  openWithChildren: { key: string; label: string }[]
): ContextMenuItem[] {
  const openWithItem: ContextMenuItem | null =
    openWithChildren.length > 0
      ? {
          key: 'open-with',
          label: '打开方式',
          icon: contextMenuIcons.open,
          children: openWithChildren,
          show: true
        }
      : null;

  const options: ContextMenuItem[] = [
    { key: 'open', label: '打开', icon: contextMenuIcons.open, shortcut: 'Enter', show: true },
    ...(openWithItem ? [openWithItem] : []),
    { key: 'divider-1', label: '', divider: true },
    {
      key: 'cut',
      label: '剪切',
      icon: contextMenuIcons.cut,
      shortcut: 'Ctrl+X',
      show: true
    },
    {
      key: 'copy',
      label: '复制',
      icon: contextMenuIcons.copy,
      shortcut: 'Ctrl+C',
      show: true
    },
    { key: 'divider-2', label: '', divider: true },
    {
      key: 'rename',
      label: '重命名',
      icon: contextMenuIcons.create,
      shortcut: 'F2',
      show: true
    },
    {
      key: 'delete',
      label: '删除',
      icon: contextMenuIcons.trash,
      danger: true,
      shortcut: 'Delete',
      show: true
    },
    { key: 'divider-3', label: '', divider: true },
    { key: 'download', label: '下载', icon: contextMenuIcons.download, show: true },
    { key: 'share', label: '分享', icon: contextMenuIcons.share, show: true },
    { key: 'favorite', label: '收藏', icon: contextMenuIcons.star, show: true },
    { key: 'divider-4', label: '', divider: true },
    {
      key: 'info',
      label: '文件信息',
      icon: contextMenuIcons.info,
      shortcut: 'Alt+Enter',
      show: true
    },
    {
      key: 'properties',
      label: '属性',
      icon: contextMenuIcons.info,
      shortcut: 'Alt+Enter',
      show: true
    }
  ];

  return options;
}

export function useContextMenuOptions({
  selectedIds,
  onSelect,
  items,
  dataSourceType
}: UseContextMenuOptionsParams) {
  const isServerMode = computed(() => dataSourceType?.value === 'server');

  // 空白区菜单（固定 show）
  const blankOptions: ContextMenuItem[] = [
    { key: 'refresh', label: '刷新', icon: contextMenuIcons.open, shortcut: 'F5', show: true },
    {
      key: 'new-folder',
      label: '新建文件夹',
      icon: contextMenuIcons.create,
      shortcut: 'Ctrl+Shift+N',
      show: true
    },
    {
      key: 'upload-file',
      label: '上传文件',
      icon: contextMenuIcons.upload,
      show: isServerMode.value
    },
    {
      key: 'upload-folder',
      label: '上传文件夹',
      icon: contextMenuIcons.folder,
      show: isServerMode.value
    },
    { key: 'paste', label: '粘贴', icon: contextMenuIcons.copy, shortcut: 'Ctrl+V', show: true },
    {
      key: 'sort',
      label: '排序方式',
      icon: contextMenuIcons.funnel,
      show: true,
      children: [
        { key: 'sort-name', label: '按名称排序' },
        { key: 'sort-size', label: '按大小排序' },
        { key: 'sort-modified', label: '按修改日期排序' },
        { key: 'sort-created', label: '按创建日期排序' }
      ]
    }
  ];

  const options = shallowRef<ContextMenuItem[]>([]);

  const handleContextMenuShow = (contextData: { data?: { element?: HTMLElement } }) => {
    const target = contextData.data?.element as HTMLElement;
    const fileEl = target.closest('[data-selectable-id]') as HTMLElement | null;

    if (fileEl) {
      const id = fileEl.dataset.selectableId!;
      if (!selectedIds.value.has(id)) {
        onSelect([id]);
      }

      const file = items.value.find(item => item.id === id);
      const openWithChildren = file ? getOpenWithMenuItems(file) : [];
      const selectionSize = selectedIds.value.size || 1;
      const base = buildFileMenuOptions(openWithChildren);
      const mapped = base.map(item => {
        if (item.divider) return item;
        switch (item.key) {
          case 'cut':
          case 'copy':
            return { ...item, show: selectionSize > 0 };
          case 'rename':
          case 'favorite':
          case 'properties':
            return { ...item, show: selectionSize === 1 };
          case 'delete':
            return {
              ...item,
              label: selectionSize > 1 ? `删除 ${selectionSize} 个项目` : '删除',
              show: selectionSize > 0
            };
          case 'download':
          case 'share':
          case 'info':
            return { ...item, show: selectionSize > 0 };
          default:
            return item;
        }
      });

      const filtered: ContextMenuItem[] = [];
      for (let i = 0; i < mapped.length; i++) {
        const item = mapped[i];
        if (item.divider) {
          const hasPrev = filtered.some(f => f.show);
          const hasNext = mapped.slice(i + 1).some(f => f.show && !f.divider);
          if (hasPrev && hasNext) filtered.push(item);
        } else {
          filtered.push(item);
        }
      }
      options.value = filtered;
    } else {
      onSelect([]);
      options.value = blankOptions;
    }
  };

  const handleContextMenuHide = () => {
    options.value = [];
  };

  return {
    options,
    handleContextMenuShow,
    handleContextMenuHide
  };
}
