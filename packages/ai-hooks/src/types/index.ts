/** P4 类型统一导出 */

export type {
  HookEvent,
  HookType,
  HookOutcome,
  PermissionBehavior,
  HookHandler,
  HookDefinition,
  HookResult,
  AggregatedOutcome,
  AggregatedHookResult,
  HookExecutionContext,
  HookBlockingError
} from './hooks';

export type {
  PreToolUseInput,
  PostToolUseInput,
  PostToolUseFailureInput,
  StopInput,
  StopFailureInput,
  SessionStartInput,
  SessionEndInput,
  UserPromptSubmitInput,
  NotificationInput,
  PreCompactInput,
  PostCompactInput,
  HookInput
} from './input';

export type { HooksPolicy, HooksTrustLevel, HooksCustomizationSurface, HookSource } from './policy';

export type { FunctionHook, FunctionHookCallback, SessionHookStore } from './session';

// context.ts 含 declare module 扩展，需作为副作用导入以确保类型合并生效
export {} from './context';
