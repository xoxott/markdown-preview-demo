/**
 * Flow 性能监控组件
 *
 * 显示实时 FPS、节点数量、渲染时间等性能指标
 */

import { defineComponent, ref, computed, type PropType, type CSSProperties } from 'vue';
import { useRafLoop } from '../hooks/useRafLoop';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  totalNodes: number;
  visibleNodes: number;
  totalEdges: number;
  visibleEdges: number;
  memoryUsage?: number;
}

export default defineComponent({
  name: 'FlowPerformanceMonitor',
  props: {
    totalNodes: {
      type: Number,
      default: 0
    },
    visibleNodes: {
      type: Number,
      default: 0
    },
    totalEdges: {
      type: Number,
      default: 0
    },
    visibleEdges: {
      type: Number,
      default: 0
    },
    position: {
      type: String as PropType<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>,
      default: 'top-left'
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    }
  },
  setup(props) {
    const fps = ref(60);
    const frameTime = ref(16.67);
    const memoryUsage = ref<number | undefined>(undefined);

    let frameCount = 0;
    let lastTime = performance.now();

    /**
     * 更新 FPS 和性能指标
     *
     * 在 RAF 循环中持续执行，每秒计算一次 FPS
     */
    const updateFPS = () => {
      const now = performance.now();
      frameCount++;

      const elapsed = now - lastTime;
      if (elapsed >= 1000) {
        // 计算 FPS 和帧时间
        fps.value = Math.round((frameCount * 1000) / elapsed);
        frameTime.value = parseFloat((elapsed / frameCount).toFixed(2));
        frameCount = 0;
        lastTime = now;

        // 获取内存使用情况（如果支持）
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          memoryUsage.value = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        }
      }
    };

    useRafLoop(updateFPS);

    // 性能等级
    const performanceLevel = computed(() => {
      if (fps.value >= 55) return 'excellent';
      if (fps.value >= 40) return 'good';
      if (fps.value >= 25) return 'fair';
      return 'poor';
    });

    // 性能颜色
    const performanceColor = computed(() => {
      switch (performanceLevel.value) {
        case 'excellent': return '#52c41a';
        case 'good': return '#1890ff';
        case 'fair': return '#faad14';
        case 'poor': return '#f5222d';
        default: return '#8c8c8c';
      }
    });

    // 位置样式
    const positionStyle = computed(() => {
      const base: CSSProperties = {
        position: 'absolute',
        zIndex: 9999,
        padding: '12px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        minWidth: '200px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)'
      };

      switch (props.position) {
        case 'top-left':
          return { ...base, top: '12px', left: '12px' };
        case 'top-right':
          return { ...base, top: '12px', right: '12px' };
        case 'bottom-left':
          return { ...base, bottom: '12px', left: '12px' };
        case 'bottom-right':
          return { ...base, bottom: '12px', right: '12px' };
        default:
          return { ...base, top: '12px', left: '12px' };
      }
    });


    return () => (
      <div style={{ ...positionStyle.value, ...props.style }}>
        <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '6px' }}>
          性能监控
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* FPS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.8 }}>FPS:</span>
            <span style={{
              fontWeight: 'bold',
              color: performanceColor.value,
              fontSize: '14px'
            }}>
              {fps.value}
            </span>
          </div>

          {/* 帧时间 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.8 }}>帧时间:</span>
            <span>{frameTime.value}ms</span>
          </div>

          {/* 节点数量 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.8 }}>节点:</span>
            <span>
              {props.visibleNodes} / {props.totalNodes}
              {props.totalNodes > 0 && (
                <span style={{ opacity: 0.6, marginLeft: '4px' }}>
                  ({Math.round((props.visibleNodes / props.totalNodes) * 100)}%)
                </span>
              )}
            </span>
          </div>

          {/* 连接线数量 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.8 }}>连接线:</span>
            <span>
              {props.visibleEdges} / {props.totalEdges}
              {props.totalEdges > 0 && (
                <span style={{ opacity: 0.6, marginLeft: '4px' }}>
                  ({Math.round((props.visibleEdges / props.totalEdges) * 100)}%)
                </span>
              )}
            </span>
          </div>

          {/* 内存使用 */}
          {memoryUsage.value !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.8 }}>内存:</span>
              <span>{memoryUsage.value} MB</span>
            </div>
          )}

          {/* 性能等级 */}
          <div style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            textAlign: 'center',
            fontSize: '11px',
            opacity: 0.8
          }}>
            性能: <span style={{ color: performanceColor.value, fontWeight: 'bold' }}>
              {performanceLevel.value === 'excellent' && '优秀'}
              {performanceLevel.value === 'good' && '良好'}
              {performanceLevel.value === 'fair' && '一般'}
              {performanceLevel.value === 'poor' && '较差'}
            </span>
          </div>
        </div>
      </div>
    );
  }
});

