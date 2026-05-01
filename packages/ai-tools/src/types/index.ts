/** ai-tools 类型 barrel 导出 */

// FileSystemProvider + 结果类型
export type {
  FileSystemProvider,
  FileStat,
  FileContent,
  EditResult,
  GrepOutputMode,
  GrepOptions,
  GrepMatchLine,
  GrepFileCount,
  GrepResult,
  RunCommandOptions,
  CommandResult
} from './fs-provider';

// 工具输入 Schema + 类型
export {
  GlobInputSchema,
  GrepInputSchema,
  FileReadInputSchema,
  FileWriteInputSchema,
  FileEditInputSchema,
  BashInputSchema
} from './tool-inputs';

export type {
  GlobInput,
  GrepInput,
  FileReadInput,
  FileWriteInput,
  FileEditInput,
  BashInput
} from './tool-inputs';

// 工具输出类型
export type {
  GlobOutput,
  GrepOutput,
  FileReadOutput,
  FileWriteOutput,
  FileEditOutput,
  BashOutput
} from './tool-outputs';
