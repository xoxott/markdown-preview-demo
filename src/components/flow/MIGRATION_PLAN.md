# Flow 架构重构迁移计划

## 📋 概述

将 hooks 中的核心逻辑迁移到 `core/interaction`，实现清晰的架构分层：
- **core/interaction**: 核心交互逻辑（框架无关）
- **hooks**: Vue 响应式封装层（薄封装）

## 🎯 目标架构

```
core/interaction/          # 核心逻辑层（框架无关）
├── FlowDragHandler       # 拖拽核心逻辑（整合 RAF、增量模式等）
├── FlowConnectionHandler # 连接创建核心逻辑
├── FlowSelectionHandler  # 选择管理（已完善）
└── FlowKeyboardHandler   # 键盘快捷键（已完善）

hooks/                    # Vue 响应式封装层
├── useDrag              # 调用 FlowDragHandler + Vue 响应式
├── useCanvasPan         # 调用 FlowDragHandler + Vue 响应式
├── useNodeDrag          # 调用 FlowDragHandler + Vue 响应式
├── useConnectionCreation # 调用 FlowConnectionHandler + Vue 响应式
└── useSelection         # 调用 FlowSelectionHandler + Vue 响应式（新建）
```

## 📊 依赖关系分析

```
useDrag (基础)
  ├── useCanvasPan (依赖 useDrag)
  └── useNodeDrag (依赖 useDrag)

useConnectionCreation (独立)

FlowSelectionHandler (已完善，未使用)
FlowKeyboardHandler (已完善，未使用)
```

## 🗓️ 迁移步骤

### 阶段一：分析和准备 ✅

**目标**: 分析现有代码结构，确定迁移策略

**任务**:
- [x] 分析 hooks 和 interaction 的代码结构
- [x] 确定依赖关系
- [x] 制定迁移计划

**输出**: 本文档

---

### 阶段二：重构 FlowDragHandler

**目标**: 整合 `useDrag` 的核心逻辑到 `FlowDragHandler`

**任务**:
1. **增强 FlowDragHandler 接口**
   - [ ] 添加 RAF 节流支持
   - [ ] 添加增量模式支持
   - [ ] 添加灵活的坐标转换函数支持
   - [ ] 添加 `enabled` 和 `canStart` 检查支持

2. **实现核心逻辑**
   - [ ] 实现 RAF 节流机制（使用回调函数，不依赖 Vue）
   - [ ] 实现增量模式逻辑
   - [ ] 实现坐标转换逻辑
   - [ ] 实现拖拽阈值检查

3. **保持向后兼容**
   - [ ] 保留原有的 `startNodeDrag`、`startCanvasDrag` 方法
   - [ ] 添加新的通用 `startDrag` 方法
   - [ ] 更新 `updateDrag` 方法支持新特性

**文件**:
- `src/components/flow/core/interaction/FlowDragHandler.ts`

**验证**:
- [ ] 单元测试（如果存在）
- [ ] 手动测试拖拽功能

---

### 阶段三：重构 FlowConnectionHandler

**目标**: 整合 `useConnectionCreation` 的核心逻辑到 `FlowConnectionHandler`

**任务**:
1. **增强 FlowConnectionHandler**
   - [ ] 添加 RAF 节流的预览位置更新
   - [ ] 添加预览位置状态管理
   - [ ] 完善连接创建逻辑（整合 hooks 中的逻辑）

2. **实现核心方法**
   - [ ] `updatePreviewPosition` - 支持 RAF 节流
   - [ ] `getPreviewPosition` - 获取预览位置
   - [ ] 完善 `finishConnection` - 整合 hooks 中的验证逻辑

**文件**:
- `src/components/flow/core/interaction/FlowConnectionHandler.ts`

**验证**:
- [ ] 手动测试连接创建功能

---

### 阶段四：重构 hooks（调用 interaction 核心逻辑）

**目标**: 让 hooks 只作为 Vue 响应式封装层，调用 interaction 核心逻辑

#### 4.1 重构 useDrag

**任务**:
- [ ] 创建 `FlowDragHandler` 实例
- [ ] 将 Vue 响应式状态（`ref`）映射到 handler 状态
- [ ] 实现事件处理函数，调用 handler 方法
- [ ] 保持现有 API 不变（向后兼容）

**文件**:
- `src/components/flow/hooks/useDrag.ts`

#### 4.2 重构 useCanvasPan

**任务**:
- [ ] 使用重构后的 `useDrag`（内部调用 `FlowDragHandler`）
- [ ] 保持现有 API 不变

**文件**:
- `src/components/flow/hooks/useCanvasPan.ts`

#### 4.3 重构 useNodeDrag

**任务**:
- [ ] 使用重构后的 `useDrag`（内部调用 `FlowDragHandler`）
- [ ] 保持现有 API 不变

**文件**:
- `src/components/flow/hooks/useNodeDrag.ts`

#### 4.4 重构 useConnectionCreation

**任务**:
- [ ] 创建 `FlowConnectionHandler` 实例
- [ ] 将 Vue 响应式状态映射到 handler 状态
- [ ] 实现事件处理函数，调用 handler 方法
- [ ] 保持现有 API 不变

**文件**:
- `src/components/flow/hooks/useConnectionCreation.ts`

**验证**:
- [ ] 确保 `FlowCanvas` 组件正常工作
- [ ] 测试画布平移、节点拖拽、连接创建功能

---

### 阶段五：集成 FlowSelectionHandler

**目标**: 创建 `useSelection` hook 并在 `FlowCanvas` 中使用

**任务**:
1. **创建 useSelection hook**
   - [ ] 创建 `src/components/flow/hooks/useSelection.ts`
   - [ ] 封装 `FlowSelectionHandler` 的 Vue 响应式接口
   - [ ] 提供选择、取消选择、框选等方法

2. **在 FlowCanvas 中集成**
   - [ ] 替换现有的选择逻辑
   - [ ] 集成框选功能
   - [ ] 集成多选管理

**文件**:
- `src/components/flow/hooks/useSelection.ts` (新建)
- `src/components/flow/components/FlowCanvas.tsx`

**验证**:
- [ ] 测试点击选择
- [ ] 测试多选（Ctrl/Cmd）
- [ ] 测试框选功能

---

### 阶段六：集成 FlowKeyboardHandler

**目标**: 在 `FlowCanvas` 中集成键盘快捷键处理

**任务**:
1. **创建 useKeyboard hook（可选）**
   - [ ] 创建 `src/components/flow/hooks/useKeyboard.ts`
   - [ ] 封装 `FlowKeyboardHandler` 的 Vue 响应式接口

2. **在 FlowCanvas 中集成**
   - [ ] 注册常用快捷键（Delete、Ctrl+Z、Ctrl+Y 等）
   - [ ] 处理键盘事件

**文件**:
- `src/components/flow/hooks/useKeyboard.ts` (新建，可选)
- `src/components/flow/components/FlowCanvas.tsx`

**验证**:
- [ ] 测试 Delete 键删除选中项
- [ ] 测试撤销/重做快捷键
- [ ] 测试其他快捷键

---

### 阶段七：测试和验证

**目标**: 确保所有功能正常工作，无回归问题

**任务**:
- [ ] 功能测试：画布平移、节点拖拽、连接创建、选择、键盘快捷键
- [ ] 性能测试：确保 RAF 优化正常工作
- [ ] 边界测试：测试各种边界情况
- [ ] 兼容性测试：确保现有代码正常工作

**检查清单**:
- [ ] 画布平移正常
- [ ] 节点拖拽正常
- [ ] 连接创建正常
- [ ] 选择功能正常（单选、多选、框选）
- [ ] 键盘快捷键正常
- [ ] 性能无退化

---

### 阶段八：清理

**目标**: 删除未使用的代码，更新文档

**任务**:
- [ ] 删除 hooks 中未使用的代码
- [ ] 更新 README 文档
- [ ] 更新类型导出
- [ ] 代码审查

**文件**:
- `src/components/flow/README.md`
- `src/components/flow/index.ts`

---

## 🔄 迁移原则

1. **向后兼容**: 保持现有 hooks API 不变，确保现有代码无需修改
2. **逐步迁移**: 一个阶段一个阶段进行，每个阶段完成后验证
3. **测试优先**: 每个阶段完成后进行充分测试
4. **文档更新**: 及时更新相关文档

## 📝 注意事项

1. **RAF 节流**: `FlowDragHandler` 中的 RAF 节流需要使用回调函数，不能直接使用 Vue 的 `useRafThrottle`
2. **响应式状态**: hooks 负责将 handler 的状态转换为 Vue 响应式状态
3. **事件处理**: hooks 负责处理 DOM 事件，然后调用 handler 方法
4. **类型安全**: 确保所有类型定义正确，无类型错误

## 🎯 成功标准

- [ ] 所有功能正常工作
- [ ] 性能无退化
- [ ] 代码结构清晰，职责分明
- [ ] 向后兼容，现有代码无需修改
- [ ] 文档完整

---

## 📅 时间估算

- 阶段二：2-3 小时
- 阶段三：1-2 小时
- 阶段四：2-3 小时
- 阶段五：1-2 小时
- 阶段六：1 小时
- 阶段七：1-2 小时
- 阶段八：0.5 小时

**总计**: 约 8-13 小时

