/**
 * Flow 节点列表组件
 *
 * 负责渲染所有节点，支持视口裁剪、虚拟滚动等性能优化
 */

import { defineComponent, computed, ref, shallowRef, watch, onUnmounted, type PropType } from 'vue';
import BaseNode from './nodes/BaseNode';
import { useRafThrottle } from '../hooks/useRafThrottle';
import type { FlowNode, FlowViewport } from '../types';
import { SpatialIndex } from '../core/performance/SpatialIndex';

/**
 * FlowNodes 组件属性
 */
export interface FlowNodesProps {
  /** 节点列表 */
  nodes: FlowNode[];
  /** 选中的节点 ID 列表 */
  selectedNodeIds?: string[];
  /** 锁定的节点 ID 列表 */
  lockedNodeIds?: string[];
  /** 正在拖拽的节点 ID（用于 z-index 层级管理） */
  draggingNodeId?: string | null;
  /** 视口状态 */
  viewport?: FlowViewport;
  /** 是否启用视口裁剪 */
  enableViewportCulling?: boolean;
  /** 视口裁剪缓冲区（像素） */
  viewportCullingBuffer?: number;
  /** 节点点击事件 */
  onNodeClick?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点双击事件 */
  onNodeDoubleClick?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽开始 */
  onNodeDragStart?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽 */
  onNodeDrag?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽结束 */
  onNodeDragStop?: (node: FlowNode, event: MouseEvent) => void;
  /** 端口鼠标按下 */
  onPortMouseDown?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标抬起 */
  onPortMouseUp?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标进入 */
  onPortMouseEnter?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标离开 */
  onPortMouseLeave?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 节点鼠标按下 */
  onNodeMouseDown?: (node: FlowNode, event: MouseEvent) => void;
}

/**
 * Flow 节点列表组件
 */
export default defineComponent({
  name: 'FlowNodes',
  props: {
    nodes: {
      type: Array as PropType<FlowNode[]>,
      required: true
    },
    selectedNodeIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    lockedNodeIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    draggingNodeId: {
      type: String as PropType<string | null>,
      default: null
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
    },
    enableViewportCulling: {
      type: Boolean,
      default: true
    },
    viewportCullingBuffer: {
      type: Number,
      default: 200
    },
    onNodeClick: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDoubleClick: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDragStart: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDrag: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDragStop: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseDown: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseUp: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseEnter: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseLeave: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onNodeMouseDown: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    }
  },
  setup(props) {
    // ✅ 性能优化：使用 Set 替代 Array.includes()，O(n) → O(1)
    const selectedNodeIdsSet = computed(() => new Set(props.selectedNodeIds));
    const lockedNodeIdsSet = computed(() => new Set(props.lockedNodeIds));

    // 创建空间索引实例（性能优化：O(n) -> O(log n)）
    const spatialIndex = ref(new SpatialIndex());

    // 版本号控制，避免深度监听的性能问题
    const nodesVersion = ref(0);

    // 监听节点数组长度变化（浅监听，性能优化）
    watch(
      () => [props.nodes.length, nodesVersion.value] as const,
      () => {
        if (props.enableViewportCulling && props.nodes.length > 0) {
          spatialIndex.value.updateNodes(props.nodes);
        }
      },
      { immediate: true, deep: false } // 使用浅监听，避免性能问题
    );

    // ✅ 性能优化：使用哈希码代替字符串拼接
    const getNodesPositionHash = (nodes: FlowNode[]): number => {
      let hash = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        // 使用位运算计算哈希
        hash = ((hash << 5) - hash) + n.position.x;
        hash = ((hash << 5) - hash) + n.position.y;
        hash = hash | 0; // Convert to 32bit integer
      }
      return hash;
    };

    // ✅ 性能优化：增量更新空间索引（拖拽时只更新变化的节点）
    const lastNodePositions = new Map<string, { x: number; y: number }>();
    let lastHash = 0;

    /**
     * 更新空间索引
     * 
     * 检测变化的节点，智能选择增量更新或全量更新
     */
    const updateSpatialIndex = () => {
      if (!props.enableViewportCulling || props.nodes.length === 0) {
        return;
      }

      // ✅ 关键优化：检测变化的节点，只更新这些节点
      const changedNodeIds = new Set<string>();

      for (const node of props.nodes) {
        const lastPos = lastNodePositions.get(node.id);
        if (!lastPos || lastPos.x !== node.position.x || lastPos.y !== node.position.y) {
          changedNodeIds.add(node.id);
          lastNodePositions.set(node.id, { x: node.position.x, y: node.position.y });
        }
      }

      // ✅ 如果变化的节点很少（< 10%），使用增量更新
      if (changedNodeIds.size > 0 && changedNodeIds.size < props.nodes.length * 0.1) {
        // 增量更新：只更新变化的节点
        for (const nodeId of changedNodeIds) {
          const node = props.nodes.find(n => n.id === nodeId);
          if (node) {
            spatialIndex.value.updateNode(node);
          }
        }
      } else if (changedNodeIds.size > 0) {
        // 全量更新：变化太多时，全量更新更快
        spatialIndex.value.updateNodes(props.nodes);
        // 更新位置缓存
        lastNodePositions.clear();
        for (const node of props.nodes) {
          lastNodePositions.set(node.id, { x: node.position.x, y: node.position.y });
        }
      }
    };

    // ✅ 使用 RAF 节流更新空间索引
    const { throttled: throttledUpdateSpatialIndex } = useRafThrottle(updateSpatialIndex);

    // 监听节点数量变化（立即更新空间索引）
    watch(
      () => props.nodes.length,
      () => {
        // 节点数量变化时立即更新空间索引
        if (props.enableViewportCulling && props.nodes.length > 0) {
          spatialIndex.value.updateNodes(props.nodes);
          lastHash = getNodesPositionHash(props.nodes);
          // 更新位置缓存
          lastNodePositions.clear();
          for (const node of props.nodes) {
            lastNodePositions.set(node.id, { x: node.position.x, y: node.position.y });
          }
        }
      },
      { immediate: true }
    );

    // 监听节点位置变化（使用 RAF 节流优化性能）
    watch(
      () => getNodesPositionHash(props.nodes),
      (newHash) => {
        // 如果哈希没变化，跳过更新
        if (newHash === lastHash) {
          return;
        }

        lastHash = newHash;

        // ✅ 使用 RAF 节流更新空间索引
        throttledUpdateSpatialIndex();
      },
      { deep: false }
    );

    // ✅ 性能优化：稳定 visibleNodes 数组引用，避免不必要的重新渲染
    const visibleNodesRef = shallowRef<FlowNode[]>([]);
    const lastVisibleNodeIds = new Set<string>();

    // 使用 watch 代替 computed，只有节点集合真正变化时才更新数组引用
    watch(
      () => [
        props.nodes,
        props.enableViewportCulling,
        props.viewport.x,
        props.viewport.y,
        props.viewport.zoom,
        spatialIndex.value
      ] as const,
      () => {
        // 如果禁用视口裁剪，直接使用所有节点
        if (!props.enableViewportCulling) {
          if (visibleNodesRef.value !== props.nodes) {
            visibleNodesRef.value = props.nodes;
            lastVisibleNodeIds.clear();
            props.nodes.forEach(n => lastVisibleNodeIds.add(n.id));
          }
          return;
        }

        // 获取视口区域（考虑缩放）
        const viewportX = -props.viewport.x / props.viewport.zoom;
        const viewportY = -props.viewport.y / props.viewport.zoom;
        const viewportWidth = (window.innerWidth || 1000) / props.viewport.zoom;
        const viewportHeight = (window.innerHeight || 1000) / props.viewport.zoom;

        // 扩展视口区域（添加缓冲区）
        const buffer = props.viewportCullingBuffer / props.viewport.zoom;
        const minX = viewportX - buffer;
        const minY = viewportY - buffer;
        const maxX = viewportX + viewportWidth + buffer;
        const maxY = viewportY + viewportHeight + buffer;

        // 查询可见节点
        let newVisibleNodes: FlowNode[];

        if (props.nodes.length > 50) {
          // 使用空间索引查询（性能提升 10-20 倍）
          newVisibleNodes = spatialIndex.value.query({
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY
          });
        } else {
          // 节点数量少时使用线性查找（避免索引开销）
          newVisibleNodes = props.nodes.filter(node => {
            const nodeX = node.position.x;
            const nodeY = node.position.y;
            const nodeWidth = node.size?.width || 220;
            const nodeHeight = node.size?.height || 72;

            // 检查节点是否与视口相交
            return (
              nodeX + nodeWidth >= minX &&
              nodeX <= maxX &&
              nodeY + nodeHeight >= minY &&
              nodeY <= maxY
            );
          });
        }

        // ✅ 关键优化：比较节点 ID 集合，只有真正变化时才更新数组引用
        const newIds = new Set(newVisibleNodes.map(n => n.id));

        // 如果数量不同，肯定变了
        if (newIds.size !== lastVisibleNodeIds.size) {
          visibleNodesRef.value = newVisibleNodes;
          lastVisibleNodeIds.clear();
          newIds.forEach(id => lastVisibleNodeIds.add(id));
          return;
        }

        // 检查是否有不同的节点 ID
        let hasChange = false;
        for (const id of newIds) {
          if (!lastVisibleNodeIds.has(id)) {
            hasChange = true;
            break;
          }
        }

        // 只有节点集合真正变化时才更新数组引用
        if (hasChange) {
          visibleNodesRef.value = newVisibleNodes;
          lastVisibleNodeIds.clear();
          newIds.forEach(id => lastVisibleNodeIds.add(id));
        }
        // 否则保持 visibleNodesRef.value 不变，Vue 不会触发 v-for 重新渲染
      },
      { immediate: true, deep: false }
    );

    // ✅ 性能优化：缓存 state 对象，避免不必要的组件重新渲染
    const stateCache = new Map<string, { selected: boolean; locked: boolean; hovered: boolean; dragging: boolean }>();

    // 计算节点状态
    const getNodeState = (node: FlowNode) => {
      const isSelected = selectedNodeIdsSet.value.has(node.id); // ✅ O(1) 查找
      const isLocked = lockedNodeIdsSet.value.has(node.id); // ✅ O(1) 查找
      const selected = isSelected || node.selected === true;
      const locked = isLocked || node.locked === true;

      // ✅ 生成缓存键
      const cacheKey = `${node.id}-${selected}-${locked}`;

      // ✅ 检查缓存
      const cached = stateCache.get(cacheKey);
      if (cached) {
        return cached; // BaseNode 不会重新渲染
      }

      // 创建新 state 对象
      const state = {
        selected,
        locked,
        hovered: false, // 可以通过鼠标事件更新
        dragging: false // 可以通过拖拽事件更新
      };

      // ✅ 缓存
      stateCache.set(cacheKey, state);

      // ✅ 清理旧缓存
      if (stateCache.size > 500) {
        const keys = Array.from(stateCache.keys());
        for (let i = 0; i < 100; i++) {
          stateCache.delete(keys[i]);
        }
      }

      return state;
    };

    // ✅ 性能优化：缓存 style 对象，避免不必要的 DOM 更新
    const styleCache = new Map<string, Record<string, any>>();

    // 计算节点样式（使用原始画布坐标，由父容器 CSS transform 处理缩放）
    const getNodeStyle = (node: FlowNode) => {
      // 节点使用原始画布坐标，缩放由父容器的 CSS transform 处理
      // 这样与 ai-workflow 的实现保持一致
      const x = node.position.x;
      const y = node.position.y;

      // 计算当前应该有的 zIndex
      const isSelected = selectedNodeIdsSet.value.has(node.id);
      const isDragging = props.draggingNodeId === node.id;

      let zIndex: number | undefined;
      if (isDragging) {
        zIndex = 1000; // 拖拽节点最高层级
      } else if (isSelected) {
        zIndex = 2; // 选中节点次之
      }
      // 普通节点不设置 z-index，使用默认的 DOM 顺序（性能最优）

      // ✅ 生成缓存键（包含所有影响样式的因素）
      // 使用 Math.round 减少因微小位置变化导致的缓存失效
      const width = node.size?.width || 220;
      const height = node.size?.height || 72;
      const cacheKey = `${node.id}-${Math.round(x)}-${Math.round(y)}-${width}-${height}-${zIndex ?? 'none'}`;

      // ✅ 检查缓存，如果样式没变则返回相同对象引用
      const cached = styleCache.get(cacheKey);
      if (cached) {
        return cached; // Vue 不会检测到变化，不会触发 DOM 更新
      }

      // 创建新样式对象
      const style: Record<string, any> = {
        position: 'absolute' as const,
        left: `${x}px`,
        top: `${y}px`,
        // 节点大小使用原始尺寸，由 CSS transform scale 自动缩放
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'auto' as const,
        willChange: 'transform' as const,
        backfaceVisibility: 'hidden' as const,
        perspective: '1000px'
      };

      // 只在需要时添加 zIndex 属性
      if (zIndex !== undefined) {
        style.zIndex = zIndex;
      }

      // ✅ 缓存新样式对象
      styleCache.set(cacheKey, style);

      // ✅ 清理旧缓存（防止内存泄漏）
      if (styleCache.size > 500) {
        // 删除最旧的 100 个缓存项
        const keys = Array.from(styleCache.keys());
        for (let i = 0; i < 100; i++) {
          styleCache.delete(keys[i]);
        }
      }

      return style;
    };

    // 事件处理
    const handleNodeClick = (node: FlowNode, event: MouseEvent) => {
      if (props.onNodeClick) {
        props.onNodeClick(node, event);
      }
    };

    const handleNodeDoubleClick = (node: FlowNode, event: MouseEvent) => {
      if (props.onNodeDoubleClick) {
        props.onNodeDoubleClick(node, event);
      }
    };

    return () => (
      <div class="flow-nodes" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {visibleNodesRef.value.map((node: FlowNode) => {
          const state = getNodeState(node);
          const style = getNodeStyle(node);

          return (
            <div
              key={node.id}
              style={style}
              onClick={(event: MouseEvent) => handleNodeClick(node, event)}
              onDblclick={(event: MouseEvent) => handleNodeDoubleClick(node, event)}
              onMousedown={(event: MouseEvent) => {
                if (props.onNodeMouseDown) {
                  props.onNodeMouseDown(node, event);
                }
              }}
            >
              <BaseNode
                node={node}
                selected={state.selected}
                locked={state.locked}
                hovered={state.hovered}
                dragging={state.dragging}
                onPort-mousedown={(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => {
                  if (props.onPortMouseDown) {
                    props.onPortMouseDown(nodeId, handleId, handleType, event);
                  }
                }}
                onPort-mouseup={(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => {
                  if (props.onPortMouseUp) {
                    props.onPortMouseUp(nodeId, handleId, handleType, event);
                  }
                }}
                onPort-mouseenter={(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => {
                  if (props.onPortMouseEnter) {
                    props.onPortMouseEnter(nodeId, handleId, handleType, event);
                  }
                }}
                onPort-mouseleave={(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => {
                  if (props.onPortMouseLeave) {
                    props.onPortMouseLeave(nodeId, handleId, handleType, event);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }
});

