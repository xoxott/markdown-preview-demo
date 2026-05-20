/**
 * 文件列表「与圈选、自动滚动共用」的滚动根节点标记。
 *
 * - ViewContainer 中 NScrollbar：通过 `containerClass` 加在 Naive 实际滚动的 `.n-scrollbar-container` 上。
 * - {@link FileListNaiveScrollShell}：同上，供网格/列表等整区滚动的视图使用。
 * - DetailView：表头固定、表体单独滚动时，在表体外包 `NScrollbar` 并对滚动容器打标（与整区外壳一致，仍为 Naive 样式滚动条）。
 *
 * NSelectionRect 优先按此类名解析滚动元素，其次回退到 `.n-scrollbar-container`，避免依赖子组件挂载时序猜测。
 */
export const FILE_LIST_SCROLL_HOST_CLASS = 'file-explorer-scroll-host';

export const fileListScrollHostSelector = `.${FILE_LIST_SCROLL_HOST_CLASS}`;
