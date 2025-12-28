/**
 * DropZone - 通用拖放目标组件
 *
 * 提供拖放目标区域，支持验证、高亮、自定义样式等功能
 */

import { computed, defineComponent, onBeforeUnmount, onMounted, ref, type CSSProperties, type PropType } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { DragItem, DropTargetState, DropValidator, DropCallbackParams } from '../types';
import '@/styles/common-interaction.scss';

export default defineComponent({
  name: 'DropZone',
  props: {
    /** 唯一标识 */
    id: {
      type: String,
      required: true
    },
    /** 禁用拖放 */
    disabled: {
      type: Boolean,
      default: false
    },
    /** 接受的数据类型 */
    acceptTypes: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    /** 自定义验证器 */
    validator: {
      type: Function as PropType<DropValidator>,
      default: undefined
    },
    /** 是否高亮显示 */
    highlight: {
      type: Boolean,
      default: true
    },
    /** 高亮样式 */
    highlightStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },
    /** 高亮类名 */
    highlightClass: {
      type: String,
      default: ''
    },
    /** 无效时的样式 */
    invalidStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },
    /** 无效时的类名 */
    invalidClass: {
      type: String,
      default: ''
    },
    /** 是否显示提示文本 */
    showHint: {
      type: Boolean,
      default: true
    },
    /** 提示文本 */
    hintText: {
      type: String,
      default: '拖放到此处'
    },
    /** 无效提示文本 */
    invalidHintText: {
      type: String,
      default: '无法放置到此处'
    },
    /** 自定义数据提取器 */
    dataExtractor: {
      type: Function as PropType<(e: DragEvent) => DragItem[]>,
      default: undefined
    }
  },
  emits: {
    'drag-enter': (_params: DropCallbackParams) => true,
    'drag-over': (_params: DropCallbackParams) => true,
    'drag-leave': (_params: DropCallbackParams) => true,
    'drop': (_params: DropCallbackParams) => true
  },
  setup(props, { emit, slots }) {
    // ==================== 状态管理 ====================

    const dropZoneRef = ref<HTMLElement | null>(null);
    const state = ref<DropTargetState>({
      isOver: false,
      canDrop: false,
      operation: null
    });
    const dragCounter = ref(0); // 用于处理嵌套元素的 dragenter/dragleave

    // ==================== 计算属性 ====================

    /** 容器样式 */
    const containerStyle = computed<CSSProperties>(() => {
      const baseStyle: CSSProperties = {
        position: 'relative',
        transition: 'all 0.2s'
      };

      if (props.disabled) {
        return {
          ...baseStyle,
          opacity: 0.5,
          cursor: 'not-allowed'
        };
      }

      if (state.value.isOver) {
        if (state.value.canDrop) {
          return {
            ...baseStyle,
            ...props.highlightStyle
          };
        } else {
          return {
            ...baseStyle,
            ...props.invalidStyle
          };
        }
      }

      return baseStyle;
    });

    /** 容器类名 */
    const containerClass = computed(() => {
      const classes = ['drop-zone'];

      if (props.disabled) {
        classes.push('drop-zone--disabled');
      }

      if (state.value.isOver) {
        classes.push('drop-zone--over');

        if (state.value.canDrop) {
          classes.push('drop-zone--can-drop');
          if (props.highlightClass) {
            classes.push(props.highlightClass);
          }
        } else {
          classes.push('drop-zone--invalid');
          if (props.invalidClass) {
            classes.push(props.invalidClass);
          }
        }
      }

      return classes;
    });

    /** 提示文本 */
    const currentHintText = computed(() => {
      if (!state.value.isOver) return '';
      return state.value.canDrop ? props.hintText : props.invalidHintText;
    });

    // ==================== 工具函数 ====================

    /**
     * 从拖拽事件中提取数据
     */
    function extractDragData(e: DragEvent): DragItem[] {
      if (props.dataExtractor) {
        return props.dataExtractor(e);
      }

      // 默认提取逻辑
      try {
        const data = e.dataTransfer?.getData('application/json');
        if (data) {
          const parsed = JSON.parse(data);
          return Array.isArray(parsed) ? parsed : [parsed];
        }
      } catch (error) {
        console.warn('[DropZone] Failed to parse drag data:', error);
      }

      return [];
    }

    /**
     * 验证拖放数据
     */
    function validateDrop(items: DragItem[]): boolean {
      if (props.disabled) return false;
      if (items.length === 0) return false;

      // 类型检查
      if (props.acceptTypes.length > 0) {
        const hasValidType = items.some(item =>
          props.acceptTypes.includes(item.type)
        );
        if (!hasValidType) return false;
      }

      // 自定义验证
      if (props.validator) {
        return items.every(item => props.validator!(item, props.id));
      }

      return true;
    }

    // ==================== 事件处理 ====================

    /**
     * 拖拽进入
     */
    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();

      dragCounter.value++;

      if (dragCounter.value === 1) {
        const items = extractDragData(e);
        const canDrop = validateDrop(items);

        state.value = {
          isOver: true,
          canDrop,
          operation: null
        };

        const params: DropCallbackParams = {
          dropZoneId: props.id,
          items,
          canDrop,
          event: e
        };

        emit('drag-enter', params);
      }
    }

    /**
     * 拖拽悬停
     */
    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (!state.value.isOver) return;

      // 设置拖放效果
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = state.value.canDrop ? 'move' : 'none';
      }

      const items = extractDragData(e);
      const params: DropCallbackParams = {
        dropZoneId: props.id,
        items,
        canDrop: state.value.canDrop,
        event: e
      };

      emit('drag-over', params);
    }

    /**
     * 拖拽离开
     */
    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();

      dragCounter.value--;

      if (dragCounter.value === 0) {
        const items = extractDragData(e);
        const params: DropCallbackParams = {
          dropZoneId: props.id,
          items,
          canDrop: state.value.canDrop,
          event: e
        };

        state.value = {
          isOver: false,
          canDrop: false,
          operation: null
        };

        emit('drag-leave', params);
      }
    }

    /**
     * 拖放
     */
    function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();

      dragCounter.value = 0;

      const items = extractDragData(e);
      const canDrop = validateDrop(items);

      if (canDrop) {
        const params: DropCallbackParams = {
          dropZoneId: props.id,
          items,
          canDrop: true,
          event: e
        };

        emit('drop', params);
      }

      state.value = {
        isOver: false,
        canDrop: false,
        operation: null
      };
    }

    // ==================== 生命周期 ====================

    onMounted(() => {
      if (!dropZoneRef.value) return;

      useEventListener(dropZoneRef.value, 'dragenter', handleDragEnter);
      useEventListener(dropZoneRef.value, 'dragover', handleDragOver);
      useEventListener(dropZoneRef.value, 'dragleave', handleDragLeave);
      useEventListener(dropZoneRef.value, 'drop', handleDrop);
    });

    onBeforeUnmount(() => {
      dragCounter.value = 0;
      state.value = {
        isOver: false,
        canDrop: false,
        operation: null
      };
    });

    // ==================== 渲染 ====================

    return () => (
      <div
        ref={dropZoneRef}
        class={containerClass.value}
        style={containerStyle.value}
        data-drop-zone-id={props.id}
      >
        {/* 默认插槽 */}
        {slots.default?.()}

        {/* 高亮遮罩 */}
        {props.highlight && state.value.isOver && (
          <div
            class={[
              'drop-zone-overlay',
              state.value.canDrop ? 'drop-zone-overlay--valid' : 'drop-zone-overlay--invalid'
            ]}
          >
            {props.showHint && currentHintText.value && (
              <div class="drop-zone-hint">
                {currentHintText.value}
              </div>
            )}
          </div>
        )}

        {/* 全局样式 */}
        <style>{`
          .drop-zone {
            min-height: 100px;
            border: 2px dashed transparent;
            border-radius: 8px;
          }

          .drop-zone--disabled {
            pointer-events: none;
          }

          .drop-zone--over {
            border-style: solid;
          }

          .drop-zone--can-drop {
            border-color: #2196f3;
            background-color: rgba(33, 150, 243, 0.05);
          }

          .drop-zone--invalid {
            border-color: #f44336;
            background-color: rgba(244, 67, 54, 0.05);
          }

          .drop-zone-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 1;
            border-radius: 6px;
          }

          .drop-zone-overlay--valid {
            background-color: rgba(33, 150, 243, 0.1);
          }

          .drop-zone-overlay--invalid {
            background-color: rgba(244, 67, 54, 0.1);
          }

          .drop-zone-hint {
            padding: 12px 24px;
            background: rgba(0, 0, 0, 0.75);
            color: #fff;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          .drop-zone--can-drop .drop-zone-hint {
            background: rgba(33, 150, 243, 0.9);
          }

          .drop-zone--invalid .drop-zone-hint {
            background: rgba(244, 67, 54, 0.9);
          }
        `}</style>
      </div>
    );
  }
});

