import { NButton, NSpace, NSwitch, NTag } from 'naive-ui';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';

type Alert = Api.AlertManagement.Alert;

export function createAlertSearchFields(): SearchFieldConfig[] {
  return [
    {
      type: 'input',
      field: 'search',
      placeholder: $t('page.alertManagement.searchPlaceholder'),
      icon: 'i-carbon-search',
      width: '200px'
    },
    {
      type: 'select',
      field: 'level',
      placeholder: $t('page.alertManagement.levelPlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.alertManagement.levelCritical'), value: 'critical' },
        { label: $t('page.alertManagement.levelWarning'), value: 'warning' },
        { label: $t('page.alertManagement.levelInfo'), value: 'info' }
      ]
    },
    {
      type: 'select',
      field: 'status',
      placeholder: $t('page.alertManagement.statusPlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.alertManagement.statusActive'), value: 'active' },
        { label: $t('page.alertManagement.statusResolved'), value: 'resolved' },
        { label: $t('page.alertManagement.statusAcknowledged'), value: 'acknowledged' }
      ]
    },
    {
      type: 'select',
      field: 'isEnabled',
      placeholder: $t('page.alertManagement.enabledStatusPlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.alertManagement.enabled'), value: 1 },
        { label: $t('page.alertManagement.disabled'), value: 0 }
      ]
    }
  ];
}

export interface AlertTableColumnHandlers {
  onEdit: (row: Alert) => void;
  onDelete: (row: Alert) => void;
  onToggleStatus: (id: number, isEnabled: boolean) => void;
  onAcknowledge: (row: Alert) => void;
  onResolve: (row: Alert) => void;
}

export function createAlertTableColumns(h: AlertTableColumnHandlers): TableColumnConfig<Alert>[] {
  return [
    {
      title: $t('page.alertManagement.name'),
      key: 'name',
      width: 200
    },
    {
      title: $t('page.alertManagement.level'),
      key: 'level',
      width: 120,
      render: (row: Alert) => {
        const levelMap: Record<string, { label: string; type: 'error' | 'warning' | 'info' }> = {
          critical: { label: $t('page.alertManagement.levelCritical'), type: 'error' },
          warning: { label: $t('page.alertManagement.levelWarning'), type: 'warning' },
          info: { label: $t('page.alertManagement.levelInfo'), type: 'info' }
        };
        const level = levelMap[row.level] || { label: row.level, type: 'info' };
        return <NTag type={level.type}>{level.label}</NTag>;
      }
    },
    {
      title: $t('page.alertManagement.status'),
      key: 'status',
      width: 120,
      render: (row: Alert) => {
        const statusMap: Record<string, string> = {
          active: $t('page.alertManagement.statusActive'),
          resolved: $t('page.alertManagement.statusResolved'),
          acknowledged: $t('page.alertManagement.statusAcknowledged')
        };
        return statusMap[row.status] || row.status;
      }
    },
    {
      title: $t('page.alertManagement.metric'),
      key: 'metric',
      width: 120,
      render: (row: Alert) => row.metric || '-'
    },
    {
      title: $t('page.alertManagement.threshold'),
      key: 'threshold',
      width: 100,
      render: (row: Alert) => (row.threshold !== null ? row.threshold : '-')
    },
    {
      title: $t('page.alertManagement.triggerCount'),
      key: 'triggerCount',
      width: 120,
      render: (row: Alert) => (row.triggerCount !== null ? row.triggerCount : '-')
    },
    {
      title: $t('page.alertManagement.targetUsers'),
      key: 'targetUserIds',
      width: 150,
      render: (row: Alert) => {
        if (!row.targetUserIds || row.targetUserIds.length === 0) {
          return row.targetRoleCodes && row.targetRoleCodes.length > 0
            ? $t('page.alertManagement.targetRoles')
            : $t('page.alertManagement.allUsers');
        }
        return `${row.targetUserIds.length} ${$t('page.alertManagement.users')}`;
      }
    },
    {
      title: $t('page.alertManagement.enabled'),
      key: 'isEnabled',
      width: 100,
      render: (row: Alert) => (
        <NSwitch
          value={row.isEnabled}
          onUpdateValue={value => h.onToggleStatus(row.id, value)}
          loading={false}
        />
      )
    },
    {
      title: $t('page.alertManagement.lastTriggeredAt'),
      key: 'lastTriggeredAt',
      width: 180,
      render: (row: Alert) => {
        if (!row.lastTriggeredAt) return '-';
        return new Date(row.lastTriggeredAt).toLocaleString('zh-CN');
      }
    },
    {
      title: $t('page.alertManagement.createdAt'),
      key: 'createdAt',
      width: 180,
      render: (row: Alert) => {
        if (!row.createdAt) return '-';
        return new Date(row.createdAt).toLocaleString('zh-CN');
      }
    },
    {
      title: $t('common.operate'),
      key: 'operate',
      width: 280,
      fixed: 'right',
      render: (row: Alert) => (
        <NSpace size="small">
          <NButton size="small" type="primary" onClick={() => h.onEdit(row)}>
            {$t('common.edit')}
          </NButton>
          {row.status === 'active' && (
            <>
              <NButton size="small" type="info" onClick={() => h.onAcknowledge(row)}>
                {$t('page.alertManagement.acknowledge')}
              </NButton>
              <NButton size="small" type="success" onClick={() => h.onResolve(row)}>
                {$t('page.alertManagement.resolve')}
              </NButton>
            </>
          )}
          <NButton size="small" type="error" onClick={() => h.onDelete(row)}>
            {$t('common.delete')}
          </NButton>
        </NSpace>
      )
    }
  ];
}

export const ALERT_LIST_SCROLL_X = 2400;
