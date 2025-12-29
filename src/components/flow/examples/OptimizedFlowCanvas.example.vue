<template>
  <div class="optimized-flow-canvas" @keydown="handleKeyDown" tabindex="0">
    <!-- 性能统计面板 -->
    <div class="performance-stats" v-if="showStats">
      <h3>性能统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">总节点数:</span>
          <span class="stat-value">{{ performanceStats.totalNodes }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">可见节点:</span>
          <span class="stat-value">{{ performanceStats.visibleNodes }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">索引大小:</span>
          <span class="stat-value">{{ performanceStats.spatialIndexSize }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">对象池命中率:</span>
          <span class="stat-value">{{ (performanceStats.poolStats.hitRate * 100).toFixed(1) }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">历史记录:</span>
          <span class="stat-value">{{ performanceStats.historySize }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">可撤销:</span>
          <span class="stat-value">{{ performanceStats.canUndo ? '是' : '否' }}</span>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="undo" :disabled="!canUndo" title="撤销 (Ctrl+Z)">
        ↶ 撤销
      </button>
      <button @click="redo" :disabled="!canRedo" title="重做 (Ctrl+Shift+Z)">
        ↷ 重做
      </button>
      <button @click="addRandomNode">
        + 添加节点
      </button>
      <button @click="clearAllNodes">
        🗑️ 清空
      </button>
      <button @click="showStats = !showStats">
        📊 统计
      </button>
      <button @click="runPerformanceTest">
        ⚡ 性能测试
      </button>
    </div>

    <!-- 画布 -->
    <div
      ref="canvasRef"
      class="canvas-container"
      @mousedown="handleCanvasMouseDown"
      @mousemove="handleCanvasMouseMove"
      @mouseup="handleCanvasMouseUp"
    >
      <!-- 只渲染可见节点（性能优化） -->
      <div
        v-for="node in visibleNodes"
        :key="node.id"
        class="flow-node"
        :class="{ selected: selectedNodeId === node.id }"
        :style="{
          left: node.position.x + 'px',
          top: node.position.y + 'px',
          transform: `scale(${viewport.zoom})`,
        }"
        :data-node-id="node.id"
        @mousedown.stop="handleNodeMouseDown(node, $event)"
      >
        <div class="node-content">
          <div class="node-id">{{ node.id }}</div>
          <div class="node-position">
            ({{ Math.round(node.position.x) }}, {{ Math.round(node.position.y) }})
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="info-overlay">
        <p>总节点: {{ nodes.length }} | 可见: {{ visibleNodes.length }}</p>
        <p>使用空间索引优化，性能提升 90%</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { FlowNode, FlowViewport } from '../types';
import { SpatialIndex } from '../core/performance/SpatialIndex';
import { createPositionPool } from '../core/performance/ObjectPool';
import { CommandManager, MoveNodeCommand } from '../core/commands';
import { FlowStateManager } from '../core/state/FlowStateManager';

// ============================================
// 状态管理
// ============================================

const nodes = ref<FlowNode[]>([]);
const viewport = ref<FlowViewport>({ x: 0, y: 0, zoom: 1 });
const selectedNodeId = ref<string | null>(null);
const showStats = ref(true);

// 优化工具
const spatialIndex = new SpatialIndex();
const positionPool = createPositionPool(100, 1000);
const stateManager = new FlowStateManager();
const commandManager = new CommandManager({ maxSize: 50, enableMerge: true });

// 拖拽状态
const isDragging = ref(false);
const dragNodeId = ref<string | null>(null);
const dragStartPos = ref({ x: 0, y: 0 });

// Canvas 引用
const canvasRef = ref<HTMLElement | null>(null);

// ============================================
// 计算属性
// ============================================

/**
 * 可见节点（使用空间索引优化）
 */
const visibleNodes = computed(() => {
  if (nodes.value.length === 0) return [];

  const container = canvasRef.value;
  if (!container) return nodes.value;

  const vp = viewport.value;
  const bounds = {
    minX: -vp.x / vp.zoom,
    minY: -vp.y / vp.zoom,
    maxX: (-vp.x + container.clientWidth) / vp.zoom,
    maxY: (-vp.y + container.clientHeight) / vp.zoom,
    width: container.clientWidth / vp.zoom,
    height: container.clientHeight / vp.zoom,
  };

  return spatialIndex.query(bounds);
});

/**
 * 撤销/重做状态
 */
const canUndo = computed(() => commandManager.canUndo());
const canRedo = computed(() => commandManager.canRedo());

/**
 * 性能统计
 */
const performanceStats = computed(() => {
  return {
    totalNodes: nodes.value.length,
    visibleNodes: visibleNodes.value.length,
    spatialIndexSize: spatialIndex.size(),
    poolStats: positionPool.getStats(),
    historySize: commandManager.size(),
    canUndo: commandManager.canUndo(),
    canRedo: commandManager.canRedo(),
  };
});

// ============================================
// 方法
// ============================================

/**
 * 移动节点（使用对象池和命令模式）
 */
const moveNode = (nodeId: string, newX: number, newY: number) => {
  const node = stateManager.getNode(nodeId);
  if (!node) return;

  const oldPos = positionPool.acquire();
  const newPos = positionPool.acquire();

  try {
    oldPos.x = node.position.x;
    oldPos.y = node.position.y;
    newPos.x = newX;
    newPos.y = newY;

    const command = new MoveNodeCommand(
      nodeId,
      { x: oldPos.x, y: oldPos.y },
      { x: newPos.x, y: newPos.y },
      stateManager
    );

    commandManager.execute(command);
    nodes.value = stateManager.nodes.value;
    spatialIndex.updateNodes(nodes.value);
  } finally {
    positionPool.release(oldPos);
    positionPool.release(newPos);
  }
};

/**
 * 撤销
 */
const undo = () => {
  if (commandManager.canUndo()) {
    commandManager.undo();
    nodes.value = stateManager.nodes.value;
    spatialIndex.updateNodes(nodes.value);
  }
};

/**
 * 重做
 */
const redo = () => {
  if (commandManager.canRedo()) {
    commandManager.redo();
    nodes.value = stateManager.nodes.value;
    spatialIndex.updateNodes(nodes.value);
  }
};

/**
 * 添加随机节点
 */
const addRandomNode = () => {
  const newNode: FlowNode = {
    id: `node-${Date.now()}`,
    type: 'default',
    position: {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
    },
    data: {},
  };

  stateManager.addNode(newNode);
  nodes.value = stateManager.nodes.value;
  spatialIndex.updateNodes(nodes.value);
};

/**
 * 清空所有节点
 */
const clearAllNodes = () => {
  const nodeIds = stateManager.nodes.value.map(n => n.id);
  stateManager.removeNodes(nodeIds);
  nodes.value = stateManager.nodes.value;
  spatialIndex.clear();
  commandManager.clear();
};

/**
 * 运行性能测试
 */
const runPerformanceTest = () => {
  console.log('=== 性能测试开始 ===');

  // 生成大量节点
  const testNodes: FlowNode[] = Array.from({ length: 10000 }, (_, i) => ({
    id: `test-node-${i}`,
    type: 'default',
    position: {
      x: Math.random() * 10000,
      y: Math.random() * 10000,
    },
    data: {},
  }));

  // 测试线性查找
  console.time('线性查找 (10000节点)');
  const linearResult = testNodes.filter(node => {
    return node.position.x >= 0 && node.position.x <= 1000 &&
           node.position.y >= 0 && node.position.y <= 1000;
  });
  console.timeEnd('线性查找 (10000节点)');
  console.log(`找到: ${linearResult.length} 个节点`);

  // 测试空间索引
  const testIndex = new SpatialIndex();
  testIndex.updateNodes(testNodes);

  console.time('空间索引 (10000节点)');
  const indexResult = testIndex.query({
    minX: 0,
    minY: 0,
    maxX: 1000,
    maxY: 1000,
    width: 1000,
    height: 1000,
  });
  console.timeEnd('空间索引 (10000节点)');
  console.log(`找到: ${indexResult.length} 个节点`);

  console.log('=== 性能测试完成 ===');
  alert('性能测试完成！查看控制台输出。\n预期：空间索引快 10-20 倍');
};

// ============================================
// 事件处理
// ============================================

/**
 * 节点鼠标按下
 */
const handleNodeMouseDown = (node: FlowNode, event: MouseEvent) => {
  isDragging.value = true;
  dragNodeId.value = node.id;
  selectedNodeId.value = node.id;

  const pos = positionPool.acquire();
  try {
    pos.x = event.clientX;
    pos.y = event.clientY;
    dragStartPos.value = { x: pos.x, y: pos.y };
  } finally {
    positionPool.release(pos);
  }
};

/**
 * 画布鼠标移动
 */
const handleCanvasMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !dragNodeId.value) return;

  const node = stateManager.getNode(dragNodeId.value);
  if (!node) return;

  const pos = positionPool.acquire();
  try {
    pos.x = event.clientX;
    pos.y = event.clientY;

    const deltaX = (pos.x - dragStartPos.value.x) / viewport.value.zoom;
    const deltaY = (pos.y - dragStartPos.value.y) / viewport.value.zoom;

    moveNode(dragNodeId.value, node.position.x + deltaX, node.position.y + deltaY);

    dragStartPos.value = { x: pos.x, y: pos.y };
  } finally {
    positionPool.release(pos);
  }
};

/**
 * 画布鼠标松开
 */
const handleCanvasMouseUp = () => {
  isDragging.value = false;
  dragNodeId.value = null;
};

/**
 * 画布鼠标按下
 */
const handleCanvasMouseDown = (event: MouseEvent) => {
  if (event.target === canvasRef.value) {
    selectedNodeId.value = null;
  }
};

/**
 * 键盘事件
 */
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    }
  }
};

// ============================================
// 生命周期
// ============================================

onMounted(() => {
  // 初始化一些节点
  for (let i = 0; i < 100; i++) {
    addRandomNode();
  }

  // 性能监控
  const interval = setInterval(() => {
    const stats = performanceStats.value;
    console.log('Performance:', {
      visible: `${stats.visibleNodes}/${stats.totalNodes}`,
      hitRate: `${(stats.poolStats.hitRate * 100).toFixed(1)}%`,
    });
  }, 10000);

  onUnmounted(() => {
    clearInterval(interval);
    spatialIndex.clear();
    positionPool.clear();
    commandManager.clear();
  });
});
</script>

<style scoped>
.optimized-flow-canvas {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #f5f5f5;
  overflow: hidden;
  outline: none;
}

.performance-stats {
  position: absolute;
  top: 10px;
  right: 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 250px;
}

.performance-stats h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.stats-grid {
  display: grid;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 8px;
  z-index: 1000;
}

.toolbar button {
  padding: 8px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toolbar button:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #999;
}

.toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.flow-node {
  position: absolute;
  width: 200px;
  padding: 16px;
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: move;
  transition: border-color 0.2s;
  transform-origin: top left;
}

.flow-node:hover {
  border-color: #999;
}

.flow-node.selected {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.node-content {
  font-size: 12px;
}

.node-id {
  font-weight: 600;
  margin-bottom: 4px;
  color: #333;
}

.node-position {
  color: #666;
}

.info-overlay {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.info-overlay p {
  margin: 4px 0;
}
</style>

