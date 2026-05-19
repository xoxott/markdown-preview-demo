import { NButton, NSpace, NSwitch, NTag } from 'naive-ui';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';

type Notification = Api.NotificationManagement.Notification;

export function createNotificationSearchFields(): SearchFieldConfig[] {
  return [
    {
      type: 'input',
      field: 'search',
      label: $t('common.searchFieldLabel'),
      placeholder: $t('page.notificationManagement.searchPlaceholder'),
      icon: 'i-carbon-search',
      width: '200px'
    },
    {
      type: 'select',
      field: 'type',
      label: $t('page.notificationManagement.type'),
      placeholder: $t('page.notificationManagement.typePlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.notificationManagement.typeInfo'), value: 'info' },
        { label: $t('page.notificationManagement.typeWarning'), value: 'warning' },
        { label: $t('page.notificationManagement.typeError'), value: 'error' },
        { label: $t('page.notificationManagement.typeSuccess'), value: 'success' }
      ]
    },
    {
      type: 'select',
      field: 'isSent',
      label: $t('page.notificationManagement.status'),
      placeholder: $t('page.notificationManagement.statusPlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.notificationManagement.sent'), value: 1 },
        { label: $t('page.notificationManagement.unsent'), value: 0 }
      ]
    }
  ];
}

export interface NotificationTableColumnHandlers {
  onEdit: (row: Notification) => void;
  onDelete: (row: Notification) => void;
  onToggleStatus: (id: number, isSent: boolean) => void;
}

export function createNotificationTableColumns(
  h: NotificationTableColumnHandlers
): TableColumnConfig<Notification>[] {
  return [
    {
      title: $t('page.notificationManagement.title'),
      key: 'title',
      width: 200
    },
    {
      title: $t('page.notificationManagement.content'),
      key: 'content',
      width: 300,
      render: (row: Notification) => {
        const content = row.content || '-';
        return content.length > 50 ? `${content.substring(0, 50)}...` : content;
      }
    },
    {
      title: $t('page.notificationManagement.type'),
      key: 'type',
      width: 120,
      render: (row: Notification) => {
        if (!row.type) return '-';
        const typeMap: Record<string, string> = {
          info: $t('page.notificationManagement.typeInfo'),
          warning: $t('page.notificationManagement.typeWarning'),
          error: $t('page.notificationManagement.typeError'),
          success: $t('page.notificationManagement.typeSuccess')
        };
        return <NTag type="info">{typeMap[row.type] || row.type}</NTag>;
      }
    },
    {
      title: $t('page.notificationManagement.priority'),
      key: 'priority',
      width: 100,
      render: (row: Notification) => row.priority || '-'
    },
    {
      title: $t('page.notificationManagement.targetUsers'),
      key: 'targetUserIds',
      width: 150,
      render: (row: Notification) => {
        if (!row.targetUserIds || row.targetUserIds.length === 0) {
          return row.targetRoleCodes && row.targetRoleCodes.length > 0
            ? $t('page.notificationManagement.targetRoles')
            : $t('page.notificationManagement.allUsers');
        }
        return `${row.targetUserIds.length} ${$t('page.notificationManagement.users')}`;
      }
    },
    {
      title: $t('page.notificationManagement.readStatus'),
      key: 'readStatus',
      width: 120,
      render: (row: Notification) => {
        if (row.readCount !== null && row.totalCount !== null && row.totalCount > 0) {
          return `${row.readCount}/${row.totalCount}`;
        }
        return '-';
      }
    },
    {
      title: $t('page.notificationManagement.status'),
      key: 'isSent',
      width: 120,
      render: (row: Notification) => (
        <NSwitch
          value={row.isSent}
          onUpdateValue={value => h.onToggleStatus(row.id, value)}
          loading={false}
        />
      )
    },
    {
      title: $t('page.notificationManagement.sentAt'),
      key: 'sentAt',
      width: 180,
      render: (row: Notification) => {
        if (!row.sentAt) return '-';
        return new Date(row.sentAt).toLocaleString('zh-CN');
      }
    },
    {
      title: $t('page.notificationManagement.expiresAt'),
      key: 'expiresAt',
      width: 180,
      render: (row: Notification) => {
        if (!row.expiresAt) return '-';
        return new Date(row.expiresAt).toLocaleString('zh-CN');
      }
    },
    {
      title: $t('page.notificationManagement.createdAt'),
      key: 'createdAt',
      width: 180,
      render: (row: Notification) => {
        if (!row.createdAt) return '-';
        return new Date(row.createdAt).toLocaleString('zh-CN');
      }
    },
    {
      title: $t('common.operate'),
      key: 'operate',
      width: 200,
      fixed: 'right',
      render: (row: Notification) => (
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

export const NOTIFICATION_LIST_SCROLL_X = 2200;
