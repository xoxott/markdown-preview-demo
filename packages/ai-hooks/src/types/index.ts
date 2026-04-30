/** P4 类型统一导出 */

export type {
  HookEvent,
  HookOutcome,
  PermissionBehavior,
  HookHandler,
  HookDefinition,
  HookResult,
  AggregatedOutcome,
  AggregatedHookResult,
  HookExecutionContext
} from './hooks';

export type {
  PreToolUseInput,
  PostToolUseInput,
  PostToolUseFailureInput,
  StopInput,
  HookInput
} from './input';

// context.ts 含 declare module 扩展，需作为副作用导入以确保类型合并生效
export {} from './context';
