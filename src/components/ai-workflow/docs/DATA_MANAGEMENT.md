# 数据管理策略

## 概述

工作流组件采用**前后端数据分离**的设计，明确区分需要持久化的业务数据和前端临时缓存的 UI 数据。

## 数据分类

### 1. 业务数据（API 数据）- 需要入库

**位置**: `Api.Workflow.*` 类型

**特点**:
- 需要持久化到后端数据库
- 包含工作流的核心业务逻辑和布局信息
- 与后端 API 接口对齐

**包含内容**:
- 节点配置（AI 模型、HTTP 请求、数据库查询等）
- **节点位置**（position - 工作流布局的一部分，需要持久化）
- 连接关系（节点之间的数据流）
- **视口状态**（viewport - 画布视图，需要持久化）
- 工作流元数据（名称、描述、状态等）
- 执行结果和日志

**示例**:
```typescript
// 业务数据 - 需要保存到后端
interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: Position;  // ✅ 节点位置需要持久化
  config: NodeConfig;  // 业务配置
  inputs?: Port[];
  outputs?: Port[];
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  connections: Connection[];
  viewport?: Viewport;  // ✅ 视口状态需要持久化
}
```

### 2. UI 数据（前端缓存）- 不入库

**位置**: `src/components/ai-workflow/types/index.ts`

**特点**:
- 只在前端缓存，不持久化到后端
- 存储在 `localStorage`
- 用户刷新页面后可恢复 UI 状态
- 主要是样式和交互状态

**包含内容**:
- 节点样式（颜色、图标、边框等 - 用户自定义外观）
- 节点尺寸（前端计算的显示尺寸）
- 连接线样式（线条类型、颜色、动画等）
- UI 交互状态（选中、悬停、拖拽等临时状态）
- 用户偏好设置（网格、小地图、主题等）
- z-index 层级（前端渲染层级）

**不包含**:
- ❌ 节点位置（position）- 已在后端保存
- ❌ 视口状态（viewport）- 已在后端保存

**示例**:
```typescript
// UI 数据 - 前端缓存，不入库
interface NodeUIData {
  size?: Size;               // 节点尺寸
  style?: NodeStyle;         // 用户自定义样式（颜色、图标等）
  uiState?: NodeUIState;     // 交互状态（选中、悬停等）
  layoutStrategy?: string;   // 布局算法
  zIndex?: number;           // 层级
  // ❌ 不包含 position，position 在 business 数据中
}
```

## 数据结构设计

### 完整数据结构

```typescript
// 节点：业务数据（含 position）+ UI 数据（样式、状态）
interface WorkflowNodeWithUI {
  business: Api.Workflow.WorkflowNode;  // 业务数据（入库，包含 position）
  ui: NodeUIData;                        // UI 数据（前端缓存，不含 position）
}

// 连接线：业务数据 + UI 数据
interface WorkflowConnectionWithUI {
  business: Api.Workflow.Connection;     // 业务数据（入库）
  ui: ConnectionUIData;                  // UI 数据（前端缓存）
}
```

### 本地存储结构

```typescript
interface LocalWorkflowData {
  workflowId: string;
  nodesUI: Record<string, NodeUIData>;           // 节点 UI 映射（样式、状态）
  connectionsUI: Record<string, ConnectionUIData>; // 连接线 UI 映射
  canvasConfig?: Partial<CanvasConfig>;          // 画布配置（用户偏好）
  lastUpdated: number;                            // 更新时间
  // ❌ 不包含 viewport，viewport 在后端保存
}
```

## 数据流转

### 1. 加载工作流

```typescript
// 1. 从后端加载业务数据（包含 position 和 viewport）
const apiData = await workflowApi.getWorkflow(workflowId);

// 2. 从 localStorage 加载 UI 数据（样式、状态等）
const localData = loadWorkflowUIFromLocal(workflowId);

// 3. 合并数据
const { nodes, connections, viewport } = mergeAPIAndLocalData(
  apiData.definition.nodes,      // 包含 position
  apiData.definition.connections,
  apiData.definition.viewport,   // 从后端获取
  localData                       // 本地 UI 数据
);

// 4. 使用完整数据渲染
renderWorkflow(nodes, connections, viewport);
```

### 2. 修改节点位置（需要保存到后端）

```typescript
// 用户拖拽节点
function handleNodeDrag(nodeId: string, newPosition: Position) {
  // 1. 更新业务数据中的位置
  const node = nodes.find(n => n.business.id === nodeId);
  if (node) {
    node.business.position = newPosition;  // 更新 business 数据
  }

  // 2. 标记为需要保存（防抖）
  debouncedSaveToBackend();
}

// 防抖保存到后端
const debouncedSaveToBackend = debounce(() => {
  saveWorkflowToBackend();  // 保存到后端
}, 1000);
```

### 3. 修改节点样式（不保存到后端）

```typescript
// 用户修改节点颜色
function handleNodeStyleChange(nodeId: string, style: NodeStyle) {
  // 1. 更新 UI 数据
  const node = nodes.find(n => n.business.id === nodeId);
  if (node) {
    node.ui.style = { ...node.ui.style, ...style };
  }

  // 2. 保存到 localStorage（防抖）
  debouncedSaveUIToLocal();
}

// 防抖保存 UI 到本地
const debouncedSaveUIToLocal = debounce(() => {
  saveWorkflowUIToLocal(workflowId, nodes, connections);
}, 500);
```

### 4. 保存工作流（保存业务数据，包含位置和视口）

```typescript
// 保存工作流到后端
async function saveWorkflow() {
  // 1. 准备业务数据（包含 position 和 viewport）
  const definition = prepareWorkflowForSave(nodes, connections, viewport);

  // 2. 调用 API
  await workflowApi.updateWorkflow(workflowId, {
    definition  // 包含 nodes（含 position）、connections、viewport
  });

  // 3. UI 样式数据已经在 localStorage 中，无需发送到后端
}
```

## 使用示例

### 示例 1: 创建新节点

```typescript
import { createNodeWithUI } from '@/components/ai-workflow/utils/dataTransform';

// 创建业务数据
const apiNode: Api.Workflow.WorkflowNode = {
  id: 'node-1',
  type: 'ai',
  name: 'AI Node',
  description: 'GPT-4 Node',
  config: {
    model: 'gpt-4',
    prompt: 'Hello'
  }
};

// 添加 UI 数据
const nodeWithUI = createNodeWithUI(apiNode, {
  position: { x: 100, y: 100 },
  style: {
    backgroundColor: '#fff',
    borderColor: '#2080f0'
  }
});

// 添加到画布
nodes.push(nodeWithUI);
```

### 示例 2: 保存工作流

```typescript
import { prepareWorkflowForSave } from '@/components/ai-workflow/utils/dataTransform';

async function handleSave() {
  try {
    // 准备业务数据（包含 position 和 viewport，不包含 UI 样式）
    const definition = prepareWorkflowForSave(nodes, connections, viewport);

    // 保存到后端
    await workflowApi.updateWorkflow(workflowId, {
      name: workflowName,
      description: workflowDescription,
      definition  // 包含 nodes（含 position）、connections、viewport
    });

    message.success('保存成功');
  } catch (error) {
    message.error('保存失败');
  }
}
```

### 示例 3: 恢复 UI 状态

```typescript
import {
  loadWorkflowUIFromLocal,
  mergeAPIAndLocalData
} from '@/components/ai-workflow/utils/dataTransform';

async function loadWorkflow(workflowId: string) {
  // 1. 加载业务数据
  const apiData = await workflowApi.getWorkflow(workflowId);

  // 2. 尝试恢复 UI 状态
  const localData = loadWorkflowUIFromLocal(workflowId);

  // 3. 合并数据
  const { nodes, connections, viewport } = mergeAPIAndLocalData(
    apiData.definition.nodes,
    apiData.definition.connections,
    localData
  );

  // 4. 渲染
  setNodes(nodes);
  setConnections(connections);
  setViewport(viewport);

  // 提示用户是否恢复了 UI 状态
  if (localData) {
    message.info('已恢复上次的画布状态');
  }
}
```

### 示例 4: 清除 UI 缓存

```typescript
import { clearWorkflowUIFromLocal } from '@/components/ai-workflow/utils/dataTransform';

// 重置画布（清除 UI 缓存）
function handleResetCanvas() {
  Modal.confirm({
    title: '重置画布',
    content: '确定要重置画布状态吗？这将清除所有节点位置和样式设置。',
    onOk: () => {
      // 清除本地缓存
      clearWorkflowUIFromLocal(workflowId);

      // 重新加载（使用默认 UI）
      loadWorkflow(workflowId);

      message.success('画布已重置');
    }
  });
}
```

## 存储策略

### localStorage 存储

**优点**:
- 持久化存储，关闭浏览器后仍保留
- 适合存储用户偏好设置

**使用场景**:
- 节点位置和样式
- 视口状态
- 画布配置（网格、主题等）

**存储 Key 格式**:
```
workflow_ui_{workflowId}
```

### sessionStorage 存储（可选）

**优点**:
- 会话级存储，关闭标签页后清除
- 适合临时状态

**使用场景**:
- 临时选中状态
- 拖拽过程中的临时数据

## 性能优化

### 1. 防抖保存

```typescript
import { debounce } from 'lodash-es';

// 防抖保存，避免频繁写入 localStorage
const debouncedSave = debounce(() => {
  saveWorkflowUIToLocal(workflowId, nodes, connections, viewport);
}, 500);

// 在节点拖拽等高频操作中使用
function handleNodeDrag(nodeId: string, position: Position) {
  updateNodePosition(nodeId, position);
  debouncedSave();  // 防抖保存
}
```

### 2. 增量更新

```typescript
// 只更新变化的节点 UI
function updateNodeUI(nodeId: string, uiData: Partial<NodeUIData>) {
  const localData = loadWorkflowUIFromLocal(workflowId);
  if (localData) {
    localData.nodesUI[nodeId] = {
      ...localData.nodesUI[nodeId],
      ...uiData
    };
    localStorage.setItem(
      getWorkflowUIStorageKey(workflowId),
      JSON.stringify(localData)
    );
  }
}
```

### 3. 数据压缩（可选）

对于大型工作流，可以考虑压缩 localStorage 数据：

```typescript
import { compress, decompress } from 'lz-string';

// 保存时压缩
function saveCompressed(data: LocalWorkflowData) {
  const compressed = compress(JSON.stringify(data));
  localStorage.setItem(key, compressed);
}

// 加载时解压
function loadCompressed(): LocalWorkflowData | null {
  const compressed = localStorage.getItem(key);
  if (!compressed) return null;
  return JSON.parse(decompress(compressed));
}
```

## 数据迁移

如果需要在不同设备间同步 UI 状态，可以考虑：

### 方案 1: 云端备份（可选功能）

```typescript
// 备份 UI 数据到云端（用户可选）
async function backupUIToCloud() {
  const localData = loadWorkflowUIFromLocal(workflowId);
  if (localData) {
    await workflowApi.backupUIData(workflowId, localData);
  }
}

// 从云端恢复 UI 数据
async function restoreUIFromCloud() {
  const cloudData = await workflowApi.getUIData(workflowId);
  if (cloudData) {
    saveWorkflowUIToLocal(workflowId, ...);
  }
}
```

### 方案 2: 导出/导入

```typescript
// 导出 UI 配置
function exportUIConfig() {
  const localData = loadWorkflowUIFromLocal(workflowId);
  const blob = new Blob([JSON.stringify(localData, null, 2)], {
    type: 'application/json'
  });
  downloadFile(blob, `workflow-ui-${workflowId}.json`);
}

// 导入 UI 配置
function importUIConfig(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const localData = JSON.parse(e.target.result as string);
    saveWorkflowUIToLocal(workflowId, ...);
  };
  reader.readAsText(file);
}
```

## 最佳实践

### ✅ 推荐做法

1. **明确数据归属**
   - 业务逻辑 → API 数据
   - UI 状态 → 前端缓存

2. **及时保存 UI 状态**
   - 使用防抖避免频繁写入
   - 在关键操作后立即保存

3. **优雅降级**
   - localStorage 不可用时使用内存
   - 提供清除缓存的入口

4. **数据验证**
   - 加载本地数据时验证有效性
   - 处理数据格式变更

### ❌ 避免做法

1. **不要混淆数据类型**
   ```typescript
   // ❌ 错误：将 UI 数据保存到后端
   await api.updateWorkflow({
     definition: {
       nodes: nodesWithUI  // 包含 UI 数据
     }
   });

   // ✅ 正确：只保存业务数据
   const definition = prepareWorkflowForSave(nodes, connections);
   await api.updateWorkflow({ definition });
   ```

2. **不要忽略错误处理**
   ```typescript
   // ❌ 错误：不处理 localStorage 异常
   localStorage.setItem(key, data);

   // ✅ 正确：捕获异常
   try {
     localStorage.setItem(key, data);
   } catch (error) {
     console.warn('Failed to save UI data:', error);
     // 降级处理
   }
   ```

3. **不要过度依赖缓存**
   - 提供重置功能
   - 定期清理过期数据

## 总结

- **API 数据**：业务逻辑，持久化到后端数据库
- **UI 数据**：界面状态，缓存在 localStorage
- **数据转换**：使用工具函数在两者之间转换
- **性能优化**：防抖保存、增量更新
- **用户体验**：自动恢复 UI 状态，提供重置功能

这种设计确保了：
1. 后端数据库只存储业务数据，保持简洁
2. 前端可以自由管理 UI 状态，不影响后端
3. 用户体验更好，刷新页面后可恢复界面状态
4. 便于扩展和维护

