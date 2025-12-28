# 拖拽预览线条样式配置

## ✅ 功能说明

拖拽预览线条（草稿连接线）现在也支持样式配置，与已建立的连接线保持一致的视觉效果。

## 🎨 草稿线条特性

### 1. 应用配置的样式

草稿线条会应用以下配置：
- ✅ **线条类型**：贝塞尔曲线、直线、阶梯线、平滑阶梯线
- ✅ **线条颜色**：使用配置的颜色（如果未配置则使用默认渐变）
- ✅ **线条宽度**：使用配置的宽度（如果未配置则使用稍粗的默认宽度）
- ✅ **动画效果**：支持流动虚线动画

### 2. 草稿线条的特殊性

**默认行为（未配置颜色时）：**
- 使用紫色渐变（#667eea → #764ba2）
- 线条稍粗（3px）
- 视觉上与已建立的连接线有所区别

**配置颜色后：**
- 使用配置的颜色，不再使用渐变
- 与已建立的连接线保持一致
- 更好的"所见即所得"体验

### 3. 箭头处理

草稿线条**不显示箭头**：
- 草稿线条的终点跟随鼠标移动
- 不缩短线条长度
- 避免箭头在拖拽过程中造成视觉干扰

## 🔧 技术实现

### 传递样式到草稿线条

```typescript
// CanvasConnections.tsx
{props.connectionDraft && (
  <ConnectionLine 
    draft={props.connectionDraft}
    style={props.connectionLineStyle}  // 传递样式配置
  />
)}
```

### 颜色计算逻辑

```typescript
const strokeColor = computed(() => {
  if (props.draft) {
    // 草稿线条：使用配置的颜色或默认渐变
    return props.style?.color || 'url(#gradient-draft)';
  }
  if (props.selected) {
    return 'url(#gradient-selected)';
  }
  // 普通连接线：使用配置的颜色或默认颜色
  return props.style?.color || CONNECTION_LINE_CONFIG.DEFAULT_STROKE_COLOR;
});
```

### 宽度计算逻辑

```typescript
const strokeWidth = computed(() => {
  if (props.selected) {
    return CONNECTION_LINE_CONFIG.SELECTED_STROKE_WIDTH;
  }
  if (props.draft) {
    // 草稿线条：使用配置的宽度或稍粗的默认宽度
    return props.style?.width || CONNECTION_LINE_CONFIG.DRAFT_STROKE_WIDTH;
  }
  // 普通连接线：使用配置的宽度或默认宽度
  return props.style?.width || CONNECTION_LINE_CONFIG.DEFAULT_STROKE_WIDTH;
});
```

### 线条类型应用

```typescript
const pathData = computed(() => {
  // ... 获取起点和终点坐标 ...
  
  // 获取线条类型配置
  const lineType = props.style?.type || 'bezier';
  
  // 根据类型生成路径（草稿线条和普通连接线使用相同逻辑）
  switch (lineType) {
    case 'straight': return `M ${x1},${y1} L ${x2},${y2}`;
    case 'step': return `M ${x1},${y1} H ${midX} V ${y2} H ${x2}`;
    case 'smoothstep': return `M ${x1},${y1} H ... Q ... V ... Q ... H ${x2}`;
    case 'bezier': return `M ${x1},${y1} C ${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
  }
});
```

## 📊 视觉效果对比

### 未配置颜色（默认）

**草稿线条：**
- 颜色：紫色渐变
- 宽度：3px
- 类型：根据配置

**已建立连接线：**
- 颜色：灰色 (#94a3b8)
- 宽度：2px
- 类型：根据配置

### 配置颜色后

**草稿线条：**
- 颜色：配置的颜色
- 宽度：配置的宽度
- 类型：配置的类型

**已建立连接线：**
- 颜色：配置的颜色
- 宽度：配置的宽度
- 类型：配置的类型

**效果：** 草稿线条与已建立连接线完全一致，提供"所见即所得"的体验。

## 🎯 使用场景

### 场景 1：保持默认渐变效果

如果你希望草稿线条保持紫色渐变，以便与已建立的连接线区分：

```typescript
// 不配置颜色，或配置为 undefined
const connectionLineStyle = {
  type: 'bezier',
  color: undefined,  // 草稿线条使用默认渐变
  width: 2,
  animated: false,
  showArrow: true
};
```

### 场景 2：统一视觉效果

如果你希望草稿线条与已建立连接线完全一致：

```typescript
// 配置颜色
const connectionLineStyle = {
  type: 'bezier',
  color: '#3b82f6',  // 草稿线条和已建立连接线都使用蓝色
  width: 3,
  animated: true,
  showArrow: true
};
```

### 场景 3：不同线条类型预览

切换线条类型时，草稿线条会立即应用新类型：

```typescript
// 切换为直线
const connectionLineStyle = {
  type: 'straight',  // 草稿线条立即变为直线
  color: '#3b82f6',
  width: 2,
  animated: false,
  showArrow: true
};
```

## ✨ 优势

1. **一致性**：草稿线条与已建立连接线使用相同的配置
2. **预览准确**：拖拽时就能看到最终效果
3. **灵活性**：可以选择使用默认渐变或配置颜色
4. **实时响应**：修改配置后，正在拖拽的线条也会立即更新

## 🎉 总结

草稿线条（拖拽预览线条）现在完全支持样式配置：
- ✅ 线条类型实时应用
- ✅ 颜色可配置（默认使用渐变）
- ✅ 宽度可配置（默认稍粗）
- ✅ 动画效果支持
- ✅ 与已建立连接线保持一致

提供了更好的"所见即所得"体验！🚀

