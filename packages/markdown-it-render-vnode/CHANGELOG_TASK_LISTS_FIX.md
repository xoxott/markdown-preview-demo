# 任务列表支持修复 - 2026-01-20

## 问题描述

任务列表的 checkbox (`<input type="checkbox">`) 被 XSS 安全过滤器过滤掉了，导致任务列表无法正常显示。

### 根本原因

1. `markdown-it-task-lists` 插件使用 `html_inline` token 来渲染 checkbox
2. `markdown-it-render-vnode` 的安全过滤器将 `input` 标签列在 `DANGEROUS_TAGS` 中
3. 安全模式下，所有 `input` 标签都会被移除，包括安全的 `type="checkbox" disabled` 的 checkbox

## 修复方案

### 1. 修改 `constants.ts`

从 `DANGEROUS_TAGS` 中移除 `input`，改为在渲染时特殊处理。

```typescript
// 之前：input 在 DANGEROUS_TAGS 中
export const DANGEROUS_TAGS: ReadonlySet<string> = new Set([
  ...,
  'input',  // ← 这会导致所有 input 被过滤
  ...
]);

// 修复后：移除 input，改为特殊处理
export const DANGEROUS_TAGS: ReadonlySet<string> = new Set([
  ...,
  // 'input', // input 需要特殊处理，在 utils.ts 中检查类型
  ...
]);
```

### 2. 修改 `utils.ts` 中的 `sanitizeHtml` 函数

添加对安全 checkbox input 的特殊处理：

```typescript
// 特殊处理 input 标签：只保留安全的 checkbox（disabled 且 type="checkbox"）
sanitized = sanitized.replace(/<input\b([^>]*)>/gi, (match, attrs) => {
  const isCheckbox = /type\s*=\s*["']?checkbox["']?/i.test(attrs);
  const isDisabled = /disabled\b/i.test(attrs);

  // 只保留 disabled 的 checkbox input
  if (isCheckbox && isDisabled) {
    return match;
  }

  // 其他 input 标签都移除
  return '';
});
```

### 3. 修改 `utils.ts` 中的 `createHtmlVNode` 函数

添加对 input 标签的运行时检查：

```typescript
// 特殊处理：允许安全的 input checkbox（用于任务列表）
if (safeMode && tagName === 'input') {
  const inputType = attrs.type?.toLowerCase();
  const isDisabled = attrs.disabled !== undefined;
  const isCheckbox = inputType === 'checkbox';

  // 只允许 disabled 的 checkbox input
  if (!isCheckbox || !isDisabled) {
    continue;
  }
}
```

## 安全性说明

### 为什么这个修复是安全的？

1. **严格的类型检查**：只允许 `type="checkbox"` 的 input
2. **强制 disabled**：只允许 `disabled` 属性的 checkbox，防止用户交互
3. **双重过滤**：
   - 在 HTML 字符串解析时过滤（`sanitizeHtml`）
   - 在 DOM 元素创建时再次检查（`createHtmlVNode`）
4. **不影响其他 input**：所有其他类型的 input（text, password, file 等）仍然会被过滤

### 允许的 HTML

```html
<!-- ✅ 允许：disabled checkbox -->
<input type="checkbox" class="task-list-item-checkbox" disabled>
<input type="checkbox" class="task-list-item-checkbox" disabled checked>

<!-- ❌ 禁止：可交互的 checkbox -->
<input type="checkbox">

<!-- ❌ 禁止：其他类型的 input -->
<input type="text">
<input type="password">
<input type="file">
```

## 测试结果

### markdown-it-render-vnode 测试

```bash
✓ packages/markdown-it-render-vnode/src/__tests__/index.test.ts (29 tests)
✓ packages/markdown-it-render-vnode/src/__tests__/xss-security.test.ts (51 tests)

Test Files  2 passed (2)
Tests  80 passed (80)
```

### markdown-it-task-lists 测试

```bash
✓ packages/markdown-it-task-lists/src/__tests__/index.test.ts (18 tests)
  ✓ 基础任务列表功能 (6)
  ✓ 渲染功能 (4)
  ✓ 嵌套任务列表 (1)
  ✓ 配置选项 (3)
  ✓ 混合列表 (1)
  ✓ 边界情况 (3)

Test Files  1 passed (1)
Tests  18 passed (18)
```

## 影响范围

- ✅ 任务列表现在可以正常显示 checkbox
- ✅ 所有现有的 XSS 安全测试仍然通过
- ✅ 不影响其他功能
- ✅ 保持了安全性（只允许 disabled checkbox）

## 相关文件

- `packages/markdown-it-render-vnode/src/constants.ts` - 危险标签列表
- `packages/markdown-it-render-vnode/src/utils.ts` - HTML 安全过滤
- `packages/markdown-it-task-lists/src/index.ts` - 任务列表插件

