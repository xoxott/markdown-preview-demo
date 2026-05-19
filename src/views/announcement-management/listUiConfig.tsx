import { NButton, NSpace, NSwitch, NTag } from 'naive-ui';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';

type Announcement = Api.AnnouncementManagement.Announcement;

export function createAnnouncementSearchFields(): SearchFieldConfig[] {
  return [
    {
      type: 'input',
      field: 'search',
      label: $t('common.searchFieldLabel'),
      placeholder: $t('page.announcementManagement.searchPlaceholder'),
      icon: 'i-carbon-search',
      width: '200px'
    },
    {
      type: 'select',
      field: 'type',
      label: $t('page.announcementManagement.type'),
      placeholder: $t('page.announcementManagement.typePlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.announcementManagement.typeNotice'), value: 'notice' },
        { label: $t('page.announcementManagement.typeAnnouncement'), value: 'announcement' },
        { label: $t('page.announcementManagement.typeWarning'), value: 'warning' },
        { label: $t('page.announcementManagement.typeInfo'), value: 'info' }
      ]
    },
    {
      type: 'select',
      field: 'isPublished',
      label: $t('page.announcementManagement.status'),
      placeholder: $t('page.announcementManagement.statusPlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.announcementManagement.published'), value: 1 },
        { label: $t('page.announcementManagement.unpublished'), value: 0 }
      ]
    }
  ];
}

export interface AnnouncementTableColumnHandlers {
  onEdit: (row: Announcement) => void;
  onDelete: (row: Announcement) => void;
  onToggleStatus: (id: number, isPublished: boolean) => void;
}

export function createAnnouncementTableColumns(
  h: AnnouncementTableColumnHandlers
): TableColumnConfig<Announcement>[] {
  return [
    {
      title: $t('page.announcementManagement.title'),
      key: 'title',
      width: 200
    },
    {
      title: $t('page.announcementManagement.content'),
      key: 'content',
      width: 300,
      render: (row: Announcement) => {
        const content = row.content || '-';
        return content.length > 50 ? `${content.substring(0, 50)}...` : content;
      }
    },
    {
      title: $t('page.announcementManagement.type'),
      key: 'type',
      width: 120,
      render: (row: Announcement) => {
        if (!row.type) return '-';
        const typeMap: Record<string, string> = {
          notice: $t('page.announcementManagement.typeNotice'),
          announcement: $t('page.announcementManagement.typeAnnouncement'),
          warning: $t('page.announcementManagement.typeWarning'),
          info: $t('page.announcementManagement.typeInfo')
        };
        return <NTag type="info">{typeMap[row.type] || row.type}</NTag>;
      }
    },
    {
      title: $t('page.announcementManagement.priority'),
      key: 'priority',
      width: 100,
      render: (row: Announcement) => row.priority ?? '-'
    },
    {
      title: $t('page.announcementManagement.status'),
      key: 'isPublished',
      width: 120,
      render: (row: Announcement) => (
        <NSwitch
          value={row.isPublished}
          onUpdateValue={(v: boolean) => h.onToggleStatus(row.id, v)}
        />
      )
    },
    {
      title: $t('page.announcementManagement.publishedAt'),
      key: 'publishedAt',
      width: 180,
      render: (row: Announcement) =>
        row.publishedAt ? new Date(row.publishedAt).toLocaleString('zh-CN') : '-'
    },
    {
      title: $t('page.announcementManagement.expiresAt'),
      key: 'expiresAt',
      width: 180,
      render: (row: Announcement) =>
        row.expiresAt ? new Date(row.expiresAt).toLocaleString('zh-CN') : '-'
    },
    {
      title: $t('page.announcementManagement.createdAt'),
      key: 'createdAt',
      width: 180,
      render: (row: Announcement) =>
        row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-'
    },
    {
      title: $t('common.operate'),
      key: 'operate',
      width: 200,
      fixed: 'right',
      render: (row: Announcement) => (
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

export const ANNOUNCEMENT_LIST_SCROLL_X = 2000;
