import { onUnmounted } from 'vue';

/**
 * 拖拽/resize 时临时覆盖 document.body 的 cursor 和 userSelect
 *
 * 用法： const override = useBodyStyleOverride(); override.start({ cursor: 'col-resize', userSelect:
 * 'none' }); override.stop(); // 还原为原始值
 */
export function useBodyStyleOverride() {
  const saved = { cursor: '', userSelect: '' };
  let active = false;

  const start = (styles: { cursor?: string; userSelect?: string }) => {
    if (active) return;
    saved.cursor = document.body.style.cursor;
    saved.userSelect = document.body.style.userSelect;
    if (styles.cursor) document.body.style.cursor = styles.cursor;
    if (styles.userSelect) document.body.style.userSelect = styles.userSelect;
    active = true;
  };

  const stop = () => {
    if (!active) return;
    document.body.style.cursor = saved.cursor;
    document.body.style.userSelect = saved.userSelect;
    active = false;
  };

  // 组件卸载时确保还原
  onUnmounted(stop);

  return { start, stop };
}
