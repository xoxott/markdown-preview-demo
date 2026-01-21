# @suga/markdown-it-task-lists

基于开源 [markdown-it-task-lists](https://github.com/revin/markdown-it-task-lists) 的 TypeScript 实现。

## 特性

- ✅ 完整的 TypeScript 类型支持
- ✅ 支持未完成和已完成的任务列表项（`[ ]` 和 `[x]`/`[X]`）
- ✅ 支持嵌套任务列表
- ✅ 支持有序和无序列表
- ✅ 可自定义 CSS 类名
- ✅ 可配置 checkbox 是否可交互
- ✅ 支持空任务列表项（`- [ ]`）
- ✅ 兼容 markdown-it-render-vnode（自动转换为 VNode）
- ✅ 性能优化：合并重复遍历，减少 token 查找次数
- ✅ 完整的单元测试覆盖

## 安装

```bash
pnpm add @suga/markdown-it-task-lists
```

## 使用

### 基础用法

```typescript
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from '@suga/markdown-it-task-lists';

const md = new MarkdownIt();
md.use(markdownItTaskLists);

const html = md.render(`
- [ ] 未完成的任务
- [x] 已完成的任务
`);
```

### 启用交互式 checkbox

```typescript
const md = new MarkdownIt();
md.use(markdownItTaskLists, {
  enabled: true  // 启用可交互的 checkbox（默认 false，checkbox 为 disabled 状态）
});

const html = md.render(`
- [ ] 未完成的任务
- [x] 已完成的任务
`);
```

### 自定义 CSS 类名

```typescript
const md = new MarkdownIt();
md.use(markdownItTaskLists, {
  listClass: 'my-task-list',           // 自定义列表类名
  itemClass: 'my-task-item',           // 自定义列表项类名
  checkboxClass: 'my-checkbox'         // 自定义 checkbox 类名
});
```

## 配置选项

```typescript
interface TaskListOptions {
  /** 是否启用交互式复选框（默认 false，禁用时 checkbox 为 disabled 状态） */
  enabled?: boolean;

  /** 包含任务列表的 ul/ol 元素的类名（默认 'contains-task-list'） */
  listClass?: string;

  /** 任务列表项的 li 元素的类名（默认 'task-list-item'） */
  itemClass?: string;

  /** 复选框 input 元素的类名（默认 'task-list-item-checkbox'） */
  checkboxClass?: string;
}
```

## 默认配置

```typescript
{
  enabled: false,
  listClass: 'contains-task-list',
  itemClass: 'task-list-item',
  checkboxClass: 'task-list-item-checkbox'
}
```

## 渲染输出

### 输入 Markdown

```markdown
- [ ] 未完成的任务
- [x] 已完成的任务
```

### 输出 HTML（默认配置）

```html
<ul class="contains-task-list">
  <li class="task-list-item" data-checked="false">
    <input class="task-list-item-checkbox" type="checkbox" disabled>
    未完成的任务
  </li>
  <li class="task-list-item" data-checked="true">
    <input class="task-list-item-checkbox" type="checkbox" disabled checked>
    已完成的任务
  </li>
</ul>
```

### 输出 HTML（启用交互式 checkbox）

```typescript
md.use(markdownItTaskLists, { enabled: true });
```

```html
<ul class="contains-task-list">
  <li class="task-list-item" data-checked="false">
    <input class="task-list-item-checkbox" type="checkbox">
    未完成的任务
  </li>
  <li class="task-list-item" data-checked="true">
    <input class="task-list-item-checkbox" type="checkbox" checked>
    已完成的任务
  </li>
</ul>
```


## API 参考

### 主函数

```typescript
function markdownItTaskLists(md: MarkdownIt, userOptions?: TaskListOptions): void
```

注册任务列表插件到 markdown-it 实例。

**参数：**
- `md` - MarkdownIt 实例
- `userOptions` - 可选的配置选项（见 `TaskListOptions` 接口）

### 类型定义

#### TaskListOptions

```typescript
interface TaskListOptions {
  /** 是否启用交互式复选框（默认 false，禁用时 checkbox 为 disabled 状态） */
  enabled?: boolean;

  /** 包含任务列表的 ul/ol 元素的类名（默认 'contains-task-list'） */
  listClass?: string;

  /** 任务列表项的 li 元素的类名（默认 'task-list-item'） */
  itemClass?: string;

  /** 复选框 input 元素的类名（默认 'task-list-item-checkbox'） */
  checkboxClass?: string;
}
```

### 导出

```typescript
// 默认导出
import markdownItTaskLists from '@suga/markdown-it-task-lists';

// 类型导出
import type { TaskListOptions } from '@suga/markdown-it-task-lists';
```

## 实现细节

### 核心架构

1. **解析阶段**
   - 使用 `core.ruler.after('inline', 'task-lists')` 规则在正确的阶段处理任务列表
   - 在 `inline` 规则之后执行，确保所有文本 token 已经解析完成
   - 通过修改 token 流而不是覆盖渲染规则，确保与其他插件兼容

2. **处理流程**
   ```
   list_item_open → 检测任务标记 → 查找相关 token → 移除标记文本 → 插入 checkbox token → 标记父列表
   ```

3. **性能优化**
   - **合并查找逻辑**：`detectTaskListItem` 函数一次性查找所有需要的 token（`paragraph_open`、`inline`），避免多次遍历
   - **智能索引管理**：使用 `findTokensInListItem` 在限定范围内查找，找到第一个 `inline` token 后立即停止
   - **缓存任务状态**：使用 `token.info` 标记任务状态（`task-checked`/`task-unchecked`），避免重复检测
   - **提取工具函数**：`addClassName`、`removeTaskListMarker` 等函数复用，减少代码重复

4. **代码组织**
   - **常量定义**：`TOKEN_TYPES` 和 `TASK_INFO` 常量统一管理，避免魔法字符串
   - **接口定义**：`TokenSearchResult` 和 `TaskListItemResult` 接口提供类型安全
   - **函数分离**：将复杂逻辑拆分为 `detectTaskListItem`、`processTaskListItem` 等独立函数，职责单一

### 核心改进（相比原有实现）

1. **正确的解析逻辑**
   - 使用 `core.ruler.after('inline', 'task-lists')` 规则在正确的阶段处理任务列表
   - 准确识别任务列表标记并移除标记文本
   - 使用 `token.info` 标记任务状态，避免重复检测

2. **性能优化**
   - 合并重复的 token 查找逻辑，一次遍历获取所有信息
   - 提取 `findTokensInListItem` 函数，在限定范围内查找
   - 使用常量管理 token 类型和任务状态，避免字符串比较开销

3. **边界情况处理**
   - 支持空任务列表项（`- [ ]`）
   - 支持标记后只有空格的情况（`- [ ]   `）
   - 正确区分任务列表和普通列表
   - 支持嵌套任务列表

4. **类型安全**
   - 完整的 TypeScript 类型定义
   - 所有配置选项都有明确的类型
   - 与 markdown-it 的类型完全兼容
   - 内部接口定义提供更好的类型推断

5. **兼容性**
   - 通过插入 `html_inline` token 而非覆盖渲染规则，兼容 markdown-it-render-vnode
   - 不修改 markdown-it 的渲染器，避免与其他插件冲突

## 测试

```bash
# 运行测试
pnpm test

# 运行测试（一次性）
pnpm test:run
```

测试覆盖了以下场景：
- 基础任务列表功能（识别、渲染、类名）
- 嵌套任务列表
- 混合列表（任务列表 + 普通列表）
- 配置选项（自定义类名、enabled）
- 边界情况（空列表项、只有空格）
- 有序列表中的任务列表项
- 复杂嵌套结构

## 兼容性

### markdown-it-render-vnode

本插件通过插入 `html_inline` token 而非覆盖渲染规则，完全兼容 [markdown-it-render-vnode](https://github.com/xoxott/suga-tools/tree/main/packages/markdown-it-render-vnode)。

`html_inline` token 会被自动转换为对应的 VNode，可以在 React/Vue 等框架中使用：

```tsx
import { MarkdownPreview } from '@/components/markdown';

<MarkdownPreview content={`
- [ ] 未完成的任务
- [x] 已完成的任务
`} />
```

### 与其他插件

由于不覆盖 markdown-it 的渲染器，本插件与大多数 markdown-it 插件兼容，包括：
- markdown-it-multimd-table
- markdown-it-katex
- markdown-it-footnote
- 等

### 使用注意事项

1. **插件注册顺序**
   - 建议在其他修改渲染规则的插件之前注册
   - 必须在 `markdown-it-render-vnode` 之后注册（如果使用）

2. **CSS 样式**
   - 插件只生成 HTML 结构，不包含任何样式
   - 需要自行编写 CSS 样式来控制 checkbox 的外观
   - 可以基于默认的类名编写样式

3. **交互式 checkbox**
   - 默认情况下，checkbox 为 `disabled` 状态，仅用于显示
   - 启用 `enabled: true` 后，checkbox 可交互，但状态变化不会自动保存到 Markdown 源中
   - 如需保存状态，需要自行实现状态同步逻辑

## 常见问题

### Q: 如何自定义 checkbox 样式？

A: 基于默认的类名编写 CSS：

```css
.task-list-item-checkbox {
  /* 自定义样式 */
  margin-right: 0.5em;
  cursor: pointer;
}
```

### Q: 如何在 React/Vue 中使用？

A: 配合 `markdown-it-render-vnode` 使用，会自动转换为 VNode：

```tsx
// React
import { MarkdownPreview } from '@/components/markdown';

<MarkdownPreview content={markdown} />
```

### Q: 支持有序列表吗？

A: 支持。无论是无序列表（`-`）还是有序列表（`1.`），只要包含任务标记即可：

```markdown
1. [ ] 第一个任务
2. [x] 第二个任务
```

## 许可证

MIT

## 作者

yangtao <212920320@qq.com>

