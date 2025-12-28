/**
 * 画布圈选框组件
 */

import { defineComponent, type PropType, type CSSProperties } from 'vue';

export interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default defineComponent({
  name: 'CanvasSelectionBox',
  props: {
    selectionBox: {
      type: Object as PropType<SelectionBox | null>,
      default: null
    }
  },
  setup(props) {
    return () => {
      if (!props.selectionBox) return null;

      const style: CSSProperties = {
        position: 'absolute',
        left: `${props.selectionBox.left}px`,
        top: `${props.selectionBox.top}px`,
        width: `${props.selectionBox.width}px`,
        height: `${props.selectionBox.height}px`,
        border: '2px dashed #3b82f6',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '4px',
        pointerEvents: 'none'
      };

      return <div class="absolute" style={style} />;
    };
  }
});

