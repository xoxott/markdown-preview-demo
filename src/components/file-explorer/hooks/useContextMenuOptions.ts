import type { Ref } from 'vue';
import { computed, nextTick, ref } from 'vue';
import {
  CopyOutline,
  CreateOutline,
  CutOutline,
  DownloadOutline,
  FunnelOutline,
  InformationCircleOutline,
  OpenOutline,
  ShareSocialOutline,
  StarOutline,
  TrashOutline
} from '@vicons/ionicons5';
import type { ContextMenuItem } from '../interaction/ContextMenu';

interface UseContextMenuOptionsParams {
  selectedIds: Ref<Set<string>>;
  onSelect: (ids: string[], event?: MouseEvent) => void;
}

export function useContextMenuOptions({ selectedIds, onSelect }: UseContextMenuOptionsParams) {
  // 空白区菜单（固定 show）
  const blankOptions: ContextMenuItem[] = [
    { key: 'refresh', label: '刷新', icon: OpenOutline, shortcut: 'F5', show: true },
    { key: 'new-folder', label: '新建文件夹', icon: CreateOutline, shortcut: 'Ctrl+Shift+N', show: true },
    { key: 'paste', label: '粘贴', icon: CopyOutline, shortcut: 'Ctrl+V', show: true },
    {
      key: 'sort',
      label: '排序方式',
      icon: FunnelOutline,
      show: true,
      children: [
        { key: 'sort-name', label: '按名称排序' },
        { key: 'sort-size', label: '按大小排序' },
        { key: 'sort-modified', label: '按修改日期排序' },
        { key: 'sort-created', label: '按创建日期排序' }
      ]
    }
  ];

  // 文件区菜单：computed 动态生成，每次依赖 selectedIds
  const fileOptions = computed<ContextMenuItem[]>(() => {
    const options: ContextMenuItem[] = [
      { key: 'open', label: '打开', icon: OpenOutline, shortcut: 'Enter', show: true },
      {
        key: 'open-with',
        label: '打开方式',
        icon: OpenOutline,
        children: [
          { key: 'open-default', label: '默认程序' },
          { key: 'open-text', label: '文本编辑器' },
          { key: 'open-code', label: '代码编辑器' }
        ],
        show: true
      },
      { key: 'divider-1', label: '', divider: true },
      { key: 'cut', label: '剪切', icon: CutOutline, shortcut: 'Ctrl+X', show: selectedIds.value.size > 0 },
      { key: 'copy', label: '复制', icon: CopyOutline, shortcut: 'Ctrl+C', show: selectedIds.value.size > 0 },
      { key: 'divider-2', label: '', divider: true },
      { key: 'rename', label: '重命名', icon: CreateOutline, shortcut: 'F2', show: selectedIds.value.size === 1 },
      {
        key: 'delete',
        label: `删除 ${selectedIds.value.size} 个项目`,
        icon: TrashOutline,
        danger: true,
        shortcut: 'Delete',
        show: selectedIds.value.size > 0
      },
      { key: 'divider-3', label: '', divider: true },
      { key: 'download', label: '下载', icon: DownloadOutline, show: selectedIds.value.size > 0 },
      { key: 'share', label: '分享', icon: ShareSocialOutline, show: selectedIds.value.size > 0 },
      { key: 'favorite', label: '收藏', icon: StarOutline, show: selectedIds.value.size === 1 },
      { key: 'divider-4', label: '', divider: true },
      {
        key: 'properties',
        label: '属性',
        icon: InformationCircleOutline,
        shortcut: 'Alt+Enter',
        show: selectedIds.value.size === 1
      }
    ];

    // 去掉多余分隔符
    const filtered: ContextMenuItem[] = [];
    for (let i = 0; i < options.length; i++) {
      const item = options[i];
      if (item.divider) {
        const hasPrev = filtered.some(f => f.show);
        const hasNext = options.slice(i + 1).some(f => f.show && !f.divider);
        if (hasPrev && hasNext) filtered.push(item);
      } else {
        filtered.push(item);
      }
    }

    return filtered;
  });

  const options = ref<ContextMenuItem[]>([]);

  const handleContextMenuShow = (contextData: any) => {
    const target = contextData.data.element as HTMLElement;
    const fileEl = target.closest('[data-selectable-id]') as HTMLElement | null;

    if (fileEl) {
      const id = fileEl.dataset.selectableId!;
      if (!selectedIds.value.has(id)) {
        onSelect([id]);
      }
      options.value = fileOptions.value;
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
