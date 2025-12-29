/**
 * Flow 图形编辑器核心库
 *
 * 通用图形编辑器核心，支持工作流、流程图等多种场景
 * 类似 VueFlow/ReactFlow 的设计
 */

// 类型导出
export * from './types';

// 配置导出
export * from './config/default-config';
export * from './config/FlowConfigManager';
export * from './config/FlowConfigValidator';

// 事件系统导出
export * from './core/events';

// 状态管理导出
export * from './core/state';

// 交互系统导出
export * from './core/interaction';

// 插件系统导出
export * from './core/plugin';

// 性能优化导出
export * from './core/performance';

// 命令模式导出
export * from './core/commands';

// Hook 导出
export * from './hooks';

// 组件导出
export * from './components';
export * from './components/nodes';
export * from './components/edges';

// 工具函数导出
export * from './utils';

