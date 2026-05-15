import { NBadge, NButton, NPopover, NSpace, NSwitch, NTag, NText } from 'naive-ui';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';

type User = Api.UserManagement.User;

/** 静态筛选项 + 角色下拉（选项由接口数据在页面侧传入） */
export function createUserSearchFields(roles: Api.UserManagement.Role[]): SearchFieldConfig[] {
  return [
    {
      type: 'input',
      field: 'search',
      placeholder: $t('page.userManagement.searchPlaceholder'),
      icon: 'i-carbon-search',
      width: '220px'
    },
    {
      type: 'select',
      field: 'isActive',
      placeholder: $t('page.userManagement.statusPlaceholder'),
      width: '130px',
      options: [
        { label: $t('page.userManagement.active'), value: 1 },
        { label: $t('page.userManagement.inactive'), value: 0 }
      ]
    },
    {
      type: 'select',
      field: 'isOnline',
      placeholder: $t('page.userManagement.onlineStatusPlaceholder'),
      width: '130px',
      options: [
        { label: $t('page.userManagement.online'), value: 1 },
        { label: $t('page.userManagement.offline'), value: 0 }
      ]
    },
    {
      type: 'select',
      field: 'isBlacklisted',
      placeholder: $t('page.userManagement.blacklistStatusPlaceholder'),
      width: '130px',
      options: [
        { label: $t('page.userManagement.blacklisted'), value: 1 },
        { label: $t('page.userManagement.notBlacklisted'), value: 0 }
      ]
    },
    {
      type: 'select',
      field: 'roleCode',
      placeholder: '筛选角色',
      width: '130px',
      options: roles.map(role => ({
        label: role.name,
        value: role.code
      }))
    }
  ];
}

export interface UserTableColumnHandlers {
  onEdit: (row: User) => void;
  onDelete: (row: User) => void;
  onToggleStatus: (id: number, isActive: boolean) => void;
}

export function createUserTableColumns(h: UserTableColumnHandlers): TableColumnConfig<User>[] {
  return [
    {
      title: $t('page.userManagement.username'),
      key: 'username',
      width: 140,
      fixed: 'left',
      ellipsis: {
        tooltip: true
      },
      render: (row: User) => (
        <NSpace size="small" align="center">
          <div class="flex items-center gap-6px">
            {row.avatar ? (
              <img
                src={row.avatar}
                alt={row.username}
                class="h-28px w-28px rounded-full object-cover"
              />
            ) : (
              <div class="h-28px w-28px flex items-center justify-center rounded-full bg-primary text-12px text-white font-500">
                {row.username.charAt(0).toUpperCase()}
              </div>
            )}
            <NText strong>{row.username}</NText>
          </div>
        </NSpace>
      )
    },
    {
      title: $t('page.userManagement.email'),
      key: 'email',
      width: 200,
      ellipsis: {
        tooltip: true
      }
    },
    {
      title: $t('page.userManagement.role'),
      key: 'roles',
      width: 180,
      render: (row: User) => {
        if (!row.roles || row.roles.length === 0) {
          return <NText depth={3}>-</NText>;
        }
        if (row.roles.length === 1) {
          return (
            <NTag type="info" size="small" round>
              {row.roles[0].name}
            </NTag>
          );
        }
        return (
          <NPopover trigger="hover" placement="top">
            {{
              trigger: () => (
                <NBadge value={row.roles.length} type="info">
                  <NTag type="info" size="small" round>
                    {row.roles[0].name}
                  </NTag>
                </NBadge>
              ),
              default: () => (
                <NSpace size="small" vertical>
                  {row.roles.map((role: Api.UserManagement.Role) => (
                    <NTag key={role.id} type="info" size="small" round>
                      {role.name}
                    </NTag>
                  ))}
                </NSpace>
              )
            }}
          </NPopover>
        );
      }
    },
    {
      title: $t('page.userManagement.status'),
      key: 'isActive',
      width: 90,
      render: (row: User) => (
        <NSwitch
          value={row.isActive}
          onUpdateValue={value => h.onToggleStatus(row.id, value)}
          size="small"
        />
      )
    },
    {
      title: $t('page.userManagement.onlineStatus'),
      key: 'isOnline',
      width: 100,
      render: (row: User) => (
        <div class="flex items-center gap-6px">
          <div
            class={`w-6px h-6px rounded-full ${row.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <NText depth={row.isOnline ? 1 : 3}>
            {row.isOnline ? $t('page.userManagement.online') : $t('page.userManagement.offline')}
          </NText>
        </div>
      )
    },
    {
      title: $t('page.userManagement.blacklistStatus'),
      key: 'isBlacklisted',
      width: 100,
      render: (row: User) => {
        if (row.isBlacklisted) {
          return (
            <NPopover trigger="hover" placement="top">
              {{
                trigger: () => (
                  <NTag type="error" size="small" round>
                    {$t('page.userManagement.blacklisted')}
                  </NTag>
                ),
                default: () => (
                  <div class="max-w-300px">
                    {row.blacklistReason && (
                      <div class="mb-4px">
                        <NText strong>原因: </NText>
                        <NText>{row.blacklistReason}</NText>
                      </div>
                    )}
                    {row.blacklistedAt && (
                      <div>
                        <NText depth={3} class="text-12px">
                          {new Date(row.blacklistedAt).toLocaleString('zh-CN')}
                        </NText>
                      </div>
                    )}
                  </div>
                )
              }}
            </NPopover>
          );
        }
        return (
          <NTag type="success" size="small" round>
            {$t('page.userManagement.notBlacklisted')}
          </NTag>
        );
      }
    },
    {
      title: $t('page.userManagement.lastLoginAt'),
      key: 'lastLoginAt',
      width: 160,
      render: (row: User) => {
        if (!row.lastLoginAt) return <NText depth={3}>从未登录</NText>;
        const date = new Date(row.lastLoginAt);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
          return (
            <NText type="success">
              {date.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </NText>
          );
        }
        if (days < 7) {
          return <NText>{days}天前</NText>;
        }
        return <NText depth={3}>{date.toLocaleDateString('zh-CN')}</NText>;
      }
    },
    {
      title: $t('page.userManagement.createdAt'),
      key: 'createdAt',
      width: 160,
      render: (row: User) => {
        if (!row.createdAt) return '-';
        return new Date(row.createdAt).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    },
    {
      title: $t('common.operate'),
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (row: User) => (
        <NSpace size="small">
          <NButton size="small" type="primary" secondary onClick={() => h.onEdit(row)}>
            <div class="flex items-center gap-4px">
              <div class="i-carbon-edit text-14px" />
              <span>{$t('common.edit')}</span>
            </div>
          </NButton>
          <NButton size="small" type="error" secondary onClick={() => h.onDelete(row)}>
            <div class="flex items-center gap-4px">
              <div class="i-carbon-trash-can text-14px" />
              <span>{$t('common.delete')}</span>
            </div>
          </NButton>
        </NSpace>
      )
    }
  ];
}

export const USER_LIST_SCROLL_X = 1600;
