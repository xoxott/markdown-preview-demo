# Markdown 样式说明

## 任务列表样式 (task-list.scss)

### 功能特性

✨ **美观的 checkbox 样式**
- 自定义 checkbox 外观，替换浏览器默认样式
- 圆角边框，现代化设计
- 平滑的过渡动画

🎨 **交互效果**
- 悬停时 checkbox 放大 1.05 倍
- 选中时带有弹出动画效果
- 聚焦时显示蓝色阴影

✅ **选中状态**
- 蓝色背景 (#3b82f6)
- 白色对勾图标
- 已完成任务文本带删除线和半透明效果

🌙 **暗色主题支持**
- 自动适配暗色模式
- checkbox 和悬停效果调整
- 文本颜色自适应

📱 **响应式设计**
- 移动端 checkbox 尺寸调整为 16px
- 列表项间距优化
- 触摸友好的点击区域

🖨️ **打印样式**
- 简化的黑白 checkbox
- 适合打印输出

### 样式变量

```scss
$checkbox-size: 18px;                    // checkbox 尺寸
$checkbox-border-radius: 4px;            // 圆角大小
$checkbox-border-color: #d1d5db;         // 边框颜色（未选中）
$checkbox-bg-checked: #3b82f6;           // 背景颜色（选中）
$list-item-hover-bg: #f9fafb;            // 列表项悬停背景
```

### 类名说明

| 类名 | 说明 |
|-----|------|
| `.contains-task-list` | 包含任务列表的 ul/ol 容器 |
| `.task-list-item` | 任务列表项 (li) |
| `.task-list-item-checkbox` | checkbox 输入框 |
| `.markdown-body-dark` | 暗色主题容器 |

### 状态说明

#### 未完成任务
```html
<li class="task-list-item" data-checked="false">
  <input type="checkbox" class="task-list-item-checkbox" disabled>
  任务文本
</li>
```
- checkbox 为空，白色背景
- 文本正常显示

#### 已完成任务
```html
<li class="task-list-item" data-checked="true">
  <input type="checkbox" class="task-list-item-checkbox" disabled checked>
  任务文本
</li>
```
- checkbox 蓝色背景，白色对勾
- 文本带删除线，半透明 (opacity: 0.7)

### 自定义样式

如果需要自定义样式，可以覆盖以下 CSS 变量或类：

```scss
// 自定义 checkbox 颜色
.task-list-item-checkbox:checked {
  background-color: #10b981; // 绿色
  border-color: #10b981;
}

// 自定义已完成任务样式
.task-list-item[data-checked="true"] {
  > p,
  > * {
    color: #059669;
    text-decoration: underline;
  }
}

// 自定义悬停效果
.task-list-item:hover {
  background-color: #e0f2fe;
  border-left: 3px solid #3b82f6;
}
```

### 浏览器兼容性

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

使用了现代 CSS 特性：
- `appearance: none` - 移除默认样式
- CSS 动画
- CSS 变量（暗色主题）
- Flexbox 布局

### 性能说明

- 使用 CSS transform 而非 width/height 进行动画，性能更好
- 过渡时间 0.2s，流畅不卡顿
- 动画使用 GPU 加速

### 使用示例

```tsx
import './styles/task-list.scss';

// 组件中使用
<MarkdownPreview content={`
- [ ] 未完成任务
- [x] 已完成任务
`} />
```

### 效果预览

参考 `test-task-lists-styled.md` 文件查看完整的样式效果。

