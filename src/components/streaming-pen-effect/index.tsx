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
  nextTick,
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
  OFFSET_Y: - 0.2,
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
 * 获取最后一个文本节点（优化版本）
 * 从后往前查找，找到第一个有效节点就停止，避免遍历整个树
 */
const getLastTextNode = (element: HTMLElement): Text | null => {
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

  // 先遍历到最后一个节点
  let lastNode: Text | null = null;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    lastNode = node as Text;
  }

  return lastNode;
};

/**
 * 递归获取所有文本节点（保留用于兼容性，但已优化为使用 getLastTextNode）
 * @deprecated 优先使用 getLastTextNode
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
    let lastTextNodeCache: Text | null = null; // 缓存最后一个文本节点
    let lastUpdateTime = 0; // 上次更新时间（用于统计，不再限制更新频率）

    // ==================== 核心功能函数 ====================

    /**
     * 获取文字末尾的位置（优化版本）
     * 使用缓存和优化的查找策略，提升长文档性能
     */
    const getTextEndPosition = (): PenPosition | null => {
      const target = props.targetRef;
      if (!target) {
        lastTextNodeCache = null;
        return null;
      }

      try {
        // 先尝试使用缓存的节点（如果仍然有效）
        let lastTextNode = lastTextNodeCache;

        // 验证缓存节点是否仍然有效
        if (lastTextNode && target.contains(lastTextNode)) {
          const text = lastTextNode.textContent || '';
          if (text.length > 0) {
            // 缓存节点有效，直接使用（即使文本内容变化，节点本身仍然有效）
            // 位置会在下面重新计算，因为文本内容可能已经变化
          } else {
            // 缓存节点无效，重新查找
            lastTextNode = null;
          }
        } else {
          // 缓存节点无效或不存在，重新查找
          lastTextNode = null;
        }

        // 如果缓存无效，重新查找最后一个文本节点
        if (!lastTextNode) {
          lastTextNode = getLastTextNode(target);
          lastTextNodeCache = lastTextNode;
        }

        if (!lastTextNode) return null;

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
        lastTextNodeCache = null; // 出错时清除缓存
        return null;
      }
    };

    // 首次位置获取重试计数
    let initialRetryCount = 0;
    const MAX_INITIAL_RETRIES = 3;

    /**
     * 更新笔的位置
     */
    const updatePenPosition = (): void => {
      if (!props.isWriting || !props.targetRef) {
        isVisible.value = false;
        initialRetryCount = 0;
        return;
      }

      const newPosition = getTextEndPosition();
      if (!newPosition) {
        // 如果获取不到位置，且是首次尝试，可以重试几次
        if (initialRetryCount < MAX_INITIAL_RETRIES) {
          initialRetryCount++;
          // 延迟重试，等待 DOM 完全渲染
          setTimeout(() => {
            scheduleUpdate();
          }, 50 * initialRetryCount); // 递增延迟
          return;
        }

        // 如果获取不到位置，保持上次位置（避免闪烁）
        if (penPosition.value.x === 0 && penPosition.value.y === 0) {
          isVisible.value = false;
        }
        initialRetryCount = 0;
        return;
      }

      // 成功获取位置，重置重试计数
      initialRetryCount = 0;

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
     * 移除更新频率限制，确保实时跟随
     */
    const scheduleUpdate = (): void => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        updatePenPosition();
        lastUpdateTime = performance.now();
        rafId = null;
      });
    };

    // ==================== 监听器管理 ====================

    /**
     * 监听目标元素的变化
     * 优化：对结构变化（childList）使用防抖，对文本变化（characterData）立即更新
     */
    const observeTarget = (): void => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      if (!props.targetRef) {
        lastTextNodeCache = null; // 清除缓存
        return;
      }

      // 防抖定时器（仅用于 childList 变化）
      let debounceTimer: number | null = null;
      const DEBOUNCE_DELAY = 100; // 100ms 防抖延迟（仅用于结构变化）

      observer = new MutationObserver((mutations) => {
        let hasStructureChange = false;
        let hasTextChange = false;

        // 分析变化类型
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            hasStructureChange = true;
            // 结构变化时清除缓存
            lastTextNodeCache = null;
          } else if (mutation.type === 'characterData') {
            hasTextChange = true;
            // 文本变化时不清除缓存，但需要重新计算位置
          }
        }

        // 文本内容变化时立即更新（实时跟随）
        if (hasTextChange && !hasStructureChange) {
          // 清除防抖定时器
          if (debounceTimer !== null) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }
          // 立即更新位置
          scheduleUpdate();
        } else if (hasStructureChange) {
          // 结构变化时使用防抖，避免频繁更新
          if (debounceTimer !== null) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = window.setTimeout(() => {
            scheduleUpdate();
            debounceTimer = null;
          }, DEBOUNCE_DELAY);
        }
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
      // 清除缓存
      lastTextNodeCache = null;
      lastUpdateTime = 0;
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
    watch(() => props.targetRef, async (newRef, oldRef) => {
      if (!newRef) {
        isVisible.value = false;
        lastTextNodeCache = null; // 清除缓存
        return;
      }

      // 如果 targetRef 变化，清除缓存
      if (oldRef !== newRef) {
        lastTextNodeCache = null;
      }

      observeTarget();

      // 如果是从 null 变为有值，延迟一下确保 DOM 完全渲染
      if (!oldRef) {
        await nextTick();
        // 再延迟一点确保内容已渲染
        await new Promise(resolve => setTimeout(resolve, 50));
        scheduleUpdate();
      } else {
        scheduleUpdate();
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
