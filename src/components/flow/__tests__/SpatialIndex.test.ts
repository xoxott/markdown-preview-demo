/**
 * SpatialIndex 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialIndex } from '../core/performance/SpatialIndex';
import type { FlowNode } from '../types/flow-node';

describe('SpatialIndex', () => {
  let spatialIndex: SpatialIndex;
  let testNodes: FlowNode[];

  beforeEach(() => {
    spatialIndex = new SpatialIndex({
      defaultWidth: 100,
      defaultHeight: 50,
    });

    // 创建测试节点
    testNodes = [
      {
        id: 'node-1',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {},
      },
      {
        id: 'node-2',
        type: 'default',
        position: { x: 200, y: 200 },
        data: {},
      },
      {
        id: 'node-3',
        type: 'default',
        position: { x: 400, y: 400 },
        data: {},
      },
    ];
  });

  it('应该正确更新节点索引', () => {
    spatialIndex.updateNodes(testNodes);
    expect(spatialIndex.size()).toBe(3);
  });

  it('应该查询视口内的节点', () => {
    spatialIndex.updateNodes(testNodes);

    const result = spatialIndex.query({
      minX: 0,
      minY: 0,
      maxX: 250,
      maxY: 250,
      width: 250,
      height: 250,
    });

    expect(result.length).toBe(2);
    expect(result.map(n => n.id)).toContain('node-1');
    expect(result.map(n => n.id)).toContain('node-2');
  });

  it('应该查询指定点的节点', () => {
    spatialIndex.updateNodes(testNodes);

    const result = spatialIndex.queryPoint(50, 25);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('node-1');
  });

  it('应该查询附近的节点', () => {
    spatialIndex.updateNodes(testNodes);

    const result = spatialIndex.queryNearby('node-2', 150);
    expect(result.length).toBeGreaterThan(0);
  });

  it('应该正确清空索引', () => {
    spatialIndex.updateNodes(testNodes);
    spatialIndex.clear();
    expect(spatialIndex.size()).toBe(0);
  });

  it('应该获取所有节点', () => {
    spatialIndex.updateNodes(testNodes);
    const all = spatialIndex.all();
    expect(all.length).toBe(3);
  });

  it('应该检查节点是否存在', () => {
    spatialIndex.updateNodes(testNodes);
    expect(spatialIndex.has('node-1')).toBe(true);
    expect(spatialIndex.has('non-existent')).toBe(false);
  });

  it('应该获取索引边界', () => {
    spatialIndex.updateNodes(testNodes);
    const bounds = spatialIndex.getBounds();

    expect(bounds).not.toBeNull();
    expect(bounds!.minX).toBe(0);
    expect(bounds!.minY).toBe(0);
    expect(bounds!.maxX).toBe(500); // 400 + 100
    expect(bounds!.maxY).toBe(450); // 400 + 50
  });
});

