import { NButton, NSpace, NSwitch, NTag } from 'naive-ui';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';

type VersionLog = Api.VersionLogManagement.VersionLog;

export function normalizeVersionLogRemoteSorter(sorter: unknown) {
  const cleared = {
    sortBy: undefined as string | undefined,
    sortOrder: undefined as 'asc' | 'desc' | undefined
  };
  if (!sorter) return cleared;
  const list = Array.isArray(sorter) ? sorter : [sorter];
  const first = list[0] as { columnKey?: string | number; order?: unknown } | undefined;
  if (!first?.columnKey) return cleared;
  const order = first.order;
  if (order !== 'ascend' && order !== 'descend') return cleared;
  return {
    sortBy: String(first.columnKey),
    sortOrder: (order === 'ascend' ? 'asc' : 'desc') as 'asc' | 'desc'
  };
}

export function createVersionLogSearchFields(): SearchFieldConfig[] {
  return [
    {
      type: 'input',
      field: 'search',
      label: $t('common.searchFieldLabel'),
      placeholder: $t('page.versionLogManagement.searchPlaceholder'),
      icon: 'i-carbon-search',
      width: '200px'
    },
    {
      type: 'select',
      field: 'type',
      label: $t('page.versionLogManagement.type'),
      placeholder: $t('page.versionLogManagement.typePlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.versionLogManagement.typeMajor'), value: 'major' },
        { label: $t('page.versionLogManagement.typeMinor'), value: 'minor' },
        { label: $t('page.versionLogManagement.typePatch'), value: 'patch' }
      ]
    },
    {
      type: 'select',
      field: 'isPublished',
      label: $t('page.versionLogManagement.status'),
      placeholder: $t('page.versionLogManagement.statusPlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.versionLogManagement.published'), value: 1 },
        { label: $t('page.versionLogManagement.unpublished'), value: 0 }
      ]
    }
  ];
}

export interface VersionLogTableColumnHandlers {
  onEdit: (row: VersionLog) => void;
  onDelete: (row: VersionLog) => void;
  onToggleStatus: (id: number, isPublished: boolean) => void;
}

export function createVersionLogTableColumns(
  h: VersionLogTableColumnHandlers
): TableColumnConfig<VersionLog>[] {
  return [
    {
      title: $t('page.versionLogManagement.version'),
      key: 'version',
      width: 120,
      sorter: true
    },
    {
      title: $t('page.versionLogManagement.type'),
      key: 'type',
      width: 100,
      render: (row: VersionLog) => {
        if (!row.type) return '-';
        const typeMap: Record<string, string> = {
          major: $t('page.versionLogManagement.typeMajor'),
          minor: $t('page.versionLogManagement.typeMinor'),
          patch: $t('page.versionLogManagement.typePatch')
        };
        const typeColorMap: Record<string, 'error' | 'warning' | 'info'> = {
          major: 'error',
          minor: 'warning',
          patch: 'info'
        };
        return (
          <NTag type={typeColorMap[row.type] || 'default'}>{typeMap[row.type] || row.type}</NTag>
        );
      }
    },
    {
      title: $t('page.versionLogManagement.releaseDate'),
      key: 'releaseDate',
      width: 120,
      sorter: true,
      render: (row: VersionLog) => {
        if (!row.releaseDate) return '-';
        return new Date(row.releaseDate).toLocaleDateString('zh-CN');
      }
    },
    {
      title: $t('page.versionLogManagement.content'),
      key: 'content',
      width: 300,
      render: (row: VersionLog) => {
        const content = row.content || '-';
        return content.length > 50 ? `${content.substring(0, 50)}...` : content;
      }
    },
    {
      title: $t('page.versionLogManagement.status'),
      key: 'isPublished',
      width: 120,
      render: (row: VersionLog) => (
        <NSwitch
          value={row.isPublished}
          onUpdateValue={value => h.onToggleStatus(row.id, value)}
          loading={false}
        />
      )
    },
    {
      title: $t('page.versionLogManagement.publishedAt'),
      key: 'publishedAt',
      width: 180,
      render: (row: VersionLog) => {
        if (!row.publishedAt) return '-';
        return new Date(row.publishedAt).toLocaleString('zh-CN');
      }
    },
    {
      title: $t('page.versionLogManagement.createdAt'),
      key: 'createdAt',
      width: 180,
      sorter: true,
      render: (row: VersionLog) => {
        if (!row.createdAt) return '-';
        return new Date(row.createdAt).toLocaleString('zh-CN');
      }
    },
    {
      title: $t('common.operate'),
      key: 'operate',
      width: 200,
      fixed: 'right',
      render: (row: VersionLog) => (
        <NSpace size="small">
          <NButton size="small" type="primary" onClick={() => h.onEdit(row)}>
            {$t('common.edit')}
          </NButton>
          <NButton size="small" type="error" onClick={() => h.onDelete(row)}>
            {$t('common.delete')}
          </NButton>
        </NSpace>
      )
    }
  ];
}

export const VERSION_LOG_LIST_SCROLL_X = 2000;
