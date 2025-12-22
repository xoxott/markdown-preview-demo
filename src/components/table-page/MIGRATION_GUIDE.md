# 迁移指南

本指南将帮助你将现有的表格页面迁移到新的 TablePage 组件系统。

## 快速迁移步骤

### 步骤 1: 备份现有文件

在开始迁移之前，建议先备份现有文件：

```bash
# 例如：备份用户管理页面
cp src/views/user-management/index.tsx src/views/user-management/index.backup.tsx
```

### 步骤 2: 查看示例

参考已迁移的示例文件：
- `src/views/user-management/index-new.tsx` - 完整的用户管理页面示例
- `src/components/table-page/examples/BasicExample.tsx` - 基础使用示例

### 步骤 3: 替换现有文件

如果你想直接使用新版本的用户管理页面：

```bash
# 方式 1: 直接替换
mv src/views/user-management/index.tsx src/views/user-management/index.old.tsx
mv src/views/user-management/index-new.tsx src/views/user-management/index.tsx

# 方式 2: 手动复制内容
# 打开 index-new.tsx，复制内容到 index.tsx
```

### 步骤 4: 测试功能

启动开发服务器并测试所有功能：

```bash
npm run dev
```

测试清单：
- [ ] 搜索功能
- [ ] 筛选功能
- [ ] 分页功能
- [ ] 新增功能
- [ ] 编辑功能
- [ ] 删除功能
- [ ] 批量删除功能
- [ ] 状态切换功能
- [ ] 刷新功能

## 迁移对比

### 旧版本结构

```tsx
export default defineComponent({
  setup() {
    // 大量状态管理
    const selectedRowKeys = ref<number[]>([]);
    const searchForm = reactive({...});
    
    // 手写表格列
    function createColumns() {
      return [
        {
          key: 'username',
          render: (row) => (
            <div>
              {row.avatar ? <img src={row.avatar} /> : <div>...</div>}
              <span>{row.username}</span>
            </div>
          )
        },
        // ... 更多列
      ];
    }
    
    // 手写 JSX
    return () => (
      <NSpace vertical>
        <NCard>
          <NForm>...</NForm>
        </NCard>
        <NCard>
          <NSpace>
            <NButton>...</NButton>
          </NSpace>
        </NCard>
        <NCard>
          <NDataTable />
        </NCard>
      </NSpace>
    );
  }
});
```

### 新版本结构

```tsx
import { TablePage, useTablePage } from '@/components/table-page';

export default defineComponent({
  setup() {
    // 配置化定义
    const searchConfig: SearchFieldConfig[] = [...];
    const actionConfig: ActionBarConfig = {...};
    const columns: TableColumnConfig[] = [...];
    
    // 使用 hook 管理状态
    const { data, loading, pagination, selectedKeys, refresh, updateSelectedKeys } = useTablePage({
      apiFn: fetchUserList,
      searchConfig,
      immediate: true
    });
    
    // 简洁的 JSX
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

## 配置转换指南

### 1. 搜索栏配置

**旧版本**:
```tsx
<NFormItem path="search">
  <NInput
    v-model:value={searchForm.search}
    placeholder="搜索用户名或邮箱"
    clearable
  >
    {{
      prefix: () => <div class="i-carbon-search" />
    }}
  </NInput>
</NFormItem>
```

**新版本**:
```typescript
{
  type: 'input',
  field: 'search',
  placeholder: '搜索用户名或邮箱',
  icon: 'i-carbon-search',
  width: '220px'
}
```

### 2. 操作按钮配置

**旧版本**:
```tsx
<NButton type="primary" onClick={handleAdd}>
  <div class="flex items-center gap-4px">
    <div class="i-carbon-add" />
    <span>新增</span>
  </div>
</NButton>
```

**新版本**:
```typescript
{
  preset: {
    add: {
      show: true,
      onClick: handleAdd
    }
  }
}
```

### 3. 表格列配置

**旧版本**:
```tsx
{
  key: 'username',
  render: (row) => (
    <div class="flex items-center gap-6px">
      {row.avatar ? (
        <img src={row.avatar} class="w-28px h-28px rounded-full" />
      ) : (
        <div class="w-28px h-28px rounded-full bg-primary">
          {row.username.charAt(0).toUpperCase()}
        </div>
      )}
      <span>{row.username}</span>
    </div>
  )
}
```

**新版本**:
```typescript
{
  key: 'username',
  title: '用户名',
  width: 140,
  render: 'avatar',
  renderConfig: {
    avatarField: 'avatar',
    nameField: 'username'
  }
}
```

## 常见问题

### Q1: 如何保留自定义渲染逻辑？

A: 可以混合使用预设渲染器和自定义渲染：

```typescript
const columns: TableColumnConfig[] = [
  // 使用预设渲染器
  {
    key: 'status',
    render: 'status',
    renderConfig: { type: 'switch', onChange: handleToggle }
  },
  // 使用自定义渲染
  {
    key: 'custom',
    render: (row) => <CustomComponent data={row} />
  }
];
```

### Q2: 如何处理复杂的搜索逻辑？

A: 使用 `custom` 类型的搜索字段：

```typescript
{
  type: 'custom',
  field: 'complexSearch',
  render: (model, updateModel) => (
    <ComplexSearchComponent
      value={model.complexSearch}
      onChange={(value) => updateModel('complexSearch', value)}
    />
  )
}
```

### Q3: 如何自定义布局？

A: 可以独立使用子组件：

```typescript
import { SearchBar, ActionBar, DataTable } from '@/components/table-page';

return () => (
  <div class="custom-layout">
    <SearchBar {...searchProps} />
    <div class="my-custom-section">...</div>
    <ActionBar {...actionProps} />
    <DataTable {...tableProps} />
  </div>
);
```

### Q4: 如何处理 API 数据格式不一致？

A: 使用 `transformer` 自定义数据转换：

```typescript
const { data, loading, pagination } = useTablePage({
  apiFn: fetchDataList,
  transformer: (response) => ({
    data: response.items,  // 自定义数据字段
    total: response.count  // 自定义总数字段
  })
});
```

### Q5: 旧版本的功能是否都支持？

A: 是的，新版本完全兼容旧版本的所有功能，并提供了更多增强功能：

- ✅ 搜索和筛选
- ✅ 分页
- ✅ 批量操作
- ✅ 状态切换
- ✅ 自定义渲染
- ✅ 固定列
- ✅ 响应式设计
- ✅ 加载状态
- ✅ 空状态
- ✨ 预设渲染器（新增）
- ✨ 配置化（新增）
- ✨ Hooks 支持（新增）

## 回滚方案

如果迁移后发现问题，可以快速回滚：

```bash
# 恢复备份文件
mv src/views/user-management/index.backup.tsx src/views/user-management/index.tsx
```

## 获取帮助

- 查看 [README.md](./README.md) 了解完整 API 文档
- 查看 [BasicExample.tsx](./examples/BasicExample.tsx) 了解基础用法
- 查看 [index-new.tsx](../../views/user-management/index-new.tsx) 了解高级用法
- 查看 [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) 了解实现细节

## 迁移检查清单

完成迁移后，请检查以下项目：

- [ ] 所有搜索字段都已配置
- [ ] 所有操作按钮都已配置
- [ ] 所有表格列都已配置
- [ ] 预设渲染器使用正确
- [ ] 自定义渲染逻辑保留
- [ ] API 调用正常
- [ ] 分页功能正常
- [ ] 批量操作功能正常
- [ ] 没有 TypeScript 错误
- [ ] 没有 Linter 错误
- [ ] 所有功能测试通过
- [ ] UI 显示正常
- [ ] 响应式布局正常

## 性能对比

迁移后的性能提升：

| 指标 | 旧版本 | 新版本 | 提升 |
|------|--------|--------|------|
| 代码行数 | ~650 行 | ~300 行 | -54% |
| 组件复杂度 | 高 | 低 | ⬇️ |
| 可维护性 | 中 | 高 | ⬆️ |
| 开发效率 | 中 | 高 | ⬆️ |
| 类型安全 | 部分 | 完整 | ⬆️ |

## 下一步

迁移完成后，建议：

1. 删除备份文件（确认无问题后）
2. 迁移其他类似页面（角色管理、日志管理等）
3. 根据业务需求自定义渲染器
4. 分享给团队成员使用

祝迁移顺利！🎉

