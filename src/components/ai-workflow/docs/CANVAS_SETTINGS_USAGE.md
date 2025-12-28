# 画布设置功能使用指南

## 概述

画布设置功能允许用户自定义连接线样式和背景网格，提供更灵活的视觉体验。

## 新增文件

### 1. 类型定义
- `src/components/ai-workflow/types/canvas-settings.ts` - 设置相关的类型定义

### 2. 对话框组件
- `src/components/ai-workflow/dialogs/ConnectionLineSettingsDialog.tsx` - 连接线设置对话框
- `src/components/ai-workflow/dialogs/BackgroundSettingsDialog.tsx` - 背景设置对话框

### 3. Hook
- `src/components/ai-workflow/hooks/useCanvasSettings.ts` - 设置管理 Hook

## 在 WorkflowCanvas 中集成

```tsx
import { ref } from 'vue';
import { useCanvasSettings } from '../hooks/useCanvasSettings';
import ConnectionLineSettingsDialog from '../dialogs/ConnectionLineSettingsDialog';
import BackgroundSettingsDialog from '../dialogs/BackgroundSettingsDialog';

export default defineComponent({
  setup() {
    // 使用设置 Hook
    const {
      connectionLineStyle,
      backgroundSettings,
      updateConnectionLineStyle,
      updateBackgroundSettings
    } = useCanvasSettings();

    // 对话框显示状态
    const showConnectionLineDialog = ref(false);
    const showBackgroundDialog = ref(false);

    return () => (
      <div>
        {/* 工具栏 */}
        <CanvasToolbar
          onConnectionLineSettings={() => showConnectionLineDialog.value = true}
          onBackgroundSettings={() => showBackgroundDialog.value = true}
          // ... 其他 props
        />

        {/* 连接线设置对话框 */}
        <ConnectionLineSettingsDialog
          show={showConnectionLineDialog.value}
          settings={connectionLineStyle.value}
          onUpdate={updateConnectionLineStyle}
          onClose={() => showConnectionLineDialog.value = false}
        />

        {/* 背景设置对话框 */}
        <BackgroundSettingsDialog
          show={showBackgroundDialog.value}
          settings={backgroundSettings.value}
          onUpdate={updateBackgroundSettings}
          onClose={() => showBackgroundDialog.value = false}
        />
      </div>
    );
  }
});
```

## 功能说明

### 连接线设置

**可配置项：**
- **线条类型**：贝塞尔曲线、直线、阶梯线、平滑阶梯线
- **线条颜色**：支持颜色选择器
- **线条宽度**：1-10px
- **动画效果**：开启/关闭动画

### 背景设置

**可配置项：**
- **显示网格**：开启/关闭网格显示
- **网格类型**：点状、线状、十字
- **网格大小**：10-50px
- **网格颜色**：支持颜色选择器
- **背景颜色**：支持颜色选择器

## 默认值

```typescript
{
  connectionLine: {
    type: 'bezier',
    color: '#94a3b8',
    width: 2,
    animated: false
  },
  background: {
    showGrid: true,
    gridType: 'dots',
    gridSize: 20,
    gridColor: '#e5e7eb',
    backgroundColor: '#ffffff'
  }
}
```

## 工具栏按钮

- **连接线设置按钮**：图标 `mdi:vector-line`
- **背景设置按钮**：图标 `mdi:palette-outline`

两个按钮都位于工具栏右侧，视图控制按钮组之后。

