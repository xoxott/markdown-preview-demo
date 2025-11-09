# 弹窗系统文档

## 📋 概述

文件管理器的通用可拖拽弹窗系统,基于 Naive UI 组件二次封装,提供优雅的 API 和完整的功能支持。

## 🎯 特性

- ✅ **可拖拽**: 支持拖拽标题栏移动弹窗
- ✅ **可调整大小**: 支持拖拽边缘调整弹窗尺寸(可选)
- ✅ **主题兼容**: 完美适配 Naive UI 暗色/亮色主题
- ✅ **键盘支持**: ESC 关闭、Enter 确认
- ✅ **动画效果**: 平滑的打开/关闭动画
- ✅ **命令式 API**: 简洁易用的调用方式
- ✅ **类型安全**: 完整的 TypeScript 类型支持

## 📦 组件结构

```
dialogs/
├── BaseDialog.tsx              # 基础可拖拽弹窗组件
├── BaseDialog.module.scss      # 弹窗样式
├── RenameDialog.tsx            # 重命名对话框
├── ConfirmDialog.tsx           # 确认对话框
└── README.md                   # 本文档

hooks/
└── useDialog.ts                # 弹窗管理 Hook

types/
└── dialog.ts                   # 类型定义
```

## 🚀 快速开始

### 1. 在组件中使用

```typescript
import { useDialog } from '../hooks/useDialog'

export default defineComponent({
  setup() {
    const dialog = useDialog()

    const handleRename = () => {
      dialog.rename({
        title: '重命名文件',
        defaultValue: 'file.txt',
        onConfirm: async (newName) => {
          console.log('新名称:', newName)
        }
      })
    }

    return { handleRename }
  }
})
```

### 2. 通过 provide/inject 使用

```typescript
// 在父组件中 provide
const dialog = useDialog()
provide('FILE_DIALOG', dialog)

// 在子组件中 inject
const dialog = inject<UseDialogReturn>('FILE_DIALOG')
dialog?.rename({ ... })
```

## 📖 API 文档

### useDialog()

弹窗管理 Hook,返回弹窗管理器对象。

#### 返回值

```typescript
interface DialogManager {
  rename: (config: RenameDialogConfig) => DialogInstance
  confirm: (config: ConfirmDialogConfig) => DialogInstance
  info: (content: string, title?: string) => DialogInstance
  success: (content: string, title?: string) => DialogInstance
  warning: (content: string, title?: string) => DialogInstance
  error: (content: string, title?: string) => DialogInstance
  confirmDelete: (itemName: string, onConfirm: () => void) => DialogInstance
}
```

### 重命名对话框

```typescript
dialog.rename({
  title: '重命名',                    // 标题
  defaultValue: 'file.txt',          // 默认值
  placeholder: '请输入新名称',        // 占位符
  validator: (value) => {            // 验证器
    if (!value.trim()) return '名称不能为空'
    return true
  },
  onConfirm: async (newName) => {   // 确认回调
    await renameFile(newName)
  },
  onCancel: () => {                  // 取消回调(可选)
    console.log('取消重命名')
  }
})
```

### 确认对话框

```typescript
dialog.confirm({
  title: '确认删除',                 // 标题
  content: '确定要删除这个文件吗?',   // 内容(支持 VNode)
  type: 'warning',                   // 类型: info/success/warning/error
  confirmText: '删除',               // 确认按钮文字
  cancelText: '取消',                // 取消按钮文字
  showCancel: true,                  // 是否显示取消按钮
  onConfirm: async () => {          // 确认回调
    await deleteFile()
  },
  onCancel: () => {                  // 取消回调(可选)
    console.log('取消删除')
  }
})
```

### 快捷方法

```typescript
// 信息提示
dialog.info('这是一条信息', '信息')

// 成功提示
dialog.success('操作成功!', '成功')

// 警告提示
dialog.warning('请注意!', '警告')

// 错误提示
dialog.error('操作失败!', '错误')

// 删除确认
dialog.confirmDelete('file.txt', async () => {
  await deleteFile()
})
```

## 🎨 BaseDialog 组件

基础可拖拽弹窗组件,所有对话框的基础。

### Props

```typescript
interface BaseDialogProps {
  show: boolean                    // 是否显示
  title?: string                   // 标题
  width?: number | string          // 宽度
  height?: number | string         // 高度
  minWidth?: number                // 最小宽度
  minHeight?: number               // 最小高度
  maxWidth?: number                // 最大宽度
  maxHeight?: number               // 最大高度
  draggable?: boolean              // 是否可拖拽(默认 true)
  resizable?: boolean              // 是否可调整大小(默认 false)
  maskClosable?: boolean           // 点击遮罩是否关闭(默认 true)
  showClose?: boolean              // 是否显示关闭按钮(默认 true)
  closeOnEsc?: boolean             // ESC键是否关闭(默认 true)
  position?: 'center' | { x, y }   // 弹窗位置
  zIndex?: number                  // 层级
  onClose?: () => void             // 关闭回调
}
```

### Slots

```typescript
{
  header?: () => VNode    // 自定义标题栏
  default?: () => VNode   // 内容区域
  footer?: () => VNode    // 底部操作区
}
```

### 使用示例

```tsx
<BaseDialog
  show={show.value}
  title="自定义弹窗"
  width={600}
  draggable={true}
  resizable={true}
  onClose={handleClose}
>
  {{
    default: () => <div>弹窗内容</div>,
    footer: () => (
      <NSpace justify="end">
        <NButton onClick={handleClose}>取消</NButton>
        <NButton type="primary" onClick={handleConfirm}>确定</NButton>
      </NSpace>
    )
  }}
</BaseDialog>
```

## 🎯 集成到文件操作

弹窗系统已集成到 `useFileOperations` Hook 中:

```typescript
// 在 useFileExplorerLogic 中
const dialog = useDialog()
const fileOperations = useFileOperations(selectedFiles, {
  ...operationsConfig,
  dialog  // 传入 dialog
})

// 现在文件操作会自动显示弹窗
fileOperations.startRename()    // 显示重命名对话框
fileOperations.deleteFiles()    // 显示删除确认对话框
fileOperations.createFolder()   // 显示新建文件夹对话框
```

## 🎨 样式定制

弹窗样式完全基于 Naive UI 主题,会自动适配暗色/亮色模式。

### 自定义样式

```scss
// 通过 class prop 添加自定义类
<BaseDialog class="my-custom-dialog">
  ...
</BaseDialog>

// 在 SCSS 中定义样式
.my-custom-dialog {
  :global(.n-card) {
    border-radius: 12px;
  }
}
```

## 📝 最佳实践

### 1. 异步操作处理

```typescript
dialog.confirm({
  title: '确认操作',
  content: '这将花费一些时间',
  onConfirm: async () => {
    // 显示加载状态
    setLoading(true)
    try {
      await longRunningOperation()
    } finally {
      setLoading(false)
    }
  }
})
```

### 2. 表单验证

```typescript
dialog.rename({
  defaultValue: 'file.txt',
  validator: (value) => {
    if (!value.trim()) return '名称不能为空'
    if (!/^[\w\-.]+$/.test(value)) return '名称包含非法字符'
    if (value.length > 255) return '名称过长'
    return true
  },
  onConfirm: async (newName) => {
    await renameFile(newName)
  }
})
```

### 3. 错误处理

```typescript
dialog.confirm({
  title: '删除文件',
  content: '确定要删除吗?',
  onConfirm: async () => {
    try {
      await deleteFile()
      message.success('删除成功')
    } catch (error) {
      message.error(`删除失败: ${error.message}`)
    }
  }
})
```

## 🔧 高级功能

### 1. 可调整大小的弹窗

```typescript
<BaseDialog
  show={show.value}
  width={800}
  height={600}
  resizable={true}  // 启用调整大小
  minWidth={400}
  minHeight={300}
  maxWidth={1200}
  maxHeight={900}
>
  ...
</BaseDialog>
```

### 2. 自定义位置

```typescript
<BaseDialog
  show={show.value}
  position={{ x: 100, y: 100 }}  // 固定位置
>
  ...
</BaseDialog>
```

### 3. 多弹窗管理

弹窗系统自动管理多个弹窗的层级(z-index),后打开的弹窗会显示在最上层。

```typescript
// 可以同时打开多个弹窗
dialog.info('第一个弹窗')
dialog.warning('第二个弹窗')  // 会显示在第一个之上
```

## 🐛 故障排除

### 弹窗无法拖拽

- 确保 `draggable` prop 为 `true`
- 检查是否有其他元素遮挡标题栏

### 弹窗位置不正确

- 确保父容器没有 `transform` 样式
- 检查是否有全局 CSS 影响定位

### 主题不适配

- 确保使用了 `useThemeVars` 获取主题变量
- 检查是否正确使用了 Naive UI 的主题系统

## 📚 相关文档

- [Naive UI Modal 组件](https://www.naiveui.com/zh-CN/os-theme/components/modal)
- [Vue 3 Composition API](https://vuejs.org/api/composition-api-setup.html)
- [TypeScript 类型定义](../types/dialog.ts)

## 🎉 测试

访问文件管理器右侧的"弹窗测试面板"来测试所有弹窗功能:

- 基础对话框(重命名、确认)
- 消息对话框(信息、成功、警告、错误)
- 特殊对话框(删除确认、可拖拽)
- 文件操作集成测试

## 📝 更新日志

### v1.0.0 (2025-01-09)

- ✅ 实现 BaseDialog 基础组件
- ✅ 实现 RenameDialog 重命名对话框
- ✅ 实现 ConfirmDialog 确认对话框
- ✅ 实现 useDialog Hook
- ✅ 集成到文件操作系统
- ✅ 添加拖拽功能
- ✅ 添加调整大小功能
- ✅ 完整的主题支持
- ✅ 完整的类型定义

