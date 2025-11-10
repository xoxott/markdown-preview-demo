import type { PropType } from 'vue';
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { NIcon, NLayout, NLayoutContent, NLayoutSider, NScrollbar, useThemeVars } from 'naive-ui';
import { Dots, GripVertical } from '@vicons/tabler';

export interface LayoutConfig {
  leftWidth: number;
  rightWidth: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  showLeft?: boolean;
  showRight?: boolean;
  collapsed?: boolean;
}

export default defineComponent({
  name: 'ResizableLayout',
  props: {
    config: {
      type: Object as PropType<LayoutConfig>,
      default: () => ({
        leftWidth: 180,
        rightWidth: 200,
        minRightWidth: 120,
        maxRightWidth: 1000,
        showLeft: true,
        showRight: true
      })
    },
    collapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:collapsed', 'update:config'],
  setup(props, { slots, emit }) {
    const themeVars = useThemeVars();

    const leftWidth = ref(props.config.leftWidth);
    const rightWidth = ref(props.config.rightWidth);
    const showLeft = ref(props.config.showLeft ?? true);
    const showRight = ref(props.config.showRight ?? true);

    const isResizingRight = ref(false);
    const startX = ref(0);
    const startWidth = ref(0);

    const minRightWidth = computed(() => props.config.minRightWidth ?? 200);
    const maxRightWidth = computed(() => props.config.maxRightWidth ?? 600);

    // 左侧折叠切换
    const handleLeftCollapse = () => {
      emit('update:collapsed', !props.collapsed);
      emit('update:config', {
        ...props.config
      });
    };

    // 右侧拖拽开始
    const handleRightMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizingRight.value = true;
      startX.value = e.clientX;
      startWidth.value = rightWidth.value;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRight.value) {
        // 计算偏移量：向左移动增加宽度，向右移动减少宽度
        const deltaX = startX.value - e.clientX;
        const newWidth = startWidth.value + deltaX;

        if (newWidth >= minRightWidth.value && newWidth <= maxRightWidth.value) {
          rightWidth.value = newWidth;
          emit('update:config', {
            ...props.config,
            rightWidth: rightWidth.value
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizingRight.value) {
        isResizingRight.value = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    onMounted(() => {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    });

    // 渲染右侧拖拽手柄
    const renderRightResizeHandle = () => {
      return (
        <div
          class="group absolute bottom-0 left-0 top-0 w-4 cursor-col-resize transition-all"
          onMousedown={handleRightMouseDown}
        >
          {/* 分隔线 */}
          <div
            class="absolute bottom-0 left-1/2 top-0 w-[1px] -translate-x-1/2"
            style={{
              backgroundColor: themeVars.value.dividerColor
            }}
          />
          {/* 拖拽图标 */}
          <div
            class="absolute left-1/2 top-1/2 h-6 w-2 flex items-center justify-center rounded transition-all -translate-x-1/2 -translate-y-1/2"
            style={{
              backgroundColor: themeVars.value.dividerColor
            }}
          >
            <NIcon size="10">
              <Dots />
            </NIcon>
          </div>
        </div>
      );
    };

    return () => (
      <NLayout class="h-full" hasSider>
        {showLeft.value && (
          <NLayoutSider
            width={leftWidth.value}
            collapsedWidth={64}
            nativeScrollbar={false}
            collapsed={props.collapsed}
            collapseMode="width"
            showTrigger="arrow-circle"
            bordered
            onUpdate:collapsed={handleLeftCollapse}
          >
            {slots.left?.()}
          </NLayoutSider>
        )}

        <NLayoutContent nativeScrollbar={false} contentClass="h-full">
          {slots.default?.()}
        </NLayoutContent>

        {showRight.value && (
          <NLayoutSider
            width={rightWidth.value}
            nativeScrollbar={false}
            collapsed={false}
            showTrigger={false}
            style={{
              transition: isResizingRight.value ? 'none' : 'width 0.2s ease',
              position: 'relative'
            }}
          >
            {renderRightResizeHandle()}
            <div style="padding-left: 16px; height: 100%;">{slots.right?.()}</div>
          </NLayoutSider>
        )}
      </NLayout>
    );
  }
});
