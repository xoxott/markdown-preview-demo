# TablePage 通用表格页面

配置驱动的「检索 + 工具条 + 表格」三栏布局，用于后台列表页。子组件可单独使用，也可由 `TablePage` 组合。

## 架构

```
TablePage
├── 检索区：SearchBar（DeclarativeForm 栅格）或 search 插槽
├── 操作区：ActionBar 或 action 插槽
└── 表格区：DataTable（列预设渲染 + tableProps 透传 NDataTable）
```

| 模块                | 说明                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `useTablePage`      | 基于 `@/hooks/common/table` 的 `useTable`，提供 `searchBindings`、多选等与 TablePage 对齐的字段 |
| `useAdminListTable` | 已有 `listUiConfig` 的管理页：内部 `useTable` + 统一 `onSearch` / `onReset`                     |
| `useSearchForm`     | 仅托管独立搜索 model；列表页已用 `useTable` 时通常直接用 `searchParams`                         |
| `DeclarativeForm`   | SearchBar 底层；`layout="grid"` + `suffixPlacement="below-grid"`                                |

## 检索区（栅格布局）

SearchBar 对齐 [Pro Naive 查询表单](https://naive.soybeanjs.cn/pro-naive/form/query) 的栅格检索形态：

- **筛选项**：`NForm` → `NGrid` → `NGi` + `NFormItem`，列数由 `cols` 控制（默认 `1 s:2 m:3 l:4`，大屏 4 列）。
- **操作区**：重置 → 搜索 → 展开/收起，**独占下一整行**（span = `cols`），右对齐；不使用 `NGi suffix`，避免窄屏压住前一格。
- **收起**：`useGridFormCollapse` 按 span 裁剪 `fields`（无动画）；操作区在栅格外始终完整展示。
- **展开按钮**：仅当字段总 span 大于 `cols × collapsedRows` 且 `collapsible=true` 时显示。

```
┌─────────┬─────────┬─────────┐  宽屏 3 列示例
│ 字段 1  │ 字段 2  │ 字段 3  │
├─────────┴─────────┴─────────┤
│              [重置][搜索][展开] │  操作区独占一行
└─────────────────────────────┘
```

字段占列：`span` 可显式指定；`date-range` 在栅格下默认占 **2** 列（见 `resolveFieldSpan`）。

**宽度**：配置里的 `width`（如 `220px`）只在行内 `inline` 布局生效。栅格检索强制 `width: 100%` + `min-width: 0`，避免控件最小宽度大于栅格列宽时顶开相邻格或与操作区重叠。操作区独占一行时，极窄视口下按钮组允许换行。

### TablePage 检索相关 Props

| 属性                                | 默认            | 说明                                                   |
| ----------------------------------- | --------------- | ------------------------------------------------------ |
| `searchCollapsible`                 | `false`         | 是否可展开/收起                                        |
| `searchCols`                        | `1 s:2 m:3 l:4` | 栅格列数或响应式字符串                                 |
| `searchGridXGap` / `searchGridYGap` | `24` / `0`      | 栅格间距                                               |
| `searchGridResponsive`              | `screen`        | `screen` 随视口；`self` 随检索区容器（嵌套窄卡片时用） |
| `searchCollapsedRows`               | `1`             | 收起时保留的**行数**（按 span 累计）                   |
| `searchDefaultCollapsed`            | `false`         | 初始是否收起                                           |

### SearchBar 独立使用

```tsx
import SearchBar, { DEFAULT_GRID_COLS } from '@/components/table-page';

<SearchBar
  config={searchConfig}
  model={formModel}
  onUpdateModel={updateField}
  onSearch={handleSearch}
  onReset={handleReset}
  cols={DEFAULT_GRID_COLS}
  collapsible
  collapsedRows={1}
  defaultCollapsed
/>;
```

| 属性                                          | 默认                    | 说明                      |
| --------------------------------------------- | ----------------------- | ------------------------- |
| `cols`                                        | `1 s:2 m:3 l:4`         | 同 TablePage `searchCols` |
| `gridXGap` / `gridYGap`                       | `24` / `0`              | 栅格间距                  |
| `gridResponsive`                              | `screen`                | 响应式断点策略            |
| `collapsible`                                 | `false`                 | 可折叠                    |
| `collapsedRows`                               | `1`                     | 收起保留行数              |
| `defaultCollapsed`                            | `false`                 | 初始收起                  |
| `showActionButtons`                           | `true`                  | 是否显示搜索/重置         |
| `labelPlacement` / `labelWidth` / `showLabel` | `left` / `80` / `false` | 表单项标签                |

**插槽**：`toolbarBefore`、`toolbarAfter`、`actionsExtra`（追加在操作按钮后）。

**演示**：`src/views/component/examples/TablePageSearchExample.tsx`（少量字段 / 多字段可折叠 / TablePage 集成 / 独立 SearchBar）。

## 搜索数据流

| 模式         | 条件                             | 行为                                                            |
| ------------ | -------------------------------- | --------------------------------------------------------------- |
| 受控（推荐） | `searchModel` + `searchBindings` | 字段走 `onUpdateSearchField`；搜索/重置走 `onSearch`、`onReset` |
| 非受控       | 仅 `searchConfig`                | TablePage 内部 `useSearchForm` 托管                             |

`useTablePage` 务必展开 **`searchBindings`**：`searchModel` 与接口入参 `searchParams` 为同一 `reactive` 对象。

```tsx
const { data, loading, pagination, selectedKeys, searchBindings, updateSelectedKeys } =
  useTablePage({ apiFn: fetchList, searchConfig, immediate: true });

return () => (
  <TablePage
    {...searchBindings}
    searchConfig={searchConfig}
    searchCollapsible
    searchDefaultCollapsed
    columns={columns}
    data={data.value}
    loading={loading.value}
    pagination={pagination}
    selectedKeys={selectedKeys.value}
    onUpdateSelectedKeys={updateSelectedKeys}
  />
);
```

## 目录结构

```
src/components/table-page/
├── TablePage.tsx
├── SearchBar.tsx
├── SearchFormSuffix.tsx
├── hooks/                         # useTablePage、useSearchForm 等
├── ActionBar.tsx
├── DataTable.tsx
├── types.ts
├── index.ts
├── hooks/
│   ├── useTablePage.ts
│   └── useSearchForm.ts
├── renderers/                     # 列预设渲染
├── examples/BasicExample.tsx
└── README.md                      # 本文档
```

## 快速开始

```tsx
import { TablePage, useTablePage } from '@/components/table-page';
import type {
  SearchFieldConfig,
  ActionBarConfig,
  TableColumnConfig
} from '@/components/table-page';

const searchConfig: SearchFieldConfig[] = [
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
      { label: '启用', value: true },
      { label: '禁用', value: false }
    ]
  }
];

const { data, loading, pagination, selectedKeys, searchBindings, updateSelectedKeys } =
  useTablePage({
    apiFn: fetchDataList,
    searchConfig,
    immediate: true
  });

const actionConfig: ActionBarConfig = {
  preset: {
    add: { show: true, onClick: handleAdd },
    batchDelete: { show: true, onClick: handleBatchDelete },
    refresh: { show: true, onClick: refresh }
  }
};

const columns: TableColumnConfig[] = [
  {
    key: 'username',
    title: '用户名',
    width: 140,
    render: 'avatar',
    renderConfig: { avatarField: 'avatar', nameField: 'username' }
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

// <TablePage {...searchBindings} searchConfig={...} actionConfig={...} columns={...} ... />
```

## TablePage API（核心 Props）

| 属性                                                           | 说明                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `searchConfig`                                                 | 搜索字段；与 `search` 插槽二选一（插槽优先整块替换） |
| `searchModel` / `onUpdateSearchField` / `onSearch` / `onReset` | 受控检索                                             |
| `initialSearchModel`                                           | 仅非受控初始值                                       |
| `actionConfig`                                                 | 工具条                                               |
| `columns` / `data` / `loading` / `pagination`                  | 表格                                                 |
| `selectedKeys` / `onUpdateSelectedKeys` / `rowKey`             | 多选                                                 |
| `showSearchCard` / `searchCardBordered`                        | 检索区卡片                                           |
| `showActionCard` / `actionCardBordered`                        | 操作区卡片                                           |
| `tableProps`                                                   | 透传 `NDataTable`（`remote`、`flexHeight` 等）       |
| `padded` / `gapClass` / `class`                                | 根布局                                               |

**事件**：`search`（当前筛选快照）、`reset`。

**插槽**：`search`、`action`、`tablePrepend`、`tableAppend`。

## SearchFieldConfig

与 `DeclarativeFieldConfig`（`@/components/declarative-form`）相同：

```typescript
interface SearchFieldConfig {
  type: 'input' | 'select' | 'date' | 'date-range' | 'custom';
  field: string;
  placeholder?: string;
  icon?: string;
  width?: string;
  span?: number; // 栅格占列，date-range 默认 2
  options?: Array<{ label: string; value: any }>;
  clearable?: boolean;
  disabled?: boolean;
  defaultValue?: unknown;
  componentProps?: Record<string, unknown>;
  render?: (model, updateModel) => VNode;
  label?: string;
  showLabel?: boolean;
}
```

## ActionBar

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

## DataTable 预设渲染器

| 类型 | `render` | 典型用途                                   |
| ---- | -------- | ------------------------------------------ |
| 头像 | `avatar` | 头像 + 名称                                |
| 状态 | `status` | `switch` / `tag`                           |
| 日期 | `date`   | `datetime` / `date` / `relative` / `smart` |
| 标签 | `tag`    | `simple` / `badge` / `popover`             |
| 操作 | `action` | 行内按钮、确认、更多                       |
| 文本 | `text`   | 省略、空值                                 |

配置字段见 `types.ts` 与各 `renderers/*.tsx`；复杂列仍可用 `render: (row) => VNode`。

## Hooks

### useTablePage

```typescript
const {
  data,
  loading,
  pagination,
  selectedKeys,
  searchParams,
  searchBindings,
  refresh,
  updateSelectedKeys
} = useTablePage({
  apiFn,
  searchConfig,
  apiParams: {},
  initialSearchParams: {},
  immediate: true
});
```

### useSearchForm

独立表单托管：`formModel`、`updateModel`、`resetForm`、`handleSearch`、`handleReset`。

## 从旧页面迁移

1. 备份原 `index.tsx`，对照 `examples/BasicExample.tsx` 或业务页。
2. 搜索区：手写 `NFormItem` → `SearchFieldConfig[]`；列表页加 `searchCollapsible` 等栅格 props（可选）。
3. 操作区：手写按钮 → `actionConfig.preset` / `custom`。
4. 表格列：内联 `render` → 预设 `render` + `renderConfig`（可混用自定义 `render`）。
5. 状态：`useTable` / 手写分页 → `useTablePage` + `<TablePage {...searchBindings} />`。
6. API：在 `apiFn` 内适配为项目约定的 `ListData`（`lists` + `meta`），勿依赖已移除的 Hook 层 transformer。

**检查清单**：检索/重置、分页、增删改、批量、列渲染、TS 无报错、窄屏检索区无按钮重叠。

## 最佳实践

1. 列表页始终 **受控** + 展开 `searchBindings`。
2. 配置化优先：搜索、工具条、列集中声明。
3. 多字段检索开启 `searchCollapsible`；字段多时用 `searchDefaultCollapsed`。
4. 检索区嵌在窄侧栏/抽屉时传 `searchGridResponsive="self"`。
5. 需要 3 列大屏：`searchCols="1 s:2 l:3"`。
6. 子组件可拆：`SearchBar` + `ActionBar` + `DataTable` 自定义布局。

## 常见问题

**Q：收起后操作按钮不见了？**  
A：操作区始终渲染；仅筛选项被裁剪。确认 `showActionButtons` 未关。

**Q：窄屏字段与按钮重叠？**  
A：多为筛选项配置了固定 `width` 或 Naive 控件默认 `min-width: auto`。栅格检索已忽略字段 `width` 并打通 `min-width: 0` 收缩链；操作区独占一行。若仍异常，检查 `componentProps.style.width` 或外层 `overflow`。

**Q：API 字段名与表单不一致？**  
A：在 `onSearch` 或请求前映射；`searchParams` 键名需与后端入参一致。

**Q：如何完全自定义检索区？**  
A：使用 TablePage 的 `search` 插槽，或 `showSearchCard={false}` 自行包卡片。

## 更新日志

### 检索栅格（当前）

- SearchBar 栅格布局，操作区独占一行；`useGridFormCollapse` 字段级收起。
- 默认 `cols: 1 s:2 m:3 l:4`，`gridResponsive: screen`。
- 移除 `defaultExpanded`、`collapsedRowHeightPx`、`gridActionSpan` 等冗余 API。

### v1.0.0

- TablePage + 7 种列预设渲染器 + `useTablePage` / `useSearchForm`。
