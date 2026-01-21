/**
 * StreamingPenEffect 组件
 * 实现光标位置追踪，让笔跟随文字末尾移动
 */
import {
  defineComponent,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  type PropType,
  computed,
  type CSSProperties
} from 'vue';
import './index.scss';

// ==================== 类型定义 ====================

interface PenPosition {
  x: number;
  y: number;
}

// ==================== 常量配置 ====================

const DEFAULT_CONFIG = {
  PEN_COLOR: '#92400e',
  PEN_SIZE: 24,
  OFFSET_X: 0.2,
  OFFSET_Y: -0.8,
  POSITION_THRESHOLD: {
    X: 50,  // 超过 50px 认为是换行
    Y: 20   // 超过 20px 认为是换行
  },
  TRANSITION_DURATION: 0.05,  // 200ms
  ANIMATION_DURATION: 0.8,     // 书写动画时长
} as const;

// ==================== SVG 路径定义（可扩展） ====================

/**
 * 生成羽毛笔 SVG 路径
 * 可以轻松替换为其他笔的样式
 */
const createQuillPenSVG = (penColor: string) => ({
  // 羽毛笔主体
  mainBody: {
    d: 'M4.5 22 L5.5 20.5 L7 18 L8.5 15 L10 12 L11.5 9 L13 6.5 L14.5 4.5 L15.5 3 L16.5 2.5 L17 2.8 L17.3 3.2 L17 3.8 L16 5 L14.5 7 L12.5 10 L10.5 13 L8.5 16 L6.5 18.5 L5.5 20 L4.5 21.5 Z',
    fill: penColor,
    opacity: 0.85
  },
  // 左侧边缘
  leftEdge: {
    d: 'M5 21.5 L6 19.5 L7.5 16.5 L9 13.5 L10.5 10.5 L12 7.5 L13.5 5 L14.7 3.5 L15.5 2.8',
    stroke: penColor,
    strokeWidth: 0.8,
    opacity: 0.6
  },
  // 右侧边缘
  rightEdge: {
    d: 'M5.5 21 L6.5 19 L8 16 L9.5 13 L11 10 L12.5 7.5 L14 5.5 L15.3 4 L16 3.2',
    stroke: penColor,
    strokeWidth: 0.8,
    opacity: 0.6
  },
  // 纹理线条
  textureLines: [
    { d: 'M8.5 15 L10.5 11 L12.5 7.5 L14 5 L15 3.5' },
    { d: 'M7.5 16 L9.5 12.5 L11.5 9 L13 6.5 L14.3 4.5' },
    { d: 'M9.5 14 L11.5 10.5 L13 8 L14.3 6 L15.3 4.2' }
  ],
  // 笔杆
  penHolder: {
    d: 'M16 3 L16.5 2.8 L17 2.5 L17.5 2.8 L18 3.2 L17.8 3.8 L17.2 4.2 L16.5 4 L16 3.5 Z',
    fill: penColor,
    opacity: 0.7
  },
  // 笔尖
  penTip: {
    d: 'M4.5 22 L4.6 21.2 L4.8 20.8 L4.9 21 L4.6 21.5 Z',
    fill: penColor,
    opacity: 0.9
  },
  // 高光
  highlight: {
    d: 'M6.5 19 L8.5 15 L10.5 11.5 L12.5 8.5 L14 6 L15 4.2',
    stroke: 'rgba(255, 255, 255, 0.3)',
    strokeWidth: 0.5
  }
});

// ==================== 工具函数 ====================

/**
 * 递归获取所有文本节点
 * 使用 TreeWalker 高效遍历
 */
const getTextNodes = (element: HTMLElement): Text[] => {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 只接受非空文本节点
        return node.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    }
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  return textNodes;
};

/**
 * 验证位置是否有效
 */
const isValidPosition = (x: number, y: number): boolean => {
  return !isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y);
};

/**
 * 计算位置变化距离
 */
const calculatePositionDelta = (
  oldPos: PenPosition,
  newPos: PenPosition
): { dx: number; dy: number } => ({
  dx: Math.abs(oldPos.x - newPos.x),
  dy: Math.abs(oldPos.y - newPos.y)
});

// ==================== 组件定义 ====================

export default defineComponent({
  name: 'StreamingPenEffect',
  props: {
    isWriting: {
      type: Boolean,
      default: true
    },
    penColor: {
      type: String,
      default: DEFAULT_CONFIG.PEN_COLOR
    },
    size: {
      type: Number,
      default: DEFAULT_CONFIG.PEN_SIZE
    },
    targetRef: {
      type: Object as PropType<HTMLElement | null>,
      default: null
    },
    offsetX: {
      type: Number,
      default: DEFAULT_CONFIG.OFFSET_X
    },
    offsetY: {
      type: Number,
      default: DEFAULT_CONFIG.OFFSET_Y
    },
    positionChangeThreshold: {
      type: Object as PropType<{ x: number; y: number }>,
      default: () => DEFAULT_CONFIG.POSITION_THRESHOLD
    },
    transitionDuration: {
      type: Number,
      default: DEFAULT_CONFIG.TRANSITION_DURATION
    }
  },
  setup(props) {
    // ==================== 状态管理 ====================
    const penPosition = ref<PenPosition>({ x: 0, y: 0 });
    const isVisible = ref(false);
    const containerRef = ref<HTMLElement | null>(null);

    // ==================== 资源管理 ====================
    let rafId: number | null = null;
    let observer: MutationObserver | null = null;

    // ==================== 核心功能函数 ====================

    /**
     * 获取文字末尾的位置
     * 使用 Range API 获取精确位置
     */
    const getTextEndPosition = (): PenPosition | null => {
      const target = props.targetRef;
      if (!target) return null;

      try {
        const textNodes = getTextNodes(target);
        if (textNodes.length === 0) return null;

        const lastTextNode = textNodes[textNodes.length - 1];
        const text = lastTextNode.textContent || '';
        if (text.length === 0) return null;

        // 创建 Range 定位到文字末尾
        const range = document.createRange();
        range.setStart(lastTextNode, text.length);
        range.setEnd(lastTextNode, text.length);

        const rect = range.getBoundingClientRect();
        const containerRect = target.getBoundingClientRect();

        // 计算相对于容器的位置
        const x = rect.right - containerRect.left;
        const y = rect.bottom - containerRect.top;

        // 验证位置有效性
        if (!isValidPosition(x, y)) {
          return null;
        }

        return { x, y };
      } catch (error) {
        // 静默失败，避免快速打字时产生大量日志
        return null;
      }
    };

    /**
     * 更新笔的位置
     */
    const updatePenPosition = (): void => {
      if (!props.isWriting || !props.targetRef) {
        isVisible.value = false;
        return;
      }

      const newPosition = getTextEndPosition();
      if (!newPosition) {
        // 如果获取不到位置，保持上次位置（避免闪烁）
        if (penPosition.value.x === 0 && penPosition.value.y === 0) {
          isVisible.value = false;
        }
        return;
      }

      // 计算位置变化
      const { dx, dy } = calculatePositionDelta(penPosition.value, newPosition);
      const threshold = props.positionChangeThreshold;

      // 位置变化很大（如换行），直接更新
      if (dx > threshold.x || dy > threshold.y) {
        penPosition.value = newPosition;
      } else {
        // 位置变化较小，平滑更新
        penPosition.value = newPosition;
      }

      isVisible.value = true;
    };

    // ==================== 更新机制 ====================

    /**
     * 使用 RAF 优化性能的更新函数
     */
    const scheduleUpdate = (): void => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        updatePenPosition();
        rafId = null;
      });
    };

    // ==================== 监听器管理 ====================

    /**
     * 监听目标元素的变化
     */
    const observeTarget = (): void => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      if (!props.targetRef) return;

      observer = new MutationObserver(() => {
        // 当检测到变化时，使用 RAF 更新位置
        scheduleUpdate();
      });

      observer.observe(props.targetRef, {
        childList: true,
        subtree: true,
        characterData: true
      });
    };

    /**
     * 清理所有资源
     */
    const cleanup = (): void => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    // ==================== 响应式监听 ====================

    // 监听 isWriting 变化
    watch(() => props.isWriting, (newVal) => {
      if (newVal) {
        scheduleUpdate();
      } else {
        isVisible.value = false;
      }
    });

    // 监听 targetRef 变化
    watch(() => props.targetRef, (newRef) => {
      if (newRef) {
        observeTarget();
        scheduleUpdate();
      } else {
        isVisible.value = false;
      }
    }, { immediate: true });

    // ==================== 生命周期 ====================

    onMounted(() => {
      if (props.targetRef) {
        observeTarget();
        scheduleUpdate();
      }

      // 监听窗口大小变化
      window.addEventListener('resize', scheduleUpdate);
    });

    onBeforeUnmount(() => {
      cleanup();
      window.removeEventListener('resize', scheduleUpdate);
    });

    // ==================== 渲染函数 ====================

    return () => {
      if (!isVisible.value) return null;

      const style = computed<CSSProperties>(() => ({
        left: `${penPosition.value.x}px`,
        top: `${penPosition.value.y}px`,
        transform: `translate(${props.size * props.offsetX}px, ${props.size * props.offsetY}px)`,
        transition: `left ${props.transitionDuration}s linear, top ${props.transitionDuration}s linear`
      }));

      // 生成 SVG 路径
      const svgPaths = createQuillPenSVG(props.penColor);

      return (
        <div ref={containerRef} class="streaming-pen-wrapper" style={style.value}>
          <div class="streaming-pen">
            <svg
              width={props.size}
              height={props.size}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="pen-icon"
            >
              {/* 羽毛笔主体 */}
              <path {...svgPaths.mainBody} />

              {/* 左侧边缘 */}
              <path
                {...svgPaths.leftEdge}
                stroke-linecap="round"
                fill="none"
              />

              {/* 右侧边缘 */}
              <path
                {...svgPaths.rightEdge}
                stroke-linecap="round"
                fill="none"
              />

              {/* 纹理线条 */}
              {svgPaths.textureLines.map((line, index) => (
                <path
                  key={index}
                  d={line.d}
                  stroke={props.penColor}
                  stroke-width="0.4"
                  opacity="0.4"
                  stroke-linecap="round"
                  fill="none"
                />
              ))}

              {/* 笔杆 */}
              <path {...svgPaths.penHolder} />

              {/* 笔尖 */}
              <path {...svgPaths.penTip} />

              {/* 高光 */}
              <path
                {...svgPaths.highlight}
                stroke-linecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>
      );
    };
  }
});
