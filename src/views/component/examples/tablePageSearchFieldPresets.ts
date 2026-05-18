import type { SearchFieldConfig } from '@/components/table-page/types';

const yesNoOptions = [
  { label: '是', value: 1 },
  { label: '否', value: 0 }
];

/** 少量字段：单行展示，无需折叠 */
export const fewSearchFields: SearchFieldConfig[] = [
  {
    type: 'input',
    field: 'search',
    placeholder: '关键词',
    icon: 'i-carbon-search',
    width: '220px'
  },
  {
    type: 'select',
    field: 'status',
    placeholder: '状态',
    width: '130px',
    options: [
      { label: '启用', value: 1 },
      { label: '停用', value: 0 }
    ]
  }
];

/** 多字段：用于验证换行与展开/收起 */
export const manySearchFields: SearchFieldConfig[] = [
  {
    type: 'input',
    field: 'search',
    placeholder: '关键词',
    icon: 'i-carbon-search',
    width: '200px'
  },
  {
    type: 'input',
    field: 'email',
    placeholder: '邮箱',
    icon: 'i-carbon-email',
    width: '200px'
  },
  {
    type: 'input',
    field: 'username',
    placeholder: '用户名',
    icon: 'i-carbon-user',
    width: '160px'
  },
  {
    type: 'select',
    field: 'isActive',
    placeholder: '状态',
    width: '120px',
    options: yesNoOptions
  },
  {
    type: 'select',
    field: 'isOnline',
    placeholder: '在线',
    width: '120px',
    options: yesNoOptions
  },
  {
    type: 'select',
    field: 'isBlacklisted',
    placeholder: '黑名单',
    width: '120px',
    options: yesNoOptions
  },
  {
    type: 'select',
    field: 'roleCode',
    placeholder: '角色',
    width: '130px',
    options: [
      { label: '管理员', value: 'admin' },
      { label: '用户', value: 'user' }
    ]
  },
  {
    type: 'date-range',
    field: 'createdAtRange',
    placeholder: '注册时间',
    width: '280px'
  },
  {
    type: 'date-range',
    field: 'lastLoginAtRange',
    placeholder: '最后登录',
    width: '280px'
  },
  {
    type: 'select',
    field: 'sortBy',
    placeholder: '排序字段',
    width: '140px',
    options: [
      { label: '注册时间', value: 'createdAt' },
      { label: '最后登录', value: 'lastLoginAt' }
    ]
  },
  {
    type: 'select',
    field: 'sortOrder',
    placeholder: '排序方向',
    width: '120px',
    options: [
      { label: '升序', value: 'asc' },
      { label: '降序', value: 'desc' }
    ]
  },
  {
    type: 'date',
    field: 'updatedAfter',
    placeholder: '更新于（起）',
    width: '160px'
  },
  {
    type: 'date',
    field: 'updatedBefore',
    placeholder: '更新于（止）',
    width: '160px'
  }
];

export function createInitialSearchModel(fields: SearchFieldConfig[]) {
  const model: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === 'date-range' || field.type === 'date') {
      model[field.field] = field.defaultValue ?? null;
    } else if (field.type === 'input') {
      model[field.field] = field.defaultValue ?? '';
    } else {
      model[field.field] = field.defaultValue ?? undefined;
    }
  }
  return model;
}
