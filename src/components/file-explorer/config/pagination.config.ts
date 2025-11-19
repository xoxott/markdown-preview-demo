import type { ViewMode, GridSize } from '../types/file-explorer';

/**
 * 根据视图模式和网格大小获取每页显示数量
 * @param viewMode 视图模式
 * @param gridSize 网格大小（仅在 grid 模式下有效）
 * @returns 每页显示数量
 */
export function getPageSizeByViewMode(viewMode: ViewMode, gridSize?: GridSize): number {
  switch (viewMode) {
    case 'grid':
      // 网格模式根据网格大小自适应
      switch (gridSize) {
        case 'small':
          return 50;
        case 'medium':
          return 40;
        case 'large':
          return 30;
        case 'extra-large':
          return 20;
        default:
          return 40;
      }
    case 'list':
      return 50;
    case 'tile':
      return 30;
    case 'detail':
      return 50;
    case 'content':
      return 20;
    default:
      return 40;
  }
}

