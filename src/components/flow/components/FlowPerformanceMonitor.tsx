/**
 * Flow 性能监控组件
 *
 * 显示实时 FPS、节点数量、渲染时间等性能指标
 */

import { defineComponent, ref, computed, watch, onUnmounted, type PropType, type CSSProperties } from 'vue';
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

/**
 * 性能等级枚举
 */
export enum PerformanceLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

/**
 * 性能等级配置
 */
const PERFORMANCE_CONFIG = {
  [PerformanceLevel.EXCELLENT]: {
    label: '优秀',
    color: '#52c41a',
    minFps: 55
  },
  [PerformanceLevel.GOOD]: {
    label: '良好',
    color: '#1890ff',
    minFps: 40
  },
  [PerformanceLevel.FAIR]: {
    label: '一般',
    color: '#faad14',
    minFps: 25
  },
  [PerformanceLevel.POOR]: {
    label: '较差',
    color: '#f5222d',
    minFps: 0
  }
} as const;

/**
 * 性能颜色常量
 */
const PERFORMANCE_COLORS = {
  EXCELLENT: '#52c41a',
  GOOD: '#1890ff',
  FAIR: '#faad14',
  POOR: '#f5222d',
  WARNING: '#faad14',
  ERROR: '#f5222d',
  DEFAULT: '#8c8c8c'
} as const;

/**
 * 性能阈值常量
 */
const PERFORMANCE_THRESHOLDS = {
  EXCELLENT_FPS: 55,
  GOOD_FPS: 40,
  FAIR_FPS: 25,
  MIN_FPS_WARNING: 45,
  MIN_FPS_ERROR: 25,
  FRAME_TIME_WARNING: 20
} as const;

/**
 * 更新间隔常量（毫秒）
 */
const UPDATE_INTERVALS = {
  DISPLAY: 500,
  MEMORY: 1000
} as const;

/**
 * 显示文本常量
 */
const LABELS = {
  TITLE: '性能监控',
  FPS: 'FPS',
  FRAME_TIME: '帧时间',
  MIN_FPS: '最低FPS',
  NODES: '节点',
  EDGES: '连接线',
  MEMORY: '内存',
  PERFORMANCE: '性能',
  PEAK: '峰值',
  UNIT_MB: 'MB',
  UNIT_MS: 'ms'
} as const;

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
      default: 'top-left' as const
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    }
  },
  setup(props) {
    // 性能指标（只存储必要的值，避免重复计算）
    const fps = ref(60);
    const frameTime = ref(16.67);
    const minFps = ref(60);
    const maxFrameTime = ref(16.67);
    const memoryUsage = ref<number | undefined>(undefined);

    // RAF 循环中只累加帧数，最小化每帧开销
    let frameCount = 0;
    let lastTime = performance.now();
    let lastFrameTime = performance.now();
    let currentMinFps = 60;
    let currentMaxFrameTime = 0;

    /**
     * RAF 循环回调：只累加帧数和记录单帧时间
     */
    const onFrame = () => {
      const now = performance.now();
      frameCount++;

      // 计算单帧时间（轻量级操作）
      const singleFrameTime = now - lastFrameTime;
      lastFrameTime = now;

      // 记录最小 FPS（只在帧时间异常时计算，避免每帧都计算）
      if (singleFrameTime > PERFORMANCE_THRESHOLDS.FRAME_TIME_WARNING) {
        const instantFps = Math.round(1000 / singleFrameTime);
        if (instantFps < currentMinFps) {
          currentMinFps = instantFps;
        }
      }

      // 记录最大帧时间
      if (singleFrameTime > currentMaxFrameTime) {
        currentMaxFrameTime = singleFrameTime;
      }
    };

    /**
     * 定时更新显示值（每 500ms 执行一次）
     */
    const updateDisplayValues = () => {
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed > 0 && frameCount > 0) {
        // 只计算 FPS，frameTime 通过倒数获得（避免重复计算）
        fps.value = Math.round((frameCount * 1000) / elapsed);
        frameTime.value = parseFloat((1000 / fps.value).toFixed(2));
        minFps.value = currentMinFps;
        maxFrameTime.value = parseFloat(currentMaxFrameTime.toFixed(2));

        // 重置计数器和最值
        frameCount = 0;
        lastTime = now;
        currentMinFps = 60;
        currentMaxFrameTime = 0;
      }
    };

    /**
     * 单独的内存监控（每 1s 执行一次，降低开销）
     * 性能优化：内存查询有开销，使用慢频率定时器
     */
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        memoryUsage.value = parseFloat((memory.usedJSHeapSize / 1024 / 1024).toFixed(1));
      }
    };

    useRafLoop(onFrame);

    const displayInterval = setInterval(updateDisplayValues, UPDATE_INTERVALS.DISPLAY);

    const memoryInterval = setInterval(updateMemoryUsage, UPDATE_INTERVALS.MEMORY);

    // 立即执行一次更新
    updateDisplayValues();
    updateMemoryUsage();

    // 清理定时器
    onUnmounted(() => {
      clearInterval(displayInterval);
      clearInterval(memoryInterval);
    });

    const performanceLevel = ref<PerformanceLevel>(PerformanceLevel.EXCELLENT);
    const performanceColor = ref<string>(PERFORMANCE_COLORS.EXCELLENT);

    const updatePerformanceLevel = () => {
      if (fps.value >= PERFORMANCE_THRESHOLDS.EXCELLENT_FPS) {
        performanceLevel.value = PerformanceLevel.EXCELLENT;
        performanceColor.value = PERFORMANCE_COLORS.EXCELLENT;
      } else if (fps.value >= PERFORMANCE_THRESHOLDS.GOOD_FPS) {
        performanceLevel.value = PerformanceLevel.GOOD;
        performanceColor.value = PERFORMANCE_COLORS.GOOD;
      } else if (fps.value >= PERFORMANCE_THRESHOLDS.FAIR_FPS) {
        performanceLevel.value = PerformanceLevel.FAIR;
        performanceColor.value = PERFORMANCE_COLORS.FAIR;
      } else {
        performanceLevel.value = PerformanceLevel.POOR;
        performanceColor.value = PERFORMANCE_COLORS.POOR;
      }
    };

    watch(fps, updatePerformanceLevel, { immediate: true });

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

    const staticStyles = {
      container: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px'
      },
      row: {
        display: 'flex',
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const
      },
      label: {
        opacity: 0.8
      },
      header: {
        marginBottom: '8px',
        fontSize: '13px',
        fontWeight: 'bold' as const,
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        paddingBottom: '6px'
      },
      footer: {
        marginTop: '6px',
        paddingTop: '6px',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        textAlign: 'center' as const,
        fontSize: '11px',
        opacity: 0.8
      },
      smallText: {
        opacity: 0.6,
        marginLeft: '4px',
        fontSize: '10px'
      },
      percentageText: {
        opacity: 0.6,
        marginLeft: '4px'
      }
    };


    // 获取最低 FPS 的颜色
    const getMinFpsColor = (minFps: number): string => {
      if (minFps < PERFORMANCE_THRESHOLDS.MIN_FPS_ERROR) {
        return PERFORMANCE_COLORS.ERROR;
      } else if (minFps < PERFORMANCE_THRESHOLDS.MIN_FPS_WARNING) {
        return PERFORMANCE_COLORS.WARNING;
      }
      return PERFORMANCE_COLORS.EXCELLENT;
    };

    return () => (
      <div style={{ ...positionStyle.value, ...props.style }}>
        <div style={staticStyles.header}>
          {LABELS.TITLE}
        </div>

        <div style={staticStyles.container}>
          {/* FPS */}
          <div style={staticStyles.row}>
            <span style={staticStyles.label}>{LABELS.FPS}:</span>
            <span style={{
              fontWeight: 'bold',
              color: performanceColor.value,
              fontSize: '14px'
            }}>
              {fps.value}
            </span>
          </div>

          {/* 帧时间（平均/最大） */}
          <div style={staticStyles.row}>
            <span style={staticStyles.label}>{LABELS.FRAME_TIME}:</span>
            <span>
              {frameTime.value}{LABELS.UNIT_MS}
              <span style={staticStyles.smallText}>
                ({LABELS.PEAK}: {maxFrameTime.value}{LABELS.UNIT_MS})
              </span>
            </span>
          </div>

          {/* 最低 FPS */}
          <div style={staticStyles.row}>
            <span style={staticStyles.label}>{LABELS.MIN_FPS}:</span>
            <span style={{
              color: getMinFpsColor(minFps.value)
            }}>
              {minFps.value}
            </span>
          </div>

          {/* 节点数量 */}
          <div style={staticStyles.row}>
            <span style={staticStyles.label}>{LABELS.NODES}:</span>
            <span>
              {props.visibleNodes} / {props.totalNodes}
              {props.totalNodes > 0 && (
                <span style={staticStyles.percentageText}>
                  ({Math.round((props.visibleNodes / props.totalNodes) * 100)}%)
                </span>
              )}
            </span>
          </div>

          {/* 连接线数量 */}
          <div style={staticStyles.row}>
            <span style={staticStyles.label}>{LABELS.EDGES}:</span>
            <span>
              {props.visibleEdges} / {props.totalEdges}
              {props.totalEdges > 0 && (
                <span style={staticStyles.percentageText}>
                  ({Math.round((props.visibleEdges / props.totalEdges) * 100)}%)
                </span>
              )}
            </span>
          </div>

          {/* 内存使用 */}
          {memoryUsage.value !== undefined && (
            <div style={staticStyles.row}>
              <span style={staticStyles.label}>{LABELS.MEMORY}:</span>
              <span>{memoryUsage.value} {LABELS.UNIT_MB}</span>
            </div>
          )}

          {/* 性能等级 */}
          <div style={staticStyles.footer}>
            {LABELS.PERFORMANCE}: <span style={{ color: performanceColor.value, fontWeight: 'bold' }}>
              {PERFORMANCE_CONFIG[performanceLevel.value].label}
            </span>
          </div>
        </div>
      </div>
    );
  }
});

