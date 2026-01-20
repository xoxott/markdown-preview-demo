# markdown-it-task-lists 实现说明

## 概述

本实现是基于开源 [revin/markdown-it-task-lists](https://github.com/revin/markdown-it-task-lists) 插件的 TypeScript 重写版本。由于原版插件不支持 TypeScript，且存在一些实现问题，我们重新实现了一个完全类型安全、功能正确的版本。

## 原有实现的问题

### 1. 架构问题

- **覆盖了整个 `render` 方法**：导致与其他插件可能冲突，维护困难
- **多处重复查找逻辑**：效率低，代码冗余
- **解析和渲染逻辑混乱**：没有清晰的职责分离

### 2. 功能问题

- **空任务列表项识别失败**：正则表达式 `/^\[([ xX])\]\s+/` 要求至少一个空格
- **labelAfter 选项实现错误**：label 和 checkbox 的位置关系不正确
- **嵌套列表处理不当**：复杂嵌套场景下可能出错

### 3. 类型安全问题

- 缺少完整的 TypeScript 类型定义
- 大量使用 `any` 类型
- 没有类型守卫

## 新实现的核心设计

### 1. 两阶段处理模型

```
Markdown 源码
    ↓
[解析阶段] md.core.ruler.after('inline', 'task-lists')
    • 识别任务列表标记
    • 移除标记文本
    • 标记 token（info + attrs）
    • 标记父列表
    ↓
Token 树（带有任务列表标记）
    ↓
[渲染阶段] md.renderer.rules.*
    • list_item_open: 渲染 <li> + checkbox + label
    • list_item_close: 渲染 labelAfter 的 label
    ↓
HTML 输出
```

### 2. 核心函数

#### 解析阶段：`taskListsRule`

```typescript
function taskListsRule(state: StateCore, options: Required<TaskListOptions>): boolean {
  const tokens = state.tokens;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type !== 'list_item_open') {
      continue;
    }

    const { isTask, checked } = isTaskListItem(tokens, i);

    if (!isTask) {
      continue;
    }

    // 1. 添加类名
    token.attrSet('class', options.itemClass);

    // 2. 添加 data-checked 属性
    token.attrSet('data-checked', checked ? 'true' : 'false');

    // 3. 标记 token.info（用于快速判断）
    token.info = checked ? 'task-checked' : 'task-unchecked';

    // 4. 移除标记文本
    removeTaskListMarker(tokens[i+1]);

    // 5. 标记父列表
    markParentAsTaskList(tokens, i, options.listClass);
  }

  return false;
}
```

#### 渲染阶段：自定义规则

```typescript
// 渲染 list_item_open
md.renderer.rules.list_item_open = function(tokens, idx, opts, env, self) {
  const token = tokens[idx];
  const dataChecked = token.attrGet('data-checked');

  // 不是任务列表项，使用默认渲染
  if (dataChecked === null) {
    return defaultListItemOpenRenderer(tokens, idx, opts, env, self);
  }

  // 渲染 <li> + checkbox + label（可选）
  let result = self.renderToken(tokens, idx, opts);
  const checked = dataChecked === 'true';

  if (!options.labelAfter) {
    result += renderLabel(options) + renderCheckbox(checked, options);
  } else {
    result += renderCheckbox(checked, options);
  }

  return result;
};

// 渲染 list_item_close（处理 labelAfter）
md.renderer.rules.list_item_close = function(tokens, idx, opts, env, self) {
  // 查找对应的 list_item_open
  const listItemToken = findMatchingListItemOpen(tokens, idx);

  if (listItemToken && listItemToken.attrGet('data-checked') !== null && options.labelAfter) {
    return renderLabel(options) + self.renderToken(tokens, idx, opts);
  }

  return defaultListItemCloseRenderer(tokens, idx, opts, env, self);
};
```

### 3. 关键优化

#### 性能优化

- **使用 `token.info` 缓存状态**：避免重复解析
- **一次遍历完成所有处理**：不需要多次扫描 token 数组
- **快速属性查找**：使用 `attrGet` 而非遍历

#### 代码质量

- **职责分离**：解析和渲染完全分离
- **函数单一职责**：每个函数只做一件事
- **避免副作用**：纯函数设计
- **类型安全**：完整的 TypeScript 类型定义

## 正则表达式说明

```typescript
const TASK_LIST_ITEM_REGEX = /^\[([ xX])\]\s*/;
```

- `^` - 匹配字符串开头
- `\[` - 匹配左方括号（转义）
- `([ xX])` - 捕获组：匹配空格、x 或 X
- `\]` - 匹配右方括号（转义）
- `\s*` - 匹配 0 个或多个空白字符（**关键**：支持空任务列表项）

**为什么使用 `\s*` 而不是 `\s+`？**

- `\s+` 要求至少一个空格，导致 `- [ ]` 无法识别
- `\s*` 允许 0 个或多个空格，支持以下所有格式：
  - `- [ ]` - 空任务列表
  - `- [ ]   ` - 只有空格
  - `- [ ] 任务` - 正常任务列表

## labelAfter 选项详解

### labelAfter: false（默认）

```html
<li class="task-list-item">
  <label class="task-list-item-label"></label>
  <input type="checkbox" class="task-list-item-checkbox">
  任务内容
</li>
```

渲染时机：
1. `list_item_open` 渲染：`<li>` + `<label>` + `<input>`
2. 内容渲染：`任务内容`
3. `list_item_close` 渲染：`</li>`

### labelAfter: true

```html
<li class="task-list-item">
  <input type="checkbox" class="task-list-item-checkbox">
  任务内容
  <label class="task-list-item-label"></label>
</li>
```

渲染时机：
1. `list_item_open` 渲染：`<li>` + `<input>`
2. 内容渲染：`任务内容`
3. `list_item_close` 渲染：`<label>` + `</li>`

## 测试覆盖

### 测试矩阵

| 测试类别 | 测试数量 | 状态 |
|---------|---------|------|
| 基础功能 | 6 | ✅ 全部通过 |
| 渲染功能 | 4 | ✅ 全部通过 |
| 嵌套列表 | 1 | ✅ 全部通过 |
| 配置选项 | 3 | ✅ 全部通过 |
| 混合列表 | 1 | ✅ 全部通过 |
| 边界情况 | 3 | ✅ 全部通过 |
| **总计** | **18** | **✅ 全部通过** |

### 关键测试用例

1. **空任务列表项**
   ```markdown
   - [ ]
   - [ ]
   ```
   确保正则表达式正确处理

2. **labelAfter 选项**
   ```typescript
   const html = md.render('- [ ] 任务');
   const labelIndex = html.indexOf('<label');
   const contentIndex = html.indexOf('任务');
   expect(labelIndex).toBeGreaterThan(contentIndex);
   ```
   确保 label 在内容后面

3. **嵌套任务列表**
   ```markdown
   - [ ] 父任务
     - [x] 子任务 1
     - [ ] 子任务 2
   ```
   确保嵌套结构正确

## 与原版对比

| 特性 | 原版 | 新版 |
|-----|------|------|
| TypeScript 支持 | ❌ 无 | ✅ 完整支持 |
| 空任务列表项 | ❌ 不支持 | ✅ 支持 |
| labelAfter 选项 | ❌ 实现错误 | ✅ 正确实现 |
| 插件兼容性 | ⚠️ 可能冲突 | ✅ 良好兼容 |
| 代码可维护性 | ⚠️ 复杂 | ✅ 清晰 |
| 测试覆盖 | ❌ 无 | ✅ 18 个测试 |
| 性能 | ⚠️ 一般 | ✅ 优化 |

## 最佳实践

### 1. 基础使用

```typescript
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from '@suga/markdown-it-task-lists';

const md = new MarkdownIt();
md.use(markdownItTaskLists);
```

### 2. 自定义样式

```typescript
md.use(markdownItTaskLists, {
  listClass: 'my-task-list',
  itemClass: 'my-task-item',
  checkboxClass: 'my-checkbox'
});
```

### 3. 可交互的 checkbox

```typescript
md.use(markdownItTaskLists, {
  enabled: true  // 移除 disabled 属性
});
```

### 4. 自定义布局

```typescript
// label 在内容后面
md.use(markdownItTaskLists, {
  labelAfter: true
});

// 不使用 label
md.use(markdownItTaskLists, {
  label: false
});
```

## 未来改进方向

1. **行号支持**：添加 `data-line` 属性，便于源码定位
2. **回调函数**：支持自定义 checkbox 点击行为
3. **国际化**：支持自定义 aria-label
4. **样式预设**：提供常见 UI 框架的样式预设

## 参考资料

- [markdown-it 官方文档](https://markdown-it.github.io/)
- [revin/markdown-it-task-lists](https://github.com/revin/markdown-it-task-lists)
- [GFM Task Lists Spec](https://github.github.com/gfm/#task-list-items-extension-)

