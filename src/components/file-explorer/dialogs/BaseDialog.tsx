/** BaseDialog - 基础可拖拽弹窗组件 基于 Naive UI 的 NModal 进行二次封装,添加拖拽和调整大小功能 */

import type { PropType } from 'vue';
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NButton, NCard, NIcon, NModal, useThemeVars } from 'naive-ui';
import { Close, Contract, Expand } from '@vicons/ionicons5';
import type { DialogPosition, ResizeDirection } from '../types/dialog';
import { DEFAULT_DIALOG_CONFIG } from '../types/dialog';

export default defineComponent({
  name: 'BaseDialog',
  props: {
    show: { type: Boolean, required: true },
    title: { type: String, default: '' },
    width: { type: [Number, String], default: 600 },
    height: { type: [Number, String], default: 'auto' },
    minWidth: { type: Number, default: DEFAULT_DIALOG_CONFIG.minWidth },
    minHeight: { type: Number, default: DEFAULT_DIALOG_CONFIG.minHeight },
    maxWidth: { type: Number, default: undefined },
    maxHeight: { type: Number, default: undefined },
    draggable: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.draggable },
    resizable: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.resizable },
    showMask: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.showMask },
    maskClosable: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.maskClosable },
    showClose: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.showClose },
    closeOnEsc: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.closeOnEsc },
    autoFocus: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.autoFocus },
    trapFocus: { type: Boolean, default: DEFAULT_DIALOG_CONFIG.trapFocus },
    transformOrigin: {
      type: String as PropType<'center' | 'mouse' | undefined>,
      default: DEFAULT_DIALOG_CONFIG.transformOrigin
    },
    position: {
      type: [String, Object] as PropType<'center' | DialogPosition>,
      default: DEFAULT_DIALOG_CONFIG.position
    },
    zIndex: { type: Number, default: DEFAULT_DIALOG_CONFIG.zIndex },
    class: { type: String, default: '' },
    contentClass: { type: String, default: '' },
    onClose: { type: Function as PropType<() => void>, default: undefined },
    onMaskClick: { type: Function as PropType<() => void>, default: undefined },
    onAfterEnter: { type: Function as PropType<() => void>, default: undefined },
    onAfterLeave: { type: Function as PropType<() => void>, default: undefined }
  },
  setup(props, { slots }) {
    const themeVars = useThemeVars();
    const dialogRef = ref<HTMLElement | null>(null);
    const headerRef = ref<HTMLElement | null>(null);

    // 状态管理
    const isDragging = ref(false);
    const isResizing = ref(false);
    const isPositioned = ref(false);
    const isFullscreen = ref(false);
    const resizeDirection = ref<ResizeDirection | null>(null);

    // 位置和尺寸
    const currentPosition = ref<DialogPosition>({ x: 0, y: 0 });
    const currentSize = ref({ width: 0, height: 0 });

    // 保存全屏前的状态
    const beforeFullscreen = ref({
      x: 0,
      y: 0,
      width: 0,
      height: 0
    });

    // 拖拽起始信息
    const dragStart = ref({ x: 0, y: 0, dialogX: 0, dialogY: 0 });

    // 调整大小起始信息
    const resizeStart = ref({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      dialogX: 0,
      dialogY: 0
    });

    // 计算弹窗样式
    const dialogStyle = computed(() => {
      const style: Record<string, string> = {};

      // 全屏模式
      if (isFullscreen.value) {
        style.position = 'fixed';
        style.left = '0';
        style.top = '0';
        style.width = '100vw';
        style.height = '100vh';
        style.transform = 'none';
        style.margin = '0';
        return style;
      }

      // 宽度
      if (currentSize.value.width > 0) {
        style.width = `${currentSize.value.width}px`;
      } else if (typeof props.width === 'number') {
        style.width = `${props.width}px`;
      } else {
        style.width = props.width;
      }

      // 高度
      if (currentSize.value.height > 0) {
        style.height = `${currentSize.value.height}px`;
      } else if (typeof props.height === 'number') {
        style.height = `${props.height}px`;
      } else if (props.height !== 'auto') {
        style.height = props.height;
      }

      // 最小/最大尺寸
      if (props.minWidth) style.minWidth = `${props.minWidth}px`;
      if (props.minHeight) style.minHeight = `${props.minHeight}px`;
      if (props.maxWidth) style.maxWidth = `${props.maxWidth}px`;
      if (props.maxHeight) style.maxHeight = `${props.maxHeight}px`;

      // 位置
      if (isPositioned.value || (props.position !== 'center' && typeof props.position === 'object')) {
        style.position = 'fixed';
        style.left = `${currentPosition.value.x}px`;
        style.top = `${currentPosition.value.y}px`;
        style.transform = 'none';
        style.margin = '0';
      }

      return style;
    });

    // 初始化位置
    const initPosition = () => {
      if (props.position !== 'center' && typeof props.position === 'object') {
        currentPosition.value = { ...props.position };
        isPositioned.value = true;
      } else if (dialogRef.value) {
        const rect = dialogRef.value.getBoundingClientRect();
        currentPosition.value = {
          x: rect.left,
          y: rect.top
        };
      }
    };

    // 切换全屏
    const toggleFullscreen = () => {
      if (isFullscreen.value) {
        // 退出全屏，恢复之前的状态
        isFullscreen.value = false;
        currentPosition.value = {
          x: beforeFullscreen.value.x,
          y: beforeFullscreen.value.y
        };
        currentSize.value = {
          width: beforeFullscreen.value.width,
          height: beforeFullscreen.value.height
        };
      } else {
        // 进入全屏，保存当前状态
        if (!isPositioned.value && dialogRef.value) {
          const rect = dialogRef.value.getBoundingClientRect();
          currentPosition.value = {
            x: rect.left,
            y: rect.top
          };
          isPositioned.value = true;
        }

        beforeFullscreen.value = {
          x: currentPosition.value.x,
          y: currentPosition.value.y,
          width: currentSize.value.width,
          height: currentSize.value.height
        };
        isFullscreen.value = true;
      }
    };

    // 开始拖拽
    const handleDragStart = (e: MouseEvent) => {
      if (!props.draggable || isFullscreen.value) return;
      if (!headerRef.value?.contains(e.target as Node)) return;

      // 排除按钮
      if ((e.target as HTMLElement).closest('.dialog-action-btn')) return;

      e.preventDefault();

      if (!isPositioned.value && dialogRef.value) {
        const rect = dialogRef.value.getBoundingClientRect();
        currentPosition.value = {
          x: rect.left,
          y: rect.top
        };
        isPositioned.value = true;
      }

      isDragging.value = true;

      dragStart.value = {
        x: e.clientX,
        y: e.clientY,
        dialogX: currentPosition.value.x,
        dialogY: currentPosition.value.y
      };

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'move';
      document.body.style.userSelect = 'none';
    };

    // 拖拽移动
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging.value) return;

      const deltaX = e.clientX - dragStart.value.x;
      const deltaY = e.clientY - dragStart.value.y;

      let newX = dragStart.value.dialogX + deltaX;
      let newY = dragStart.value.dialogY + deltaY;

      // 边界限制
      if (dialogRef.value) {
        const rect = dialogRef.value.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
      }

      currentPosition.value = { x: newX, y: newY };
    };

    // 结束拖拽
    const handleDragEnd = () => {
      isDragging.value = false;
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    // 开始调整大小
    const handleResizeStart = (e: MouseEvent, direction: ResizeDirection) => {
      if (!props.resizable || isFullscreen.value) return;

      e.preventDefault();
      e.stopPropagation();

      if (!isPositioned.value && dialogRef.value) {
        const rect = dialogRef.value.getBoundingClientRect();
        currentPosition.value = {
          x: rect.left,
          y: rect.top
        };
        isPositioned.value = true;
      }

      isResizing.value = true;
      resizeDirection.value = direction;

      const rect = dialogRef.value?.getBoundingClientRect();
      if (!rect) return;

      resizeStart.value = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
        dialogX: currentPosition.value.x,
        dialogY: currentPosition.value.y
      };

      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.userSelect = 'none';
    };

    // 调整大小移动
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing.value || !resizeDirection.value) return;

      const deltaX = e.clientX - resizeStart.value.x;
      const deltaY = e.clientY - resizeStart.value.y;
      const direction = resizeDirection.value;

      let newWidth = resizeStart.value.width;
      let newHeight = resizeStart.value.height;
      let newX = resizeStart.value.dialogX;
      let newY = resizeStart.value.dialogY;

      const minW = props.minWidth || 200;
      const minH = props.minHeight || 150;
      const maxW = props.maxWidth || window.innerWidth;
      const maxH = props.maxHeight || window.innerHeight;

      // 根据方向计算新尺寸和位置
      if (direction.includes('e')) {
        newWidth = Math.max(minW, Math.min(resizeStart.value.width + deltaX, maxW));
      }
      if (direction.includes('w')) {
        const proposedWidth = resizeStart.value.width - deltaX;
        if (proposedWidth >= minW && proposedWidth <= maxW) {
          newWidth = proposedWidth;
          newX = resizeStart.value.dialogX + deltaX;
        } else if (proposedWidth < minW) {
          newWidth = minW;
          newX = resizeStart.value.dialogX + resizeStart.value.width - minW;
        } else {
          newWidth = maxW;
          newX = resizeStart.value.dialogX + resizeStart.value.width - maxW;
        }
      }
      if (direction.includes('s')) {
        newHeight = Math.max(minH, Math.min(resizeStart.value.height + deltaY, maxH));
      }
      if (direction.includes('n')) {
        const proposedHeight = resizeStart.value.height - deltaY;
        if (proposedHeight >= minH && proposedHeight <= maxH) {
          newHeight = proposedHeight;
          newY = resizeStart.value.dialogY + deltaY;
        } else if (proposedHeight < minH) {
          newHeight = minH;
          newY = resizeStart.value.dialogY + resizeStart.value.height - minH;
        } else {
          newHeight = maxH;
          newY = resizeStart.value.dialogY + resizeStart.value.height - maxH;
        }
      }

      // 边界检查
      if (newX < 0) {
        if (direction.includes('w')) {
          newWidth += newX;
        }
        newX = 0;
      }
      if (newY < 0) {
        if (direction.includes('n')) {
          newHeight += newY;
        }
        newY = 0;
      }
      if (newX + newWidth > window.innerWidth) {
        newWidth = window.innerWidth - newX;
      }
      if (newY + newHeight > window.innerHeight) {
        newHeight = window.innerHeight - newY;
      }

      currentSize.value = { width: newWidth, height: newHeight };
      if (direction.includes('w') || direction.includes('n')) {
        currentPosition.value = { x: newX, y: newY };
      }
    };

    // 结束调整大小
    const handleResizeEnd = () => {
      isResizing.value = false;
      resizeDirection.value = null;
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.userSelect = '';
    };

    // 获取调整大小手柄的光标样式
    const getResizeCursor = (direction: ResizeDirection): string => {
      const cursors: Record<ResizeDirection, string> = {
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize',
        ne: 'nesw-resize',
        nw: 'nwse-resize',
        se: 'nwse-resize',
        sw: 'nesw-resize'
      };
      return cursors[direction];
    };

    // 渲染调整大小手柄
    const renderResizeHandles = () => {
      if (!props.resizable || isFullscreen.value) return null;

      const directions: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

      return (
        <>
          {directions.map(direction => (
            <div
              key={direction}
              class={[
                'absolute pointer-events-auto z-10',
                // 边缘手柄
                direction === 'n' && 'top-0 left-0 right-0 h-1 cursor-ns-resize',
                direction === 's' && 'bottom-0 left-0 right-0 h-1 cursor-ns-resize',
                direction === 'e' && 'top-0 right-0 bottom-0 w-1 cursor-ew-resize',
                direction === 'w' && 'top-0 left-0 bottom-0 w-1 cursor-ew-resize',
                // 角落手柄
                direction === 'ne' && 'top-0 right-0 w-3 h-3 cursor-nesw-resize',
                direction === 'nw' && 'top-0 left-0 w-3 h-3 cursor-nwse-resize',
                direction === 'se' && 'bottom-0 right-0 w-3 h-3 cursor-nwse-resize',
                direction === 'sw' && 'bottom-0 left-0 w-3 h-3 cursor-nesw-resize'
              ]}
              style={{
                cursor: getResizeCursor(direction),
                backgroundColor: 'transparent',
                transition: 'background-color 0.1s ease-in-out'
              }}
              onMousedown={(e: MouseEvent) => handleResizeStart(e, direction)}
              onMouseenter={e => {
                (e.target as HTMLElement).style.backgroundColor = `${themeVars.value.primaryColor}33`;
              }}
              onMouseleave={e => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            />
          ))}
        </>
      );
    };

    // 关闭弹窗
    const handleClose = () => {
      props.onClose?.();
    };

    // 遮罩点击
    const handleMaskClick = () => {
      if (props.maskClosable) {
        props.onMaskClick?.();
        handleClose();
      }
    };

    // 键盘事件
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.closeOnEsc && props.show) {
        handleClose();
      }
    };

    // 监听显示状态
    watch(
      () => props.show,
      show => {
        if (show) {
          setTimeout(() => {
            props.onAfterEnter?.();
            initPosition();
          }, 50);
        } else {
          // 重置状态
          currentSize.value = { width: 0, height: 0 };
          // FIX: 这里重置状态会导致 弹框回到中心再执行动画后再销毁
          // isPositioned.value = false
          isFullscreen.value = false;
          props.onAfterLeave?.();
        }
      }
    );

    // 生命周期
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown);
      handleDragEnd();
      handleResizeEnd();
    });

    return () => (
      <NModal
        show={props.show}
        trapFocus={false}
        autoFocus={false}
        closeOnEsc={props.closeOnEsc}
        unstableShowMask={props.showMask}
        maskClosable={props.maskClosable}
        onMaskClick={handleMaskClick}
        onUpdateShow={(show: boolean) => !show && handleClose()}
        class={props.class}
        zIndex={props.zIndex}
        transformOrigin={props.transformOrigin}
      >
        <div
          ref={dialogRef}
          class={[
            'relative',
            props.draggable && 'cursor-default',
            isDragging.value && 'select-none',
            isResizing.value && 'select-none transition-none'
          ]}
          style={dialogStyle.value}
        >
          {renderResizeHandles()}

          <NCard bordered={false} role="dialog" aria-modal="true" class="h-full flex flex-col">
            {{
              header: () => (
                <div
                  ref={headerRef}
                  class={['flex items-center justify-between', props.draggable && !isFullscreen.value && 'cursor-move']}
                  onMousedown={handleDragStart}
                  style={{
                    userSelect: 'none'
                  }}
                >
                  {slots.header ? slots.header() : <div class="flex-1 text-base font-medium">{props.title}</div>}
                  <div class="flex items-center gap-1">
                    {/* 全屏按钮 */}
                    <NButton text onClick={toggleFullscreen}>
                      {{
                        icon: () => <NIcon size={16}>{isFullscreen.value ? <Contract /> : <Expand />}</NIcon>
                      }}
                    </NButton>
                    {/* 关闭按钮 */}
                    {props.showClose && (
                      <NButton text onClick={handleClose}>
                        {{
                          icon: () => (
                            <NIcon size={20}>
                              <Close />
                            </NIcon>
                          )
                        }}
                      </NButton>
                    )}
                  </div>
                </div>
              ),
              default: () => (
                <div class={['flex-1 overflow-auto px-4 py-3', props.contentClass]}>{slots.default?.()}</div>
              ),
              footer: slots.footer
                ? () => <div class="flex items-center justify-end gap-2">{slots.footer?.()}</div>
                : undefined
            }}
          </NCard>
        </div>
      </NModal>
    );
  }
});
