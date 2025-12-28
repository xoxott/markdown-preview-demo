/**
 * 滚动相关工具函数
 */

import type { Point, ScrollDirection } from '../types';

/**
 * 获取元素的滚动容器
 */
export function getScrollContainer(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const { overflow, overflowX, overflowY } = window.getComputedStyle(parent);
    const hasScroll =
      /(auto|scroll)/.test(overflow) ||
      /(auto|scroll)/.test(overflowX) ||
      /(auto|scroll)/.test(overflowY);

    if (hasScroll && (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return document.documentElement;
}

/**
 * 判断是否需要自动滚动
 *
 * @param mousePos 鼠标位置
 * @param containerRect 容器矩形
 * @param edge 边距阈值
 * @returns 滚动方向
 */
export function getAutoScrollDirection(
  mousePos: Point,
  containerRect: DOMRect,
  edge: number
): ScrollDirection {
  const { left, top, right, bottom } = containerRect;

  // 检查垂直方向
  if (mousePos.y < top + edge) {
    return 'up';
  }
  if (mousePos.y > bottom - edge) {
    return 'down';
  }

  // 检查水平方向
  if (mousePos.x < left + edge) {
    return 'left';
  }
  if (mousePos.x > right - edge) {
    return 'right';
  }

  return null;
}

/**
 * 执行自动滚动
 *
 * @param container 滚动容器
 * @param direction 滚动方向
 * @param speed 滚动速度
 */
export function performAutoScroll(
  container: HTMLElement,
  direction: ScrollDirection,
  speed: number
): void {
  if (!direction) return;

  switch (direction) {
    case 'up':
      container.scrollTop -= speed;
      break;
    case 'down':
      container.scrollTop += speed;
      break;
    case 'left':
      container.scrollLeft -= speed;
      break;
    case 'right':
      container.scrollLeft += speed;
      break;
  }
}

/**
 * 平滑滚动到指定位置
 */
export function smoothScrollTo(
  container: HTMLElement,
  target: { x?: number; y?: number },
  duration = 300
): Promise<void> {
  return new Promise(resolve => {
    const startX = container.scrollLeft;
    const startY = container.scrollTop;
    const targetX = target.x ?? startX;
    const targetY = target.y ?? startY;
    const distanceX = targetX - startX;
    const distanceY = targetY - startY;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);

      container.scrollLeft = startX + distanceX * easeProgress;
      container.scrollTop = startY + distanceY * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * 缓动函数：三次方缓入缓出
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 获取元素相对于滚动容器的位置
 */
export function getElementOffsetInContainer(
  element: HTMLElement,
  container: HTMLElement
): Point {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    x: elementRect.left - containerRect.left + container.scrollLeft,
    y: elementRect.top - containerRect.top + container.scrollTop
  };
}

/**
 * 判断元素是否在可视区域内
 */
export function isElementInViewport(
  element: HTMLElement,
  container?: HTMLElement
): boolean {
  const rect = element.getBoundingClientRect();

  if (container) {
    const containerRect = container.getBoundingClientRect();
    return (
      rect.top >= containerRect.top &&
      rect.left >= containerRect.left &&
      rect.bottom <= containerRect.bottom &&
      rect.right <= containerRect.right
    );
  }

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 滚动元素到可视区域
 */
export function scrollIntoViewIfNeeded(
  element: HTMLElement,
  container?: HTMLElement,
  options?: ScrollIntoViewOptions
): void {
  if (isElementInViewport(element, container)) {
    return;
  }

  if (container) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const scrollTop = elementRect.top - containerRect.top + container.scrollTop;
    const scrollLeft = elementRect.left - containerRect.left + container.scrollLeft;

    container.scrollTo({
      top: scrollTop - (containerRect.height - elementRect.height) / 2,
      left: scrollLeft - (containerRect.width - elementRect.width) / 2,
      behavior: options?.behavior || 'smooth'
    });
  } else {
    element.scrollIntoView({
      block: 'center',
      inline: 'center',
      ...options
    });
  }
}

