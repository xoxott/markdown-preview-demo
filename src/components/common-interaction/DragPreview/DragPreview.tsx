/**
 * DragPreview - 通用拖拽预览组件
 *
 * 在拖拽操作时显示跟随鼠标的预览卡片
 */

import { computed, defineComponent, Teleport, Transition, type CSSProperties, type PropType, type VNode } from 'vue';
import { NIcon, NBadge } from 'naive-ui';
import type { DragItem, DragOperation, Point } from '../types';
import '@/styles/common-interaction.scss';

export default defineComponent({
  name: 'DragPreview',
  props: {
    /** 拖拽的项目列表 */
    items: {
      type: Array as PropType<DragItem[]>,
      required: true
    },
    /** 是否正在拖拽 */
    isDragging: {
      type: Boolean,
      required: true
    },
    /** 拖拽起始位置 */
    dragStartPos: {
      type: Object as PropType<Point | null>,
      default: null
    },
    /** 拖拽当前位置 */
    dragCurrentPos: {
      type: Object as PropType<Point | null>,
      default: null
    },
    /** 操作类型 */
    operation: {
      type: String as PropType<DragOperation>,
      default: 'move'
    },
    /** 最大显示项数 */
    maxItems: {
      type: Number,
      default: 3
    },
    /** 预览偏移量 */
    offset: {
      type: Object as PropType<Point>,
      default: () => ({ x: 10, y: 10 })
    },
    /** 是否显示操作图标 */
    showOperationIcon: {
      type: Boolean,
      default: true
    },
    /** 是否显示数量徽章 */
    showCountBadge: {
      type: Boolean,
      default: true
    },
    /** 是否显示剩余数量提示 */
    showRemainingCount: {
      type: Boolean,
      default: true
    },
    /** 自定义项渲染器 */
    itemRenderer: {
      type: Function as PropType<(item: DragItem, index: number) => VNode>,
      default: undefined
    },
    /** 自定义图标解析器 */
    iconResolver: {
      type: Function as PropType<(item: DragItem) => string>,
      default: undefined
    },
    /** 自定义样式 */
    previewStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },
    /** Teleport 目标 */
    teleportTo: {
      type: String,
      default: 'body'
    }
  },
  setup(props) {
    // ==================== 计算属性 ====================

    /** 显示的项目 */
    const displayItems = computed(() => {
      return props.items.slice(0, props.maxItems);
    });

    /** 剩余项目数 */
    const remainingCount = computed(() => {
      return Math.max(0, props.items.length - props.maxItems);
    });

    /** 预览位置样式 */
    const previewPositionStyle = computed<CSSProperties>(() => {
      if (!props.dragCurrentPos) {
        return { display: 'none' };
      }

      return {
        position: 'fixed',
        left: `${props.dragCurrentPos.x + props.offset.x}px`,
        top: `${props.dragCurrentPos.y + props.offset.y}px`,
        pointerEvents: 'none',
        zIndex: 10000,
        transform: 'translate(0, 0)', // 防止模糊
        ...props.previewStyle
      };
    });

    /** 操作图标 */
    const operationIcon = computed(() => {
      switch (props.operation) {
        case 'copy':
          return 'material-symbols:content-copy';
        case 'move':
          return 'material-symbols:drive-file-move';
        case 'link':
          return 'material-symbols:link';
        default:
          return 'material-symbols:drag-indicator';
      }
    });

    /** 操作文本 */
    const operationText = computed(() => {
      switch (props.operation) {
        case 'copy':
          return '复制';
        case 'move':
          return '移动';
        case 'link':
          return '链接';
        default:
          return '拖拽';
      }
    });

    // ==================== 工具函数 ====================

    /**
     * 获取项目图标
     */
    function getItemIcon(item: DragItem): string {
      if (props.iconResolver) {
        return props.iconResolver(item);
      }

      // 默认图标映射
      const iconMap: Record<string, string> = {
        file: 'material-symbols:description',
        folder: 'material-symbols:folder',
        image: 'material-symbols:image',
        video: 'material-symbols:videocam',
        audio: 'material-symbols:music-note',
        code: 'material-symbols:code',
        archive: 'material-symbols:folder-zip',
        document: 'material-symbols:article',
        node: 'material-symbols:account-tree',
        default: 'material-symbols:draft'
      };

      return iconMap[item.type] || iconMap.default;
    }

    /**
     * 获取项目显示名称
     */
    function getItemName(item: DragItem): string {
      return item.name || item.id;
    }

    // ==================== 渲染函数 ====================

    /**
     * 渲染默认项
     */
    function renderDefaultItem(item: DragItem, index: number) {
      return (
        <div
          key={item.id}
          class="drag-preview-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: '#fff',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            marginBottom: index < displayItems.value.length - 1 ? '4px' : '0',
            transform: `translateY(${index * 2}px)`
          }}
        >
          <NIcon size={20} color="#666">
            <svg>
              <use href={`#icon-${getItemIcon(item)}`} />
            </svg>
          </NIcon>
          <span
            style={{
              fontSize: '14px',
              color: '#333',
              fontWeight: 500,
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {getItemName(item)}
          </span>
        </div>
      );
    }

    /**
     * 渲染预览内容
     */
    function renderPreviewContent() {
      return (
        <div
          class="drag-preview-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* 项目列表 */}
          {displayItems.value.map((item, index) => {
            if (props.itemRenderer) {
              return props.itemRenderer(item, index);
            }
            return renderDefaultItem(item, index);
          })}

          {/* 剩余数量提示 */}
          {props.showRemainingCount && remainingCount.value > 0 && (
            <div
              class="drag-preview-more"
              style={{
                padding: '6px 12px',
                background: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                textAlign: 'center',
                fontWeight: 500
              }}
            >
              +{remainingCount.value} 更多
            </div>
          )}

          {/* 操作提示 */}
          {props.showOperationIcon && (
            <div
              class="drag-preview-operation"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(33, 150, 243, 0.9)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                marginTop: '4px'
              }}
            >
              <NIcon size={14}>
                <svg>
                  <use href={`#icon-${operationIcon.value}`} />
                </svg>
              </NIcon>
              <span>{operationText.value}</span>
            </div>
          )}

          {/* 数量徽章 */}
          {props.showCountBadge && props.items.length > 1 && (
            <div
              class="drag-preview-badge"
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                minWidth: '24px',
                height: '24px',
                padding: '0 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5222d',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              {props.items.length}
            </div>
          )}
        </div>
      );
    }

    // ==================== 主渲染 ====================

    return () => (
      <Teleport to={props.teleportTo}>
        <Transition
          name="drag-preview"
          appear
          enterActiveClass="drag-preview-enter-active"
          leaveActiveClass="drag-preview-leave-active"
        >
          {props.isDragging && props.dragCurrentPos && (
            <div
              class="drag-preview"
              style={previewPositionStyle.value}
            >
              {renderPreviewContent()}
            </div>
          )}
        </Transition>
      </Teleport>
    );
  }
});

