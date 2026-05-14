# TablePage 通用表格页面组件

一套高度可配置、功能完善的表格页面组件系统，用于快速构建后台管理系统的列表页面。

## 架构说明

```
TablePage（页面容器）
├── 搜索区：SearchBar（配置驱动）或 search 插槽完全自定义
├── 操作区：ActionBar（配置驱动）或 action 插槽
└── 表格区：DataTable（列预设渲染 + tableProps 透传 NDataTable）
```

- **`useTablePage`**：在 **`@/hooks/common/table` 的 `useTable`** 之上增加 `searchBindings`、多选 `selectedKeys` 等与 `TablePage` 对齐的字段；列表请求、分页、`searchParams` 与项目其它管理页一致。
- **`useSearchForm`**：仅管理独立搜索 model；页面若已使用 `useTable`，可直接用其 **`searchParams`** 作为 SearchBar 的 model，通常不再需要本 hook。
- **受控 vs 非受控搜索**：列表页请使用受控（`searchBindings`），保证 URL/缓存与表单一致；演示页可只传 `searchConfig` 由 TablePage 内部托管。

## 搜索数据流（重要）

| 模式         | 条件                                                  | 行为                                                                                            |
| ------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 受控（推荐） | 传入 `searchModel`（及建议同时展开 `searchBindings`） | 表单读写走 `onUpdateSearchField`；搜索/重置走 `onSearch`、`onReset`（与 `useTablePage` 已对齐） |
| 非受控       | 仅 `searchConfig`，不传 `searchModel`                 | TablePage 内部 `useSearchForm` 托管；可通过 `@search` / `@reset` 或 `onSearch` / `onReset` 监听 |

事件：`TablePage` 会 `emit('search', snapshot)`、`emit('reset')`，便于埋点或与父层解耦。

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
import type {
  SearchFieldConfig,
  ActionBarConfig,
  TableColumnConfig
} from '@/components/table-page';

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

    // 使用 hook：务必解构 searchBindings 并展开到 TablePage，搜索与请求才会联动
    const { data, loading, pagination, selectedKeys, refresh, updateSelectedKeys, searchBindings } =
      useTablePage({
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
        {...searchBindings}
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

主组件：搜索卡片区 + 操作卡片区 + 表格卡片区。布局类 props（`padded`、`gapClass`、`showSearchCard` 等）用于适配不同后台壳层。

#### Props（核心）

| 属性                 | 类型                                  | 默认值       | 说明                                                                 |
| -------------------- | ------------------------------------- | ------------ | -------------------------------------------------------------------- |
| searchConfig         | `SearchFieldConfig[]`                 | -            | 搜索字段声明；与 `search` 插槽二选一或共存（插槽优先渲染整块）       |
| searchModel          | `Record<string, any>`                 | -            | 受控表单对象；与 `useTablePage().searchBindings` 一同传入            |
| onUpdateSearchField  | `(field, value) => void`              | -            | 受控字段更新；不传且存在 `searchModel` 时直接写字段（依赖 reactive） |
| initialSearchModel   | `Record<string, unknown>`             | -            | **仅非受控**内部表单初始值                                           |
| onSearch             | `(payload?) => void`                  | -            | 搜索提交；受控时通常绑定 `searchBindings.onSearch`                   |
| onReset              | `() => void`                          | -            | 重置；受控时绑定 `searchBindings.onReset`                            |
| actionConfig         | `ActionBarConfig`                     | -            | 工具条；可与 `action` 插槽组合（插槽优先）                           |
| columns              | `TableColumnConfig[]`                 | （必填）     | 列配置                                                               |
| data                 | `any[]`                               | （必填）     | 行数据                                                               |
| loading              | `boolean`                             | `false`      | 加载态                                                               |
| pagination           | `PaginationProps`                     | -            | 分页；与 naive `NDataTable` 一致                                     |
| selectedKeys         | `(string \| number)[]`                | `[]`         | 多选选中行                                                           |
| rowKey               | `string \| (row) => string \| number` | `'id'`       | 行主键                                                               |
| onUpdateSelectedKeys | `(keys) => void`                      | -            | 多选变更                                                             |
| scrollX              | `number`                              | -            | 横向滚动宽度                                                         |
| showIndex            | `boolean`                             | `true`       | 序号列                                                               |
| showSelection        | `boolean`                             | `true`       | 多选列                                                               |
| striped              | `boolean`                             | `true`       | 斑马纹                                                               |
| size                 | `'small' \| 'medium' \| 'large'`      | `'small'`    | 表格尺寸                                                             |
| bordered             | `boolean`                             | `false`      | 单元格边框                                                           |
| maxHeight            | `string \| number`                    | `'100%'`     | 表格 body 最大高度                                                   |
| class                | `string`                              | `''`         | 根容器额外 class                                                     |
| showSearchCard       | `boolean`                             | `true`       | 搜索区是否包 `NCard`                                                 |
| searchCardBordered   | `boolean`                             | `false`      | 搜索区 `NCard` bordered                                              |
| showActionCard       | `boolean`                             | `true`       | 操作区是否包 `NCard`                                                 |
| actionCardBordered   | `boolean`                             | `false`      | 操作区 `NCard` bordered                                              |
| padded               | `boolean`                             | `true`       | 根节点 `p-16px`                                                      |
| gapClass             | `string`                              | `'gap-16px'` | 根 flex 子项间距                                                     |
| tableProps           | `Partial<NaiveDataTableProps>`        | -            | 透传 `NDataTable`（如 `remote`、`flexHeight`、`rowProps`）           |

#### 事件

| 事件名 | 载荷                      | 说明                                        |
| ------ | ------------------------- | ------------------------------------------- |
| search | `Record<string, unknown>` | 当前筛选快照（受控为 `searchModel` 浅拷贝） |
| reset  | -                         | 表单已复位                                  |

#### 插槽

| 插槽名                     | 说明                                                                            |
| -------------------------- | ------------------------------------------------------------------------------- |
| search                     | 替换默认 `SearchBar` 卡片内容（仍包在 `NCard` 内，除非 `showSearchCard=false`） |
| action                     | 替换默认 `ActionBar`（可无 `actionConfig` 仅插槽）                              |
| tablePrepend / tableAppend | 表格卡片内、表格上下的附加内容                                                  |

### SearchBar

可独立使用。字段通过 `SearchFieldConfig` 声明；`toolbarBefore` / `toolbarAfter` / `actionsExtra` 插槽用于扩展布局。

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
  disabled?: boolean;
  /** 重置回退值，优先级低于 useSearchForm 的 initialValues[field] */
  defaultValue?: unknown;
  /** 透传给 NSelect / NInput / NDatePicker */
  componentProps?: Record<string, unknown>;
  render?: (model: any, updateModel: (field: string, value: any) => void) => VNode;
  label?: string;
  showLabel?: boolean;
}
```

#### 示例

```typescript
const searchConfig: SearchFieldConfig[] = [
  {
    type: 'input',
    field: 'keyword',
    placeholder: '搜索关键词',
    icon: 'i-carbon-search',
    width: '220px'
  },
  {
    type: 'select',
    field: 'status',
    placeholder: '选择状态',
    width: '130px',
    options: [
      { label: '全部', value: '' },
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 }
    ],
    componentProps: { filterable: true }
  },
  {
    type: 'date',
    field: 'date',
    placeholder: '选择日期',
    width: '180px'
  },
  {
    type: 'date-range',
    field: 'dateRange',
    placeholder: '选择日期范围',
    width: '240px'
  },
  {
    type: 'custom',
    field: 'custom',
    render: (model, updateModel) => (
      <NInput value={model.custom} onUpdateValue={(v) => updateModel('custom', v)} />
    )
  }
];
```

### useTablePage 补充

内部调用 **`useTable`（`@/hooks/common/table`）**，`searchBindings.searchModel` 与接口入参 **`searchParams`** 为同一 `reactive` 对象，筛选项字段名请与后端 `PaginationParams` 对齐。

| 字段                                   | 说明                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| searchBindings                         | `{ searchModel, onUpdateSearchField, onSearch, onReset }`，建议 `<TablePage {...searchBindings} searchConfig={...} />` |
| searchParams                           | 与 `useTable` 相同，即当前请求参数（含 `page`、`limit`）                                                               |
| updateSearchParams / resetSearchParams | 透传自 `useTable`，高级场景可手动合并参数后拉数                                                                        |
| columnChecks / reloadColumns 等        | 与 `useTable` 一致；TablePage 自带列配置时可忽略内部占位列                                                             |

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

基于 **`@/hooks/common/table` 的 `useTable`**，与现有管理页同一套分页与 ListData 解析；多选、`searchBindings` 为 TablePage 补齐。

```typescript
const {
  data,
  loading,
  selectedKeys,
  pagination,
  searchParams, // 与 searchBindings.searchModel 同一 reactive，即请求参数
  searchBindings,
  getData,
  refresh,
  reload,
  updateSelectedKeys,
  clearSelection,
  hasSelection,
  total,
  // 以下与 useTable 一致，按需使用
  empty,
  columnChecks,
  reloadColumns,
  mobilePagination,
  updatePagination,
  getDataByPage,
  updateSearchParams,
  resetSearchParams
} = useTablePage({
  apiFn: fetchUserList, // NaiveUI.TableApiFn
  apiParams: {
    /* 可选：除 page/limit 外默认参数 */
  },
  searchConfig,
  initialSearchParams: {},
  initialPagination: { page: 1, pageSize: 10 },
  immediate: true,
  showTotal: true
});
```

### useSearchForm

用于管理搜索表单的状态。

```typescript
const {
  formModel, // 表单模型
  formRef, // 表单引用
  updateModel, // 更新字段
  getValues, // 获取表单值
  setValues, // 设置表单值
  resetForm, // 重置表单
  handleSearch, // 处理搜索
  handleReset // 处理重置
} = useSearchForm({
  config: searchConfig,
  initialValues: {},
  onSearch: values => console.log(values),
  onReset: () => console.log('reset')
});
```

## 完整示例

参考 `src/views/user-management/index-new.tsx` 查看完整的用户管理页面示例。

## 最佳实践

### 1. 使用 useTablePage Hook

`useTablePage` 内部已是 **`useTable`**，与手写管理页时引入 `@/hooks/common/table` 的行为一致；搭配 TablePage 时务必展开 **`searchBindings`**。

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
