import { NButton, NSpace, NSwitch } from 'naive-ui';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';

type Role = Api.RoleManagement.Role;

/** 搜索区：字段、控件类型、宽度等为静态配置；文案走 i18n */
export function createRoleSearchFields(): SearchFieldConfig[] {
  return [
    {
      type: 'input',
      field: 'search',
      label: $t('common.searchFieldLabel'),
      placeholder: $t('page.roleManagement.searchPlaceholder'),
      icon: 'i-carbon-search',
      width: '200px'
    },
    {
      type: 'select',
      field: 'isActive',
      label: $t('page.roleManagement.status'),
      placeholder: $t('page.roleManagement.statusPlaceholder'),
      width: '120px',
      options: [
        { label: $t('page.roleManagement.active'), value: 1 },
        { label: $t('page.roleManagement.inactive'), value: 0 }
      ]
    }
  ];
}

export interface RoleTableColumnHandlers {
  onEdit: (row: Role) => void;
  onDelete: (row: Role) => void;
  onToggleStatus: (roleId: number, isActive: boolean) => void;
}

/** 表格列：key / 宽度 / 固定列等为静态配置；操作列注入页面内事件 */
export function createRoleTableColumns(h: RoleTableColumnHandlers): TableColumnConfig<Role>[] {
  return [
    {
      title: $t('page.roleManagement.name'),
      key: 'name',
      width: 150
    },
    {
      title: $t('page.roleManagement.code'),
      key: 'code',
      width: 150
    },
    {
      title: $t('page.roleManagement.description'),
      key: 'description',
      width: 200,
      render: (row: Role) => row.description || '-'
    },
    {
      title: $t('page.roleManagement.status'),
      key: 'isActive',
      width: 100,
      render: (row: Role) => (
        <NSwitch value={row.isActive} onUpdateValue={(v: boolean) => h.onToggleStatus(row.id, v)} />
      )
    },
    {
      title: $t('page.roleManagement.createdAt'),
      key: 'createdAt',
      width: 180,
      render: (row: Role) => (row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-')
    },
    {
      title: $t('page.roleManagement.updatedAt'),
      key: 'updatedAt',
      width: 180,
      render: (row: Role) => (row.updatedAt ? new Date(row.updatedAt).toLocaleString('zh-CN') : '-')
    },
    {
      title: $t('common.operate'),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (row: Role) => (
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

export const ROLE_LIST_SCROLL_X = 1800;
