# 类型定义组织结构

## 概述

本文档说明工作流组件的类型定义组织结构，遵循**关注点分离**原则，将 API 类型和 UI 类型分离管理。

## 类型定义位置

### 1. API 类型定义

**位置**: `src/typings/api/workflow.d.ts`

**职责**: 定义后端 API 接口相关的数据结构

**包含内容**:
- 基础枚举类型（NodeType, WorkflowStatus, ExecutionStatus 等）
- 核心数据结构（Position, Port, WorkflowNode, Connection 等）
- 节点配置（AINodeConfig, HttpNodeConfig 等）
- 工作流定义（WorkflowDefinition）
- API 请求/响应类型（CreateWorkflowRequest, UpdateWorkflowRequest 等）

**特点**:
- 只包含业务数据，不包含 UI 相关数据
- 与后端接口定义保持一致
- 使用 `declare namespace Api.Workflow` 声明

**示例**:
```typescript
declare namespace Api {
  namespace Workflow {
    interface WorkflowNode {
      id: string;
      type: NodeType;
      position: Position;
      data: NodeData;
      config: NodeConfig;
      inputs?: Port[];
      outputs?: Port[];
    }
  }
}
```

### 2. UI 类型定义

**位置**: `src/components/ai-workflow/types/index.ts`

**职责**: 定义组件内部使用的 UI 相关类型

**包含内容**:
- UI 状态类型（NodeUIState, ConnectionUIState）
- UI 配置类型（NodeStyle, ConnectionStyle）
- UI 数据类型（NodeUIData, ConnectionUIData）
- 完整数据类型（WorkflowNodeWithUI, WorkflowConnectionWithUI）
- 视口类型（Viewport）
- 画布类型（CanvasConfig, GridConfig, MinimapConfig）
- 交互类型（DragState, SelectionBoxState）
- 事件类型（NodeEvent, ConnectionEvent, CanvasEvent）
- 工具类型（DeepPartial, DeepReadonly 等）

**特点**:
- 只包含 UI 相关数据
- 组件内部使用，不暴露给外部
- 使用 ES6 模块导出

**示例**:
```typescript
export interface NodeUIData {
  position: Position;
  size?: Size;
  style?: NodeStyle;
  uiState?: NodeUIState;
  layoutStrategy?: NodeLayoutStrategy;
  zIndex?: number;
}

export interface WorkflowNodeWithUI {
  business: Api.Workflow.WorkflowNode;
  ui: NodeUIData;
}
```

## 数据结构设计

### 分离原则

工作流组件采用**业务数据与 UI 数据分离**的设计：

```typescript
// 完整的节点数据 = 业务数据 + UI 数据
interface WorkflowNodeWithUI {
  business: Api.Workflow.WorkflowNode;  // 来自 API
  ui: NodeUIData;                        // 组件内部
}
```

### 优势

1. **清晰的职责划分**
   - API 类型只关注业务逻辑
   - UI 类型只关注展示逻辑

2. **易于维护**
   - API 变更不影响 UI 类型
   - UI 优化不影响 API 类型

3. **便于扩展**
   - 可以独立扩展 UI 功能
   - 不会污染 API 数据结构

4. **类型安全**
   - 编译时检查类型错误
   - 防止混淆业务数据和 UI 数据

## 使用示例

### 1. 从 API 获取数据

```typescript
import type { Api } from '@/typings';

// API 返回的数据
const apiNode: Api.Workflow.WorkflowNode = {
  id: 'node-1',
  type: 'ai',
  position: { x: 100, y: 100 },
  data: { label: 'AI Node' },
  config: { model: 'gpt-4', prompt: 'Hello' }
};
```

### 2. 转换为组件内部数据

```typescript
import type { WorkflowNodeWithUI, NodeUIData } from '@/components/ai-workflow/types';

// 添加 UI 数据
const uiData: NodeUIData = {
  position: apiNode.position,
  size: { width: 220, height: 72 },
  style: {
    backgroundColor: '#fff',
    borderColor: '#ddd'
  },
  uiState: {
    selected: false,
    locked: false,
    hovered: false,
    dragging: false
  }
};

// 组合成完整数据
const nodeWithUI: WorkflowNodeWithUI = {
  business: apiNode,
  ui: uiData
};
```

### 3. 保存时提取业务数据

```typescript
// 只保存业务数据到后端
const saveData: Api.Workflow.WorkflowNode = nodeWithUI.business;

// 调用 API
await workflowApi.updateNode(saveData);
```

## 配置类型

配置相关的类型定义在 `src/components/ai-workflow/config/WorkflowConfig.ts`：

```typescript
export interface WorkflowConfig {
  nodeStyle: NodeStyleConfig;
  connectionStyle: ConnectionStyleConfig;
  canvasStyle: CanvasStyleConfig;
  interaction: InteractionConfig;
  performance: PerformanceConfig;
  theme: ThemeConfig;
}
```

配置类型属于 UI 层面，但独立管理以便全局共享。

## 策略类型

策略相关的类型定义在各自的策略文件中：

```typescript
// src/components/ai-workflow/strategies/connection-render/index.ts
export interface IConnectionRenderStrategy {
  readonly name: ConnectionRenderStrategy;
  computePath(sourcePos: Position, targetPos: Position, config?: Partial<ConnectionRenderConfig>): string;
  computeArrowTransform?(sourcePos: Position, targetPos: Position, config?: Partial<ConnectionRenderConfig>): ArrowTransform;
}
```

## 最佳实践

### 1. 类型导入

```typescript
// 导入 API 类型
import type { Api } from '@/typings';
const node: Api.Workflow.WorkflowNode = ...;

// 导入 UI 类型
import type { NodeUIData, WorkflowNodeWithUI } from '@/components/ai-workflow/types';
const uiData: NodeUIData = ...;
```

### 2. 类型扩展

如果需要扩展类型，在对应位置添加：

```typescript
// 扩展 API 类型 - 在 src/typings/api/workflow.d.ts
declare namespace Api {
  namespace Workflow {
    interface CustomNodeConfig {
      customField: string;
    }
  }
}

// 扩展 UI 类型 - 在 src/components/ai-workflow/types/index.ts
export interface CustomNodeUIData extends NodeUIData {
  customUIField: string;
}
```

### 3. 类型复用

优先复用已有类型，避免重复定义：

```typescript
// ✅ 好的做法
import type { Position } from '@/components/ai-workflow/types';

// ❌ 不好的做法
interface MyPosition {
  x: number;
  y: number;
}
```

## 迁移指南

如果你在旧代码中使用了混合的类型定义，请按以下步骤迁移：

1. **识别类型性质**
   - 如果是 API 数据，使用 `Api.Workflow.*`
   - 如果是 UI 数据，使用组件内部类型

2. **更新导入语句**
   ```typescript
   // 旧代码
   import type { WorkflowNode } from '@/typings/api/workflow-v2';
   
   // 新代码
   import type { Api } from '@/typings';
   const node: Api.Workflow.WorkflowNode = ...;
   ```

3. **分离混合数据**
   ```typescript
   // 旧代码 - 混合数据
   interface OldNode {
     id: string;
     type: string;
     position: Position;
     selected: boolean;  // UI 状态
   }
   
   // 新代码 - 分离数据
   const newNode: WorkflowNodeWithUI = {
     business: {
       id: 'node-1',
       type: 'ai',
       position: { x: 0, y: 0 },
       // ... 其他业务数据
     },
     ui: {
       position: { x: 0, y: 0 },
       uiState: {
         selected: false,
         // ... 其他 UI 状态
       }
     }
   };
   ```

## 总结

- **API 类型** (`src/typings/api/workflow.d.ts`): 业务数据，与后端对齐
- **UI 类型** (`src/components/ai-workflow/types/index.ts`): UI 数据，组件内部使用
- **分离原则**: 业务数据与 UI 数据分离，保持关注点分离
- **类型安全**: 编译时检查，防止类型混淆
- **易于维护**: 独立演进，互不影响

遵循这个组织结构，可以保持代码的清晰性、可维护性和可扩展性。

