/** Mock ToolRegistry — 用于测试 */

import { ToolRegistry } from '@suga/ai-tool-core';
import { createSafeMockTool, createUnsafeMockTool } from './MockToolHelper';

/** 创建包含 safe 和 unsafe 工具的测试注册表 */
export function createTestToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(createSafeMockTool({ name: 'read-file' }));
  registry.register(createSafeMockTool({ name: 'glob-search' }));
  registry.register(createUnsafeMockTool({ name: 'bash' }));
  registry.register(createUnsafeMockTool({ name: 'write-file' }));
  return registry;
}
