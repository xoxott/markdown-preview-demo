/**
 * 性能基准测试
 * 
 * 运行命令: pnpm vitest bench
 */

import { describe, bench } from 'vitest';
import { SpatialIndex } from '../core/performance/SpatialIndex';
import { ObjectPool, createPositionPool } from '../core/performance/ObjectPool';
import { CommandManager } from '../core/commands/CommandManager';
import { MoveNodeCommand } from '../core/commands/MoveNodeCommand';
import type { FlowNode } from '../types/flow-node';

// 生成测试数据
function generateNodes(count: number): FlowNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    type: 'default',
    position: {
      x: Math.random() * 10000,
      y: Math.random() * 10000,
    },
    data: {},
  }));
}

// ============================================
// 基准测试 1: 空间索引 vs 线性查找
// ============================================

describe('Viewport Culling Performance', () => {
  const nodes1k = generateNodes(1000);
  const nodes10k = generateNodes(10000);
  const viewport = {
    minX: 0,
    minY: 0,
    maxX: 1000,
    maxY: 1000,
    width: 1000,
    height: 1000,
  };
  
  // 线性查找（优化前）
  bench('Linear search - 1000 nodes', () => {
    nodes1k.filter(node => {
      const x = node.position.x;
      const y = node.position.y;
      const width = 220;
      const height = 72;
      return !(
        x + width < viewport.minX ||
        x > viewport.maxX ||
        y + height < viewport.minY ||
        y > viewport.maxY
      );
    });
  });
  
  bench('Linear search - 10000 nodes', () => {
    nodes10k.filter(node => {
      const x = node.position.x;
      const y = node.position.y;
      const width = 220;
      const height = 72;
      return !(
        x + width < viewport.minX ||
        x > viewport.maxX ||
        y + height < viewport.minY ||
        y > viewport.maxY
      );
    });
  });
  
  // 空间索引（优化后）
  const spatialIndex1k = new SpatialIndex();
  spatialIndex1k.updateNodes(nodes1k);
  
  bench('Spatial index - 1000 nodes', () => {
    spatialIndex1k.query(viewport);
  });
  
  const spatialIndex10k = new SpatialIndex();
  spatialIndex10k.updateNodes(nodes10k);
  
  bench('Spatial index - 10000 nodes', () => {
    spatialIndex10k.query(viewport);
  });
});

// ============================================
// 基准测试 2: 对象池 vs 直接创建
// ============================================

describe('Object Creation Performance', () => {
  const positionPool = createPositionPool(1000, 10000);
  
  // 直接创建对象（优化前）
  bench('Direct object creation - 1000 iterations', () => {
    for (let i = 0; i < 1000; i++) {
      const pos = { x: i, y: i };
      // 使用 pos
      void pos;
    }
  });
  
  // 使用对象池（优化后）
  bench('Object pool - 1000 iterations', () => {
    for (let i = 0; i < 1000; i++) {
      const pos = positionPool.acquire();
      pos.x = i;
      pos.y = i;
      // 使用 pos
      positionPool.release(pos);
    }
  });
  
  // 批量操作对比
  bench('Direct creation - 10000 positions', () => {
    const positions = [];
    for (let i = 0; i < 10000; i++) {
      positions.push({ x: i, y: i });
    }
  });
  
  bench('Object pool - 10000 positions', () => {
    const positions = [];
    for (let i = 0; i < 10000; i++) {
      const pos = positionPool.acquire();
      pos.x = i;
      pos.y = i;
      positions.push({ x: pos.x, y: pos.y });
      positionPool.release(pos);
    }
  });
});

// ============================================
// 基准测试 3: 命令模式 vs 快照机制
// ============================================

describe('Undo/Redo Performance', () => {
  // 模拟快照机制（优化前）
  class SnapshotHistory {
    private history: any[] = [];
    private currentIndex = -1;
    
    pushSnapshot(state: any) {
      this.history = this.history.slice(0, this.currentIndex + 1);
      this.history.push(JSON.parse(JSON.stringify(state))); // 深拷贝
      this.currentIndex++;
    }
    
    undo() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        return this.history[this.currentIndex];
      }
    }
  }
  
  const snapshotHistory = new SnapshotHistory();
  const nodes = generateNodes(100);
  
  bench('Snapshot mechanism - 100 operations', () => {
    for (let i = 0; i < 100; i++) {
      snapshotHistory.pushSnapshot(nodes);
    }
  });
  
  // 命令模式（优化后）
  const commandManager = new CommandManager({ maxSize: 100 });
  const mockStateManager = {
    updateNode: () => {},
  } as any;
  
  bench('Command pattern - 100 operations', () => {
    for (let i = 0; i < 100; i++) {
      const command = new MoveNodeCommand(
        `node-${i}`,
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        mockStateManager
      );
      commandManager.execute(command);
    }
  });
});

// ============================================
// 基准测试 4: 空间索引更新性能
// ============================================

describe('Spatial Index Update Performance', () => {
  const nodes1k = generateNodes(1000);
  const nodes10k = generateNodes(10000);
  
  bench('Update spatial index - 1000 nodes', () => {
    const index = new SpatialIndex();
    index.updateNodes(nodes1k);
  });
  
  bench('Update spatial index - 10000 nodes', () => {
    const index = new SpatialIndex();
    index.updateNodes(nodes10k);
  });
  
  // 增量更新测试
  const spatialIndex = new SpatialIndex();
  spatialIndex.updateNodes(nodes10k);
  
  bench('Query after update - 10000 nodes', () => {
    spatialIndex.query({
      minX: 0,
      minY: 0,
      maxX: 1000,
      maxY: 1000,
      width: 1000,
      height: 1000,
    });
  });
});

// ============================================
// 基准测试 5: 综合场景测试
// ============================================

describe('Real-world Scenario Performance', () => {
  const nodes = generateNodes(5000);
  const spatialIndex = new SpatialIndex();
  spatialIndex.updateNodes(nodes);
  const positionPool = createPositionPool(100, 1000);
  
  // 模拟真实的拖拽场景
  bench('Drag node scenario (optimized)', () => {
    // 1. 查找节点（使用空间索引）
    const clickPos = { x: 500, y: 500 };
    const clickedNodes = spatialIndex.queryPoint(clickPos.x, clickPos.y);
    
    if (clickedNodes.length > 0) {
      // 2. 移动节点（使用对象池）
      const newPos = positionPool.acquire();
      newPos.x = clickPos.x + 10;
      newPos.y = clickPos.y + 10;
      
      // 3. 更新节点位置
      clickedNodes[0].position.x = newPos.x;
      clickedNodes[0].position.y = newPos.y;
      
      positionPool.release(newPos);
      
      // 4. 更新空间索引
      spatialIndex.updateNodes(nodes);
    }
  });
  
  // 模拟视口平移场景
  bench('Pan viewport scenario (optimized)', () => {
    const viewports = [
      { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 },
      { minX: 100, minY: 100, maxX: 1100, maxY: 1100, width: 1000, height: 1000 },
      { minX: 200, minY: 200, maxX: 1200, maxY: 1200, width: 1000, height: 1000 },
    ];
    
    viewports.forEach(vp => {
      spatialIndex.query(vp);
    });
  });
});

// ============================================
// 基准测试 6: 内存占用对比
// ============================================

describe('Memory Usage', () => {
  bench('Memory - Create 1000 positions directly', () => {
    const positions = [];
    for (let i = 0; i < 1000; i++) {
      positions.push({ x: i, y: i });
    }
    // 让 GC 回收
    positions.length = 0;
  });
  
  bench('Memory - Create 1000 positions with pool', () => {
    const pool = createPositionPool(100, 1000);
    const positions = [];
    for (let i = 0; i < 1000; i++) {
      const pos = pool.acquire();
      pos.x = i;
      pos.y = i;
      positions.push({ x: pos.x, y: pos.y });
      pool.release(pos);
    }
    positions.length = 0;
  });
});

