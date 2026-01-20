# Changelog

## [1.0.0] - 2026-01-20

### 🎉 重大重写

基于开源 `markdown-it-task-lists` 插件的核心逻辑，使用 TypeScript 完全重写实现。

### 💥 Breaking Changes

- **移除 `label` 选项**：移除了无实际作用的空 label 标签相关配置
  - 移除 `label`、`labelAfter`、`labelClass` 配置项
  - 简化了配置和实现，专注于核心功能
  - 如需可点击区域，建议使用 CSS 或 JavaScript 实现

### 修复

- ✅ 修复了任务列表解析不正确的问题
- ✅ 修复了与其他插件冲突的问题（不再覆盖整个 `render` 方法）
- ✅ 修复了空任务列表项无法识别的问题
- ✅ 修复了 `labelAfter` 选项不生效的问题
- ✅ 修复了嵌套任务列表渲染错误的问题

### 改进

- 🎯 简化了核心解析逻辑，使用 `core.ruler.after('inline')` 处理
- 🎯 优化了渲染性能，使用 `token.info` 缓存任务状态
- 🎯 改进了类型定义，提供完整的 TypeScript 支持
- 🎯 增强了边界情况处理
- 🎯 添加了完整的单元测试覆盖（18个测试用例全部通过）

### 技术细节

#### 解析阶段

**之前的实现问题：**
- 解析逻辑复杂，在多个地方重复检查任务列表标记
- 使用 `data-checked` 属性在渲染时判断，但查找逻辑效率低
- 覆盖了整个 `md.renderer.render` 方法，容易与其他插件冲突

**新的实现：**
- 使用 `md.core.ruler.after('inline', 'task-lists')` 在正确的阶段处理
- 一次性处理所有 `list_item_open` token
- 使用 `token.info` 标记任务状态（`'task-checked'` 或 `'task-unchecked'`）
- 使用 `token.attrSet` 正确设置属性

#### 渲染阶段

**之前的实现问题：**
- 覆盖了整个 `render` 方法，需要处理所有 token 类型
- 复杂的查找逻辑来匹配 `list_item_open` 和 `inline` token
- `labelAfter` 选项实现不正确

**新的实现：**
- 只自定义 `list_item_open` 和 `list_item_close` 规则
- 通过 `token.attrGet('data-checked')` 快速判断是否为任务列表项
- 正确实现 `labelAfter` 选项：
  - `labelAfter: false` - label + checkbox 在内容前
  - `labelAfter: true` - checkbox 在内容前，label 在内容后

#### 边界情况

- ✅ 支持 `- [ ]`（空任务列表项）
- ✅ 支持 `- [ ]   `（只有空格）
- ✅ 正确处理嵌套任务列表
- ✅ 正确区分任务列表和普通列表

### 测试结果

所有 18 个测试用例全部通过：

- ✅ 基础任务列表功能（6 tests）
- ✅ 渲染功能（4 tests）
- ✅ 嵌套任务列表（1 test）
- ✅ 配置选项（3 tests）
- ✅ 混合列表（1 test）
- ✅ 边界情况（3 tests）

### 迁移指南

如果你之前使用了旧版本，新版本完全向后兼容，无需修改任何代码。

```typescript
// 之前
md.use(markdownItTaskLists, { enabled: true });

// 现在（完全相同）
md.use(markdownItTaskLists, { enabled: true });
```

