import { computed, ref } from 'vue';
import type { Ref } from 'vue';
import { useClipboard } from '@vueuse/core';
import { v4 as uuid } from 'uuid';
const { copy, isSupported } = useClipboard();
interface SVGInfo {
  viewBox?: string;
  content: string;
}
export function useCodeTools() {
  const copyFeedback = ref(false);
  const copyCode = async (content: string, errorMessage?: Ref<string | null> | null | undefined) => {
    if (!isSupported && errorMessage) {
      errorMessage.value = '当前浏览器不支持剪贴板功能';
      return;
    }
    await copy(content);
    copyFeedback.value = true;
    setTimeout(() => {
      copyFeedback.value = false;
    }, 2000);
  };
  return {
    copyCode,
    copyFeedback
  };
}

export function useSvgTools(
  containerRef: Ref<HTMLElement | undefined> | undefined,
  svgValue: Ref<SVGInfo | SVGElement | null>
) {
  const scale = ref(1);
  // 拖拽
  const position = ref({ x: 0, y: 0 });
  const isDragging = ref(false);
  const startPos = ref({ x: 0, y: 0 });
  // 缩放
  const MAX_SCALE = 3;
  const MIN_SCALE = 0.5;

  const zoom = (direction: 'in' | 'out' | 'reset') => {
    const oldScale = scale.value;
    let newScale = oldScale;

    if (direction === 'in') newScale = Math.min(MAX_SCALE, oldScale + 0.1);
    if (direction === 'out') newScale = Math.max(MIN_SCALE, oldScale - 0.1);
    if (direction === 'reset') {
      scale.value = 1;
      position.value = { x: 0, y: 0 };
      return;
    }
    scale.value = newScale;
    if (!containerRef || !containerRef.value) return;
    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      position.value = {
        x: (position.value.x - centerX) * (newScale / oldScale) + centerX,
        y: (position.value.y - centerY) * (newScale / oldScale) + centerY
      };
    }
  };

  const boundary = computed(() => {
    if (!containerRef || !containerRef.value) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const rect = containerRef.value.getBoundingClientRect();
    const scaledWidth = rect.width * scale.value;
    const scaledHeight = rect.height * scale.value;

    return {
      minX: rect.width - scaledWidth,
      maxX: 0,
      minY: rect.height - scaledHeight,
      maxY: 0
    };
  });

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return;
    e.preventDefault();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

    let newX = clientX - startPos.value.x;
    let newY = clientY - startPos.value.y;
    const b = boundary.value;
    newX = Math.min(b.maxX, Math.max(b.minX, newX));
    newY = Math.min(b.maxY, Math.max(b.minY, newY));
    position.value = { x: newX, y: newY };
  };

  const endDrag = () => {
    isDragging.value = false;
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('touchmove', handleDrag);
    window.removeEventListener('touchend', endDrag);
  };
  const startDrag = (e: MouseEvent | TouchEvent) => {
    isDragging.value = true;
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    startPos.value = {
      x: clientX - position.value.x,
      y: clientY - position.value.y
    };
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', handleDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
  };
  const downloadSVG = () => {
    if (!svgValue.value) return;
    let svgContent: string = '';
    if ('content' in svgValue.value) {
      svgContent = svgValue.value.content;
    } else if (svgValue.value instanceof SVGElement) {
      svgContent = new XMLSerializer().serializeToString(svgValue.value);
    }
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${uuid()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySvg = () => {};
  return {
    scale,
    position,
    isDragging,
    startDrag,
    zoom,
    downloadSVG,
    copySvg
  };
}
