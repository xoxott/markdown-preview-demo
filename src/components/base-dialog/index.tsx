/** BaseDialog - 基础可拖拽弹窗组件 基于 Naive UI 的 NModal 进行二次封装,添加拖拽和调整大小功能 */

import type { PropType } from 'vue';
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NButton, NCard, NIcon, NModal, useThemeVars } from 'naive-ui';
import { Close, Contract, Expand } from '@vicons/ionicons5';
import type { BaseDialogProps, DialogPosition, ResizeDirection } from './dialog';
import { DEFAULT_DIALOG_CONFIG } from './dialog';

/** BaseDialog config prop 的宽松类型 — 允许 extends BaseDialogProps 的子类型传递额外字段 */
type BaseDialogConfigProp = BaseDialogProps & Record<string, any>;

export default defineComponent({
  name: 'BaseDialog',
  props: {
    show: { type: Boolean, required: true },
    config: { type: Object as PropType<BaseDialogConfigProp>, required: true }
  },
  setup(props, { slots }) {
    const themeVars = useThemeVars();
    const dialogRef = ref<HTMLElement | null>(null);
    const headerRef = ref<HTMLElement | null>(null);

    // 从 config 中获取参数，带默认值
    const getConfig = <K extends keyof BaseDialogProps>(key: K): BaseDialogProps[K] =>
      props.config[key] ?? DEFAULT_DIALOG_CONFIG[key];

    const title = computed(() => getConfig('title') ?? '');
    const width = computed(() => getConfig('width') ?? 600);
    const height = computed(() => getConfig('height') ?? 'auto');
    const minWidth = computed(() => getConfig('minWidth') ?? 300);
    const minHeight = computed(() => getConfig('minHeight') ?? 200);
    const maxWidth = computed(() => getConfig('maxWidth'));
    const maxHeight = computed(() => getConfig('maxHeight'));
    const draggable = computed(() => getConfig('draggable') ?? false);
    const resizable = computed(() => getConfig('resizable') ?? false);
    const showMask = computed(() => getConfig('showMask') ?? true);
    const maskClosable = computed(() => getConfig('maskClosable') ?? true);
    const showClose = computed(() => getConfig('showClose') ?? true);
    const showFullscreen = computed(() => getConfig('showFullscreen') ?? false);
    const closeOnEsc = computed(() => getConfig('closeOnEsc') ?? true);
    const transformOrigin = computed(() => getConfig('transformOrigin'));
    const position = computed(() => getConfig('position') ?? 'center');
    const zIndex = computed(() => getConfig('zIndex'));
    const dialogClass = computed(() => getConfig('class') ?? '');
    const contentClass = computed(() => getConfig('contentClass') ?? '');

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
      } else if (typeof width.value === 'number') {
        style.width = `${width.value}px`;
      } else {
        style.width = width.value as string;
      }

      // 高度
      if (currentSize.value.height > 0) {
        style.height = `${currentSize.value.height}px`;
      } else if (typeof height.value === 'number') {
        style.height = `${height.value}px`;
      } else if (height.value !== 'auto') {
        style.height = height.value as string;
      }

      // 最小/最大尺寸
      if (minWidth.value) style.minWidth = `${minWidth.value}px`;
      if (minHeight.value) style.minHeight = `${minHeight.value}px`;
      if (maxWidth.value) style.maxWidth = `${maxWidth.value}px`;
      if (maxHeight.value) style.maxHeight = `${maxHeight.value}px`;

      // 位置
      if (
        isPositioned.value ||
        (position.value !== 'center' && typeof position.value === 'object')
      ) {
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
      if (position.value !== 'center' && typeof position.value === 'object') {
        currentPosition.value = { ...(position.value as DialogPosition) };
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

    // 开始拖拽
    const handleDragStart = (e: MouseEvent) => {
      if (!draggable.value || isFullscreen.value) return;
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

      const minW = minWidth.value || 200;
      const minH = minHeight.value || 150;
      const maxW = maxWidth.value || window.innerWidth;
      const maxH = maxHeight.value || window.innerHeight;

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

    // 开始调整大小
    const handleResizeStart = (e: MouseEvent, direction: ResizeDirection) => {
      if (!resizable.value || isFullscreen.value) return;

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
      if (!resizable.value || isFullscreen.value) return null;

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
                (e.target as HTMLElement).style.backgroundColor =
                  `${themeVars.value.primaryColor}33`;
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
      props.config.onClose?.();
    };

    // 遮罩点击
    const handleMaskClick = () => {
      if (maskClosable.value) {
        props.config.onMaskClick?.();
        handleClose();
      }
    };

    // 键盘事件
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc.value && props.show) {
        handleClose();
      }
    };

    // 监听显示状态
    watch(
      () => props.show,
      show => {
        if (show) {
          setTimeout(() => {
            props.config.onAfterEnter?.();
            initPosition();
          }, 50);
        } else {
          // 重置状态
          currentSize.value = { width: 0, height: 0 };
          // FIX: 这里重置状态会导致 弹框回到中心再执行动画后再销毁
          // isPositioned.value = false
          isFullscreen.value = false;
          props.config.onAfterLeave?.();
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
        closeOnEsc={closeOnEsc.value}
        unstableShowMask={showMask.value}
        maskClosable={maskClosable.value}
        onMaskClick={handleMaskClick}
        onUpdateShow={(show: boolean) => !show && handleClose()}
        class={dialogClass.value}
        zIndex={zIndex.value}
        transformOrigin={transformOrigin.value}
      >
        <div
          ref={dialogRef}
          class={[
            'relative',
            draggable.value && 'cursor-default',
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
                  class={[
                    'flex items-center justify-between',
                    draggable.value && !isFullscreen.value && 'cursor-move'
                  ]}
                  onMousedown={handleDragStart}
                  style={{
                    userSelect: 'none'
                  }}
                >
                  {slots.header ? (
                    slots.header()
                  ) : (
                    <div class="flex-1 text-base font-medium">{title.value}</div>
                  )}
                  <div class="flex items-center gap-1">
                    {/* 全屏按钮 */}
                    {showFullscreen.value && (
                      <NButton text onClick={toggleFullscreen}>
                        {{
                          icon: () => (
                            <NIcon size={16}>
                              {isFullscreen.value ? <Contract /> : <Expand />}
                            </NIcon>
                          )
                        }}
                      </NButton>
                    )}
                    {/* 关闭按钮 */}
                    {showClose.value && (
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
                <div class={['flex-1 overflow-auto px-4 py-3', contentClass.value]}>
                  {slots.default?.()}
                </div>
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
