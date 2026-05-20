import {
  type CSSProperties,
  type PropType,
  Teleport,
  Transition,
  type VNode,
  computed,
  defineComponent
} from 'vue';
import { NIcon } from 'naive-ui';
import type { DragItem, DragOperation, Point } from './types';
import '@/styles/common-interaction.scss';

export default defineComponent({
  name: 'DragPreview',
  props: {
    items: {
      type: Array as PropType<DragItem[]>,
      required: true
    },
    isDragging: {
      type: Boolean,
      required: true
    },
    dragStartPos: {
      type: Object as PropType<Point | null>,
      default: null
    },
    dragCurrentPos: {
      type: Object as PropType<Point | null>,
      default: null
    },
    operation: {
      type: String as PropType<DragOperation>,
      default: 'move'
    },
    maxItems: {
      type: Number,
      default: 3
    },
    offset: {
      type: Object as PropType<Point>,
      default: () => ({ x: 10, y: 10 })
    },
    showOperationIcon: {
      type: Boolean,
      default: true
    },
    showCountBadge: {
      type: Boolean,
      default: true
    },
    showRemainingCount: {
      type: Boolean,
      default: true
    },
    itemRenderer: {
      type: Function as PropType<(item: DragItem, index: number) => VNode>,
      default: undefined
    },
    iconResolver: {
      type: Function as PropType<(item: DragItem) => string>,
      default: undefined
    },
    previewStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },
    teleportTo: {
      type: String,
      default: 'body'
    }
  },
  setup(props) {
    const displayItems = computed(() => props.items.slice(0, props.maxItems));

    const remainingCount = computed(() => Math.max(0, props.items.length - props.maxItems));

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
        transform: 'translate(0, 0)',
        ...props.previewStyle
      };
    });

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

    function getItemIcon(item: DragItem): string {
      if (props.iconResolver) {
        return props.iconResolver(item);
      }

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

    function getItemName(item: DragItem): string {
      return item.name || item.id;
    }

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
          {displayItems.value.map((item, index) => {
            if (props.itemRenderer) {
              return props.itemRenderer(item, index);
            }
            return renderDefaultItem(item, index);
          })}

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

    return () => (
      <Teleport to={props.teleportTo}>
        <Transition
          name="drag-preview"
          appear
          enterActiveClass="drag-preview-enter-active"
          leaveActiveClass="drag-preview-leave-active"
        >
          {props.isDragging && props.dragCurrentPos && (
            <div class="drag-preview" style={previewPositionStyle.value}>
              {renderPreviewContent()}
            </div>
          )}
        </Transition>
      </Teleport>
    );
  }
});
