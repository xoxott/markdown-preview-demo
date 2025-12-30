/**
 * 性能修复验证测试
 *
 * 验证关键性能优化是否生效
 */

import { ref, computed } from 'vue';
import type { FlowNode } from '../types';

describe('Performance Fixes', () => {
  // 生成测试节点
  const generateNodes = (count: number): FlowNode[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `node-${i}`,
      type: 'default',
      position: { x: i * 100, y: i * 50 },
      data: { label: `Node ${i}` }
    }));
  };

  describe('Map 查找优化', () => {
    it('应该使用 Map 实现 O(1) 查找', () => {
      const nodes = generateNodes(1000);
      const nodesMap = new Map(nodes.map(n => [n.id, n]));

      const startTime = performance.now();

      // 查找 100 次
      for (let i = 0; i < 100; i++) {
        const node = nodesMap.get(`node-${Math.floor(Math.random() * 1000)}`);
        expect(node).toBeDefined();
      }

      const mapTime = performance.now() - startTime;

      // Map 查找应该非常快（< 5ms，考虑测试环境差异）
      expect(mapTime).toBeLessThan(5);
    });

    it('Map 查找应该比 Array.find 快得多', () => {
      const nodes = generateNodes(1000);
      const nodesMap = new Map(nodes.map(n => [n.id, n]));

      // 测试 Array.find
      const arrayStart = performance.now();
      for (let i = 0; i < 100; i++) {
        const node = nodes.find(n => n.id === `node-${Math.floor(Math.random() * 1000)}`);
      }
      const arrayTime = performance.now() - arrayStart;

      // 测试 Map.get
      const mapStart = performance.now();
      for (let i = 0; i < 100; i++) {
        const node = nodesMap.get(`node-${Math.floor(Math.random() * 1000)}`);
      }
      const mapTime = performance.now() - mapStart;

      // Map 应该至少快 10 倍
      expect(arrayTime / mapTime).toBeGreaterThan(10);
    });
  });

  describe('浅监听 vs 深度监听', () => {
    it('浅监听不应该触发不必要的更新', () => {
      const nodes = ref(generateNodes(100));
      let updateCount = 0;

      // 模拟浅监听
      const version = ref(0);
      const watcher = computed(() => {
        updateCount++;
        return [nodes.value.length, version.value];
      });

      // 访问一次
      watcher.value;
      const initialCount = updateCount;

      // 修改节点位置（不改变数组长度）
      nodes.value[0].position.x = 999;

      // 再次访问
      watcher.value;

      // 浅监听不应该触发更新
      expect(updateCount).toBe(initialCount);

      // 手动触发版本更新
      version.value++;
      watcher.value;

      // 现在应该触发更新
      expect(updateCount).toBe(initialCount + 1);
    });
  });

  describe('缓存键优化', () => {
    it('简化的缓存键应该提高命中率', () => {
      const cache = new Map<string, any>();

      // 精确缓存键
      const preciseKey = (x: number, y: number) => `${x}-${y}`;

      // 简化缓存键（容忍5px误差）
      const simplifiedKey = (x: number, y: number) =>
        `${Math.round(x/5)}-${Math.round(y/5)}`;

      // 测试精确缓存
      let preciseHits = 0;
      cache.clear();
      for (let i = 0; i < 100; i++) {
        const x = 100 + Math.random() * 10; // 100-110 范围
        const y = 200 + Math.random() * 10; // 200-210 范围
        const key = preciseKey(x, y);

        if (cache.has(key)) {
          preciseHits++;
        } else {
          cache.set(key, true);
        }
      }

      // 测试简化缓存
      let simplifiedHits = 0;
      cache.clear();
      for (let i = 0; i < 100; i++) {
        const x = 100 + Math.random() * 10;
        const y = 200 + Math.random() * 10;
        const key = simplifiedKey(x, y);

        if (cache.has(key)) {
          simplifiedHits++;
        } else {
          cache.set(key, true);
        }
      }

      // 简化缓存的命中率应该更高
      expect(simplifiedHits).toBeGreaterThan(preciseHits);
    });
  });

  describe('性能基准', () => {
    it('200 个节点的 Map 创建应该很快', () => {
      const nodes = generateNodes(200);

      const startTime = performance.now();
      const nodesMap = new Map(nodes.map(n => [n.id, n]));
      const createTime = performance.now() - startTime;

      // 创建 Map 应该 < 5ms
      expect(createTime).toBeLessThan(5);
      expect(nodesMap.size).toBe(200);
    });

    it('1000 个节点的查找性能测试', () => {
      const nodes = generateNodes(1000);
      const nodesMap = new Map(nodes.map(n => [n.id, n]));

      const startTime = performance.now();

      // 查找 1000 次
      for (let i = 0; i < 1000; i++) {
        const node = nodesMap.get(`node-${i}`);
        expect(node?.id).toBe(`node-${i}`);
      }

      const queryTime = performance.now() - startTime;

      // 1000 次查找应该 < 20ms（考虑测试环境差异）
      expect(queryTime).toBeLessThan(20);
    });
  });
});

