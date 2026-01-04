# Flow 主题系统

## 概述

Flow 组件库提供了完整的主题系统，支持 `light`、`dark` 和 `auto` 三种主题模式，并且允许用户通过 SCSS 变量自定义主题。

## 文件结构

```
styles/
├── variables.scss          # 主题变量定义（CSS 变量）
├── themes/                 # 主题文件
│   ├── light.scss         # 浅色主题
│   ├── dark.scss          # 深色主题
│   ├── auto.scss          # 自动主题（跟随系统）
│   └── index.scss         # 主题入口文件
├── index.scss             # 样式入口文件
└── README.md             # 本文档
```

## 使用方法

### 1. 基础使用

在你的项目中导入 Flow 样式：

```scss
// 在你的主样式文件中
@import '~@/components/flow/styles/index.scss';
```

### 2. 使用主题 Hook

在 Vue 组件中使用主题管理：

```typescript
import { useFlowTheme } from '@/components/flow/hooks/useFlowTheme';

const { theme, setTheme, toggleTheme, isDark } = useFlowTheme({
  initialTheme: 'auto',
  persist: true // 持久化到 localStorage
});

// 切换主题
setTheme('dark');
toggleTheme();
```

### 3. 自定义主题

#### 方式一：覆盖 CSS 变量

在你的样式文件中覆盖 CSS 变量：

```scss
:root {
  --flow-node-bg: #f5f5f5;
  --flow-node-border: #e0e0e0;
  --flow-node-text: #333333;
  // ... 更多变量
}
```

#### 方式二：覆盖 SCSS 变量

创建自定义主题文件：

```scss
// custom-theme.scss
@import '~@/components/flow/styles/variables';

// 覆盖变量
$flow-node-bg: #f5f5f5;
$flow-node-border: #e0e0e0;
$flow-node-text: #333333;

// 导入基础样式
@import '~@/components/flow/styles/index';
```

#### 方式三：创建自定义主题文件

创建 `styles/themes/custom.scss`：

```scss
@import '../variables';

:root[data-flow-theme='custom'] {
  --flow-node-bg: #f5f5f5;
  --flow-node-border: #e0e0e0;
  --flow-node-text: #333333;
  // ... 更多变量
}
```

然后在代码中设置主题：

```typescript
setTheme('custom');
```

## 可用变量

### 节点相关

- `--flow-node-bg`: 节点背景色
- `--flow-node-border`: 节点边框色
- `--flow-node-border-selected`: 选中节点边框色
- `--flow-node-border-hover`: 悬停节点边框色
- `--flow-node-text`: 节点文字颜色
- `--flow-node-text-secondary`: 节点次要文字颜色

### 端口相关

- `--flow-handle-bg`: 端口背景色
- `--flow-handle-border-source`: 输出端口边框色
- `--flow-handle-border-target`: 输入端口边框色

### 连接线相关

- `--flow-edge-default`: 默认连接线颜色
- `--flow-edge-selected`: 选中连接线颜色
- `--flow-edge-hovered`: 悬停连接线颜色
- `--flow-edge-label`: 连接线标签颜色

### 网格背景相关

- `--flow-grid-color`: 网格颜色
- `--flow-grid-opacity`: 网格透明度
- `--flow-background-color`: 背景颜色

### 尺寸变量

- `--flow-node-border-radius`: 节点圆角
- `--flow-node-padding`: 节点内边距
- `--flow-handle-width`: 端口宽度
- `--flow-handle-height`: 端口高度
- `--flow-edge-stroke-width-base`: 连接线基础宽度

更多变量请查看 `variables.scss` 文件。

## 主题切换

### 在组件中切换

```typescript
import { useFlowTheme } from '@/components/flow/hooks/useFlowTheme';

const { setTheme } = useFlowTheme();

// 设置为深色主题
setTheme('dark');

// 设置为浅色主题
setTheme('light');

// 设置为自动主题（跟随系统）
setTheme('auto');
```

### 在配置中设置

```typescript
import { useFlowConfig } from '@/components/flow/hooks/useFlowConfig';

const { updateConfig } = useFlowConfig();

updateConfig({
  theme: {
    mode: 'dark'
  }
});
```

## 最佳实践

1. **使用 CSS 变量**：优先使用 CSS 变量覆盖，这样可以在运行时动态切换主题
2. **持久化主题**：使用 `persist: true` 选项保存用户主题偏好
3. **自定义主题**：创建独立的主题文件，而不是直接修改默认主题
4. **变量命名**：遵循 `--flow-{component}-{property}` 的命名规范

## 示例

完整示例请查看 `examples/` 目录下的示例文件。

