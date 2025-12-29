/**
 * Vitest 测试环境设置
 */

import { vi } from 'vitest';

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  cb(Date.now());
  return 0;
});

global.cancelAnimationFrame = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock performance.now
if (!global.performance) {
  global.performance = {} as Performance;
}
global.performance.now = vi.fn(() => Date.now());

