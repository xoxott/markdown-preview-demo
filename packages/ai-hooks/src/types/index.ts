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
  HookInput,
  // P69: 15种新增 HookEvent Input 类型
  PermissionRequestInput,
  PermissionDeniedInput,
  ElicitationInput,
  ElicitationResultInput,
  SetupInput,
  ConfigChangeInput,
  TaskCreatedInput,
  TaskCompletedInput,
  TeammateIdleInput,
  InstructionsLoadedInput,
  CwdChangedInput,
  FileChangedInput,
  WorktreeCreateInput,
  WorktreeRemoveInput
} from './input';

export type { HooksPolicy, HooksTrustLevel, HooksCustomizationSurface, HookSource } from './policy';

export type { FunctionHook, FunctionHookCallback, SessionHookStore } from './session';

export type {
  HookRunner,
  RunnerRegistry,
  ShellExecutor,
  ShellExecuteOptions,
  ShellResult,
  HttpClient,
  HttpPostOptions,
  HttpResponse,
  SsrfGuard,
  EnvProvider,
  AsyncRewakeCallback,
  HookRunnerDeps,
  HookExecutorDeps
} from './runner';

export type {
  LLMQueryService,
  LLMQueryResult,
  LLMMultiTurnResult,
  LLMQueryOptions,
  LLMToolDefinition
} from './llmQuery';

// context.ts 含 declare module 扩展，需作为副作用导入以确保类型合并生效
export {} from './context';
