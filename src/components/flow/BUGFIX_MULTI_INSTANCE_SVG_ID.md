# Bug 修复：多实例 SVG ID 冲突

## 🐛 问题描述

**现象**: 示例一的缩放操作影响了示例二的背景缩放

**原因**: 多个 `FlowCanvas` 实例的 `FlowBackground` 组件使用了相同的硬编码 SVG ID，导致 SVG 定义互相覆盖。

---

## 🔍 问题分析

### 问题根源

在 `FlowBackground.tsx` 中，所有网格图案使用了固定的 ID：

```tsx
// ❌ 问题代码：硬编码的 ID
<pattern id="flow-grid-dots">...</pattern>
<circle id="flow-grid-dot-shape">...</circle>
<use href="#flow-grid-dot-shape" />
```

当页面中有多个 `FlowCanvas` 实例时：
- **示例一**: `<pattern id="flow-grid-dots">` (zoom: 0.5)
- **示例二**: `<pattern id="flow-grid-dots">` (zoom: 1.0) ⚠️ **覆盖了示例一的定义**

结果：所有实例都使用最后一个定义的 pattern，导致缩放互相影响。

### 影响范围

所有使用固定 ID 的 SVG 元素：
- ✅ `flow-grid-dots` (网格点图案)
- ✅ `flow-grid-lines` (网格线图案)
- ✅ `flow-grid-cross` (十字网格图案)
- ✅ `flow-grid-dot-shape` (点形状定义)
- ✅ `flow-grid-line-v` (垂直线定义)
- ✅ `flow-grid-line-h` (水平线定义)
- ✅ `flow-grid-cross-v` (十字垂直线)
- ✅ `flow-grid-cross-h` (十字水平线)

---

## ✅ 解决方案

### 1. 添加 `instanceId` 属性

为 `FlowBackground` 添加 `instanceId` prop，用于生成唯一的 SVG ID：

```tsx
// FlowBackground.tsx
export interface FlowBackgroundProps {
  // ... 其他属性
  /** 实例 ID（用于生成唯一的 SVG ID） */
  instanceId?: string;
}
```

### 2. 生成唯一 ID 前缀

```tsx
setup(props) {
  // 生成唯一的 ID 前缀，避免多实例冲突
  const idPrefix = computed(() => `flow-grid-${props.instanceId}`);
  
  // ...
}
```

### 3. 使用动态 ID

```tsx
// ✅ 修复后：使用动态 ID
<pattern id={`${prefix}-dots`}>
  <use href={`#${prefix}-dot-shape`} />
</pattern>

<circle id={`${prefix}-dot-shape`} />

<rect fill={`url(#${prefix}-dots)`} />
```

### 4. 传递 instanceId

在 `FlowCanvas.tsx` 中传递实例 ID：

```tsx
<FlowBackground
  // ... 其他属性
  viewport={viewport.value}
  instanceId={props.id || 'default'}  // ✅ 传递实例 ID
/>
```

---

## 📊 修复效果

### 修复前

```html
<!-- 示例一 (id="basic-flow") -->
<svg>
  <defs>
    <pattern id="flow-grid-dots">...</pattern>
  </defs>
</svg>

<!-- 示例二 (id="example-canvas-1") -->
<svg>
  <defs>
    <pattern id="flow-grid-dots">...</pattern>  ⚠️ 覆盖了示例一
  </defs>
</svg>
```

### 修复后

```html
<!-- 示例一 (id="basic-flow") -->
<svg>
  <defs>
    <pattern id="flow-grid-basic-flow-dots">...</pattern>  ✅ 唯一 ID
  </defs>
</svg>

<!-- 示例二 (id="example-canvas-1") -->
<svg>
  <defs>
    <pattern id="flow-grid-example-canvas-1-dots">...</pattern>  ✅ 唯一 ID
  </defs>
</svg>
```

---

## 🎯 测试验证

### 测试场景

1. **多实例独立缩放**
   - 示例一缩放到 0.5x
   - 示例二保持 1.0x
   - ✅ 两个实例的背景网格互不影响

2. **不同网格类型**
   - 示例一使用 `dots` 网格
   - 示例二使用 `lines` 网格
   - ✅ 两个实例显示不同的网格类型

3. **动态切换**
   - 动态修改示例一的网格类型
   - ✅ 示例二不受影响

---

## 📁 修改的文件

### 1. FlowBackground.tsx

**变更**:
- ✅ 添加 `instanceId` prop
- ✅ 生成唯一 ID 前缀 `idPrefix`
- ✅ 所有 SVG ID 使用动态前缀

**代码片段**:
```tsx
// 添加 prop
instanceId: {
  type: String,
  default: 'default'
}

// 生成前缀
const idPrefix = computed(() => `flow-grid-${props.instanceId}`);

// 使用动态 ID
<pattern id={`${prefix}-dots`}>
  <use href={`#${prefix}-dot-shape`} />
</pattern>
```

### 2. FlowCanvas.tsx

**变更**:
- ✅ 传递 `instanceId` 给 `FlowBackground`

**代码片段**:
```tsx
<FlowBackground
  // ... 其他属性
  instanceId={props.id || 'default'}
/>
```

---

## 🚀 最佳实践

### 1. SVG ID 命名规范

为避免多实例冲突，所有 SVG ID 应该包含实例标识：

```tsx
// ✅ 好的做法：包含实例 ID
id={`${instanceId}-element-name`}

// ❌ 错误做法：硬编码 ID
id="element-name"
```

### 2. 其他可能需要修复的组件

检查以下组件是否也有类似问题：

- ✅ `FlowEdges.tsx` - 箭头标记 ID
  - `flow-arrow-marker-default`
  - `flow-arrow-marker-selected`
  - `flow-arrow-marker-hovered`
  - `flow-arrow-path-default`
  - `flow-arrow-path-selected`
  - `flow-arrow-path-hovered`

- ✅ `FlowMinimap.tsx` - 小地图节点形状 ID
  - `flow-minimap-node-shape`

**建议**: 为这些组件也添加 `instanceId` 支持。

---

## 📚 相关资源

- [MDN - SVG id Attribute](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/id)
- [SVG Patterns](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/pattern)
- [SVG use Element](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/use)

---

## 🎉 总结

通过为每个 `FlowCanvas` 实例生成唯一的 SVG ID 前缀，成功解决了多实例之间的 SVG 定义冲突问题。

**修复内容**:
- ✅ 添加 `instanceId` prop
- ✅ 动态生成唯一 ID
- ✅ 修复所有网格图案 ID
- ✅ 修复所有形状定义 ID

**测试结果**:
- ✅ 多实例独立缩放正常
- ✅ 不同网格类型互不影响
- ✅ 动态切换功能正常
- ✅ 无 linter 错误

现在可以在同一页面中使用多个 `FlowCanvas` 实例，互不干扰！🚀

