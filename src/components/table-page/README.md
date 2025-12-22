# TablePage 通用表格页面组件

一套高度可配置、功能完善的表格页面组件系统，用于快速构建后台管理系统的列表页面。

## 特性

- 🎯 **高度可配置**: 通过配置对象快速构建页面，减少 80% 重复代码
- 🎨 **预设渲染器**: 内置常见场景的渲染器（头像、状态、日期、标签、操作等）
- 🔧 **灵活扩展**: 支持自定义渲染和插槽扩展
- 📦 **组件独立**: 子组件可独立使用，也可组合使用
- 🎭 **类型安全**: 完整的 TypeScript 类型定义
- 📱 **响应式设计**: 自适应移动端和桌面端
- 🚀 **开箱即用**: 内置搜索、分页、批量操作等常用功能

## 快速开始

### 基础用法

```tsx
import { TablePage, useTablePage } from '@/components/table-page';
import type { SearchFieldConfig, ActionBarConfig, TableColumnConfig } from '@/components/table-page';

export default defineComponent({
  setup() {
    // 搜索配置
    const searchConfig: SearchFieldConfig[] = [
      {
        type: 'input',
        field: 'search',
        placeholder: '搜索关键词',
        icon: 'i-carbon-search',
        width: '220px'
      },
      {
        type: 'select',
        field: 'status',
        placeholder: '状态',
        width: '130px',
        options: [
          { label: '启用', value: true },
          { label: '禁用', value: false }
        ]
      }
    ];

    // 使用 hook 管理数据
    const { data, loading, pagination, selectedKeys, refresh, updateSelectedKeys } = useTablePage({
      apiFn: fetchDataList,
      searchConfig,
      immediate: true
    });

    // 操作栏配置
    const actionConfig: ActionBarConfig = {
      preset: {
        add: { show: true, onClick: handleAdd },
        batchDelete: { show: true, onClick: handleBatchDelete },
        refresh: { show: true, onClick: refresh }
      }
    };

    // 表格列配置
    const columns: TableColumnConfig[] = [
      {
        key: 'username',
        title: '用户名',
        width: 140,
        render: 'avatar',
        renderConfig: {
          avatarField: 'avatar',
          nameField: 'username'
        }
      },
      {
        key: 'status',
        title: '状态',
        width: 90,
        render: 'status',
        renderConfig: {
          type: 'switch',
          onChange: handleToggleStatus
        }
      },
      {
        key: 'action',
        title: '操作',
        width: 180,
        fixed: 'right',
        render: 'action',
        renderConfig: {
          buttons: [
            { label: '编辑', type: 'primary', onClick: handleEdit },
            { label: '删除', type: 'error', onClick: handleDelete }
          ]
        }
      }
    ];

    return () => (
      <TablePage
        searchConfig={searchConfig}
        actionConfig={actionConfig}
        columns={columns}
        data={data.value}
        loading={loading.value}
        pagination={pagination}
        selectedKeys={selectedKeys.value}
        onUpdateSelectedKeys={updateSelectedKeys}
      />
    );
  }
});
```

## 组件 API

### TablePage

主组件，包含搜索栏、操作栏和数据表格。

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| searchConfig | `SearchFieldConfig[]` | - | 搜索栏配置 |
| actionConfig | `ActionBarConfig` | - | 操作栏配置 |
| columns | `TableColumnConfig[]` | - | 表格列配置（必填） |
| data | `any[]` | - | 表格数据（必填） |
| loading | `boolean` | `false` | 加载状态 |
| pagination | `PaginationProps` | - | 分页配置 |
| selectedKeys | `(string \| number)[]` | `[]` | 选中的行键 |
| rowKey | `string \| Function` | `'id'` | 行键字段 |
| onSearch | `Function` | - | 搜索事件 |
| onReset | `Function` | - | 重置事件 |
| onUpdateSelectedKeys | `Function` | - | 选中行变更事件 |
| scrollX | `number` | - | 表格滚动宽度 |
| showIndex | `boolean` | `true` | 是否显示序号列 |
| showSelection | `boolean` | `true` | 是否显示选择列 |
| striped | `boolean` | `true` | 是否条纹显示 |
| size | `'small' \| 'medium' \| 'large'` | `'small'` | 表格大小 |

### SearchBar

搜索栏组件，支持多种字段类型。

#### SearchFieldConfig

```typescript
interface SearchFieldConfig {
  type: 'input' | 'select' | 'date' | 'date-range' | 'custom';
  field: string;
  placeholder?: string;
  icon?: string;
  width?: string;
  options?: Array<{ label: string; value: any }>;
  clearable?: boolean;
  render?: (model: any, updateModel: Function) => VNode;
}
```

#### 示例

```typescript
const searchConfig: SearchFieldConfig[] = [
  // 输入框
  {
    type: 'input',
    field: 'keyword',
    placeholder: '搜索关键词',
    icon: 'i-carbon-search',
    width: '220px'
  },
  // 下拉选择
  {
    type: 'select',
    field: 'status',
    placeholder: '选择状态',
    width: '130px',
    options: [
      { label: '全部', value: '' },
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 }
    ]
  },
  // 日期选择
  {
    type: 'date',
    field: 'date',
    placeholder: '选择日期',
    width: '180px'
  },
  // 日期范围
  {
    type: 'date-range',
    field: 'dateRange',
    placeholder: '选择日期范围',
    width: '240px'
  },
  // 自定义渲染
  {
    type: 'custom',
    field: 'custom',
    render: (model, updateModel) => (
      <NInput value={model.custom} onUpdateValue={(v) => updateModel('custom', v)} />
    )
  }
];
```

### ActionBar

操作栏组件，支持预设按钮和自定义按钮。

#### ActionBarConfig

```typescript
interface ActionBarConfig {
  preset?: {
    add?: PresetButtonConfig;
    batchDelete?: PresetButtonConfig;
    refresh?: PresetButtonConfig;
    export?: PresetButtonConfig;
  };
  custom?: CustomButtonConfig[];
  showStats?: boolean;
  statsRender?: (total: number, selected: number) => VNode | string;
}
```

#### 示例

```typescript
const actionConfig: ActionBarConfig = {
  // 预设按钮
  preset: {
    add: {
      show: true,
      onClick: handleAdd,
      label: '新增用户' // 可选：自定义标签
    },
    batchDelete: {
      show: true,
      onClick: handleBatchDelete
    },
    refresh: {
      show: true,
      onClick: handleRefresh
    }
  },
  // 自定义按钮
  custom: [
    {
      label: '导出',
      icon: 'i-carbon-download',
      type: 'default',
      onClick: handleExport
    },
    {
      label: '导入',
      icon: 'i-carbon-upload',
      type: 'default',
      onClick: handleImport
    }
  ],
  // 自定义统计信息
  statsRender: (total, selected) => (
    <span>共 {total} 条，已选 {selected} 条</span>
  )
};
```

### DataTable

数据表格组件，支持预设渲染器。

#### 预设渲染器

##### 1. Avatar Renderer (头像渲染器)

```typescript
{
  key: 'username',
  title: '用户名',
  render: 'avatar',
  renderConfig: {
    avatarField: 'avatar',        // 头像字段
    nameField: 'username',         // 名称字段
    size: 28,                      // 头像大小
    showOnlineStatus: true,        // 显示在线状态
    onlineStatusField: 'isOnline'  // 在线状态字段
  }
}
```

##### 2. Status Renderer (状态渲染器)

```typescript
// Switch 类型
{
  key: 'isActive',
  title: '状态',
  render: 'status',
  renderConfig: {
    type: 'switch',
    onChange: (row, value) => handleToggleStatus(row.id, value)
  }
}

// Tag 类型
{
  key: 'status',
  title: '状态',
  render: 'status',
  renderConfig: {
    type: 'tag',
    trueLabel: '启用',
    falseLabel: '禁用',
    trueType: 'success',
    falseType: 'default'
  }
}
```

##### 3. Date Renderer (日期渲染器)

```typescript
{
  key: 'createdAt',
  title: '创建时间',
  render: 'date',
  renderConfig: {
    format: 'datetime',  // 'datetime' | 'date' | 'time' | 'relative' | 'smart'
    emptyText: '-'
  }
}

// Smart 格式：今天显示时间，7天内显示"X天前"，更早显示日期
{
  key: 'lastLoginAt',
  title: '最后登录',
  render: 'date',
  renderConfig: {
    format: 'smart',
    emptyText: '从未登录'
  }
}
```

##### 4. Tag Renderer (标签渲染器)

```typescript
// Simple 类型：直接显示所有标签
{
  key: 'tags',
  title: '标签',
  render: 'tag',
  renderConfig: {
    type: 'simple',
    tagType: 'info',
    round: true
  }
}

// Badge 类型：显示第一个标签 + 数量徽章
{
  key: 'roles',
  title: '角色',
  render: 'tag',
  renderConfig: {
    type: 'badge',
    maxShow: 1,
    fieldMap: {
      label: 'name',
      value: 'id'
    }
  }
}

// Popover 类型：悬停显示所有标签
{
  key: 'roles',
  title: '角色',
  render: 'tag',
  renderConfig: {
    type: 'popover',
    maxShow: 2,
    fieldMap: {
      label: 'name',
      value: 'id'
    }
  }
}
```

##### 5. Action Renderer (操作渲染器)

```typescript
{
  key: 'action',
  title: '操作',
  fixed: 'right',
  render: 'action',
  renderConfig: {
    buttons: [
      {
        label: '编辑',
        icon: 'i-carbon-edit',
        type: 'primary',
        secondary: true,
        onClick: (row) => handleEdit(row)
      },
      {
        label: '删除',
        icon: 'i-carbon-trash-can',
        type: 'error',
        secondary: true,
        onClick: (row) => handleDelete(row),
        // 条件显示
        show: (row) => row.canDelete,
        // 条件禁用
        disabled: (row) => row.isSystem,
        // 确认提示
        confirm: {
          title: '确认删除',
          content: '删除后无法恢复，确定要删除吗？'
        }
      }
    ],
    maxShow: 3,  // 最多显示按钮数，超出显示"更多"
    moreText: '更多'
  }
}
```

##### 6. Text Renderer (文本渲染器)

```typescript
{
  key: 'description',
  title: '描述',
  render: 'text',
  renderConfig: {
    emptyText: '-',
    strong: false,
    depth: 1,
    ellipsis: true,
    lineClamp: 2
  }
}
```

## Hooks API

### useTablePage

用于管理表格页面的状态和逻辑。

```typescript
const {
  data,              // 表格数据
  loading,           // 加载状态
  selectedKeys,      // 选中的行键
  pagination,        // 分页配置
  searchForm,        // 搜索表单
  getData,           // 获取数据
  refresh,           // 刷新数据（保持当前页）
  reload,            // 重新加载（回到第一页）
  updateSelectedKeys,// 更新选中行
  clearSelection,    // 清空选中
  hasSelection,      // 是否有选中行
  total              // 总数据量
} = useTablePage({
  apiFn: fetchDataList,        // API 函数
  searchConfig,                 // 搜索配置
  initialSearchParams: {},      // 初始搜索参数
  initialPagination: {          // 初始分页参数
    page: 1,
    pageSize: 10
  },
  immediate: true,              // 是否立即加载
  transformer: (response) => ({ // 数据转换器
    data: response.data.lists,
    total: response.data.meta.total
  })
});
```

### useSearchForm

用于管理搜索表单的状态。

```typescript
const {
  formModel,      // 表单模型
  formRef,        // 表单引用
  updateModel,    // 更新字段
  getValues,      // 获取表单值
  setValues,      // 设置表单值
  resetForm,      // 重置表单
  handleSearch,   // 处理搜索
  handleReset     // 处理重置
} = useSearchForm({
  config: searchConfig,
  initialValues: {},
  onSearch: (values) => console.log(values),
  onReset: () => console.log('reset')
});
```

## 完整示例

参考 `src/views/user-management/index-new.tsx` 查看完整的用户管理页面示例。

## 最佳实践

### 1. 使用 useTablePage Hook

推荐使用 `useTablePage` hook 来管理表格状态，它封装了常用的逻辑：

```typescript
const tablePageHook = useTablePage({
  apiFn: fetchUserList,
  searchConfig,
  immediate: true
});

const { data, loading, pagination, selectedKeys, refresh } = tablePageHook;
```

### 2. 配置化优先

尽量使用配置化的方式定义搜索字段、操作按钮和表格列，减少重复代码：

```typescript
// 好的做法
const searchConfig: SearchFieldConfig[] = [...];
const actionConfig: ActionBarConfig = {...};
const columns: TableColumnConfig[] = [...];

// 避免手写大量 JSX
```

### 3. 使用预设渲染器

优先使用预设渲染器，只在特殊情况下使用自定义渲染：

```typescript
// 好的做法
{
  key: 'status',
  render: 'status',
  renderConfig: { type: 'switch', onChange: handleToggle }
}

// 只在预设渲染器无法满足时使用自定义
{
  key: 'complex',
  render: (row) => <ComplexComponent data={row} />
}
```

### 4. 类型安全

充分利用 TypeScript 类型定义：

```typescript
type User = Api.UserManagement.User;

const columns: TableColumnConfig<User>[] = [
  // TypeScript 会提供类型提示和检查
];
```

### 5. 组件独立使用

子组件可以独立使用，适合需要自定义布局的场景：

```typescript
import { SearchBar, ActionBar, DataTable } from '@/components/table-page';

// 自定义布局
return () => (
  <div class="custom-layout">
    <SearchBar {...searchProps} />
    <ActionBar {...actionProps} />
    <DataTable {...tableProps} />
  </div>
);
```

## 注意事项

1. **分页参数格式**: 确保 API 函数接受 `{ page, limit, ...searchParams }` 格式的参数
2. **数据格式**: 默认期望 API 返回 `{ lists: [], meta: { total, page, limit } }` 格式，可通过 `transformer` 自定义
3. **行键**: 确保数据中有唯一的 `id` 字段，或通过 `rowKey` 指定其他字段
4. **图标**: 使用 UnoCSS 的图标类名（如 `i-carbon-*`）

## 更新日志

### v1.0.0 (2024-12-22)

- ✨ 初始版本发布
- 🎨 支持 7 种预设渲染器
- 📦 完整的 TypeScript 类型定义
- 🚀 开箱即用的 hooks
- 📱 响应式设计

