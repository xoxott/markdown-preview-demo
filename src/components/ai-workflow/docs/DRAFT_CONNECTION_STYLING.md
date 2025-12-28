# 拖拽预览线条样式配置

## ✅ 功能说明

拖拽预览线条（草稿连接线）现在支持**独立的样式配置**，可以与已建立的连接线使用不同的颜色和宽度，也可以保持一致。

## 🎨 草稿线条特性

### 1. 独立配置的样式

草稿线条支持以下**独立配置**：
- ✅ **预览线条颜色（draftColor）**：独立配置草稿线条的颜色
  - 配置后：使用配置的颜色
  - 未配置：使用默认紫色渐变（#667eea → #764ba2）
- ✅ **预览线条宽度（draftWidth）**：独立配置草稿线条的宽度
  - 配置后：使用配置的宽度
  - 未配置：使用默认宽度（3px）

### 2. 共享配置的样式

草稿线条会应用以下**共享配置**：
- ✅ **线条类型**：贝塞尔曲线、直线、阶梯线、平滑阶梯线
- ✅ **动画效果**：支持流动虚线动画

### 3. 配置灵活性

**场景 1：保持视觉区分（默认）**
- 草稿线条：紫色渐变，3px 宽
- 已建立连接线：灰色，2px 宽
- 用户可以清楚区分"正在拖拽"和"已建立"的连接

**场景 2：统一视觉效果**
- 配置 `draftColor` 与 `color` 相同
- 配置 `draftWidth` 与 `width` 相同
- 提供"所见即所得"的体验

**场景 3：自定义草稿样式**
- 配置独特的 `draftColor`（如亮蓝色）
- 配置更粗的 `draftWidth`（如 5px）
- 让拖拽过程更加醒目

### 4. 箭头处理

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
    // 草稿线条：优先使用草稿颜色配置，其次使用默认渐变
    return props.style?.draftColor || 'url(#gradient-draft)';
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
    // 草稿线条：优先使用草稿宽度配置，其次使用默认宽度
    return props.style?.draftWidth || CONNECTION_LINE_CONFIG.DRAFT_STROKE_WIDTH;
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

## 📊 配置选项

### 类型定义

```typescript
interface ConnectionLineStyle {
  type: ConnectionLineType;        // 线条类型
  color: string;                   // 已建立连接线的颜色
  width: number;                   // 已建立连接线的宽度
  animated: boolean;               // 动画效果
  showArrow: boolean;              // 显示箭头
  draftColor?: string;             // 草稿线条颜色（可选）
  draftWidth?: number;             // 草稿线条宽度（可选）
}
```

### 默认值

```typescript
{
  type: 'bezier',
  color: '#94a3b8',      // 已建立连接线：灰色
  width: 2,              // 已建立连接线：2px
  animated: false,
  showArrow: true,
  draftColor: undefined, // 草稿线条：紫色渐变（默认）
  draftWidth: undefined  // 草稿线条：3px（默认）
}
```

## 🎯 使用场景

### 场景 1：保持默认效果（视觉区分）

草稿线条使用紫色渐变，与已建立连接线有明显区分：

```typescript
const connectionLineStyle = {
  type: 'bezier',
  color: '#94a3b8',      // 已建立：灰色
  width: 2,              // 已建立：2px
  animated: false,
  showArrow: true,
  draftColor: undefined, // 草稿：紫色渐变（默认）
  draftWidth: undefined  // 草稿：3px（默认）
};
```

### 场景 2：统一视觉效果

草稿线条与已建立连接线完全一致：

```typescript
const connectionLineStyle = {
  type: 'bezier',
  color: '#3b82f6',      // 已建立：蓝色
  width: 3,              // 已建立：3px
  animated: true,
  showArrow: true,
  draftColor: '#3b82f6', // 草稿：蓝色（与已建立一致）
  draftWidth: 3          // 草稿：3px（与已建立一致）
};
```

### 场景 3：自定义草稿样式

草稿线条使用醒目的颜色和更粗的线条：

```typescript
const connectionLineStyle = {
  type: 'bezier',
  color: '#94a3b8',      // 已建立：灰色
  width: 2,              // 已建立：2px
  animated: false,
  showArrow: true,
  draftColor: '#10b981', // 草稿：绿色（醒目）
  draftWidth: 5          // 草稿：5px（更粗）
};
```

### 场景 4：清空草稿配置

在设置对话框中清空草稿配置，恢复默认效果：

1. 打开"连接线设置"对话框
2. 在"预览线条颜色"中点击清空按钮
3. 将"预览线条宽度"滑块移到最左侧（会自动清空）
4. 点击"保存"

## 🎨 UI 配置界面

在"连接线设置"对话框中，新增了以下配置项：

### 拖拽预览线条（独立区域）

1. **预览线条颜色**
   - 颜色选择器
   - 支持清空（恢复默认渐变）
   - 提示文本："默认使用渐变色"

2. **预览线条宽度**
   - 滑块控件（1-10px）
   - 标记：1px、5px、10px
   - 可清空（恢复默认 3px）

## ✨ 优势

1. **独立配置**：草稿线条和已建立连接线可以使用不同样式
2. **视觉区分**：默认情况下，草稿线条使用渐变色，易于识别
3. **灵活性**：可以选择统一样式或差异化样式
4. **实时预览**：修改配置后，正在拖拽的线条也会立即更新
5. **易于重置**：支持清空配置，恢复默认效果

## 🎉 总结

草稿线条（拖拽预览线条）现在支持**独立的样式配置**：
- ✅ **独立颜色配置**（draftColor）- 可与已建立连接线不同
- ✅ **独立宽度配置**（draftWidth）- 可与已建立连接线不同
- ✅ **共享线条类型** - 保持一致的形状
- ✅ **共享动画效果** - 保持一致的动态效果
- ✅ **UI 友好** - 清晰的分组和可清空的控件

提供了更灵活的配置选项和更好的用户体验！🚀

