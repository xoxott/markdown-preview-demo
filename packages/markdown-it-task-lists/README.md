# @suga/markdown-it-task-lists

基于开源 [markdown-it-task-lists](https://github.com/revin/markdown-it-task-lists) 的 TypeScript 实现。

## 特性

- ✅ 完整的 TypeScript 类型支持
- ✅ 支持未完成和已完成的任务列表项（`[ ]` 和 `[x]`/`[X]`）
- ✅ 支持嵌套任务列表
- ✅ 支持有序和无序列表
- ✅ 可自定义 CSS 类名
- ✅ 可配置 checkbox 是否可交互
- ✅ 可配置 label 包装和位置
- ✅ 支持空任务列表项（`- [ ]`）
- ✅ 完整的单元测试覆盖

## 安装

```bash
pnpm add @suga/markdown-it-task-lists
```

## 使用

```typescript
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from '@suga/markdown-it-task-lists';

const md = new MarkdownIt();
md.use(markdownItTaskLists, {
  enabled: true,  // 启用可交互的 checkbox
  label: true,    // 使用 label 包装
  labelAfter: false  // label 在 checkbox 前面
});

const html = md.render(`
- [ ] 未完成的任务
- [x] 已完成的任务
`);
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


## 实现细节

### 核心改进（相比原有实现）

1. **正确的解析逻辑**
   - 使用 `core.ruler.after('inline', 'task-lists')` 规则在正确的阶段处理任务列表
   - 准确识别任务列表标记并移除标记文本
   - 使用 `token.info` 标记任务状态，提高性能

2. **简化的渲染逻辑**
   - 自定义 `list_item_open` 和 `list_item_close` 渲染规则
   - 不覆盖整个 `render` 方法，避免与其他插件冲突
   - 正确处理 `labelAfter` 选项

3. **边界情况处理**
   - 支持空任务列表项（`- [ ]`）
   - 支持标记后只有空格的情况（`- [ ]   `）
   - 正确区分任务列表和普通列表
   - 支持嵌套任务列表

4. **类型安全**
   - 完整的 TypeScript 类型定义
   - 所有配置选项都有明确的类型
   - 与 markdown-it 的类型完全兼容

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
- 配置选项（自定义类名、labelAfter、enabled）
- 边界情况（空列表项、只有空格）

## 许可证

MIT

## 作者

yangtao <212920320@qq.com>

