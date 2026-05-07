/**
 * FileSystemProvider — 宿主注入的文件系统/命令抽象接口
 *
 * 所有 6 个工具委托 I/O 操作到此接口。 宿主环境提供具体实现：
 *
 * - Node.js: 使用 fs, glob, ripgrep, child_process
 * - Browser/test: 使用内存模拟
 * - Sandbox: 使用受限/过滤的实现
 *
 * 通过 ToolUseContext interface merging 注入： declare module '@suga/ai-tool-core' { interface
 * ToolUseContext { fsProvider: FileSystemProvider } }
 */

// === 文件系统结果类型 ===

/** 文件状态信息 */
export interface FileStat {
  /** 文件是否存在 */
  readonly exists: boolean;
  /** 是否为普通文件 */
  readonly isFile: boolean;
  /** 是否为目录 */
  readonly isDirectory: boolean;
  /** 文件大小（字节） */
  readonly size: number;
  /** 最后修改时间（毫秒时间戳） */
  readonly mtimeMs: number;
  /** MIME 类型（可选，基于文件扩展名推断） */
  readonly mimeType?: string;
}

/** 文件内容（读取结果） */
export interface FileContent {
  /** 文件文本内容（或二进制文件的 base64 编码） */
  readonly content: string;
  /** MIME 类型 */
  readonly mimeType: string;
  /** 行数（仅文本文件） */
  readonly lineCount: number;
  /** 最后修改时间（毫秒时间戳） */
  readonly mtimeMs: number;
}

/** 编辑结果 */
export interface EditResult {
  /** 是否成功应用替换 */
  readonly applied: boolean;
  /** 替换次数 */
  readonly replacementCount: number;
  /** 编辑后的文件内容（可选，宿主可选择返回或不返回） */
  readonly newContent?: string;
  /** 错误信息（替换失败时） */
  readonly error?: string;
}

// === Grep 相关类型 ===

/** Grep 输出模式 */
export type GrepOutputMode = 'content' | 'files-with-matches' | 'count';

/** Grep 搜索选项 */
export interface GrepOptions {
  /** 搜索路径（目录或文件） */
  readonly path?: string;
  /** Glob 文件过滤模式（如 "*.ts"） */
  readonly glob?: string;
  /** 输出模式 */
  readonly outputMode: GrepOutputMode;
  /** 是否大小写不敏感 */
  readonly caseInsensitive?: boolean;
  /** 匹配前显示的行数 */
  readonly contextBefore?: number;
  /** 匹配后显示的行数 */
  readonly contextAfter?: number;
  /** 匹配前后显示的行数（同时设置 contextBefore/After） */
  readonly contextLines?: number;
  /** 最大结果数 */
  readonly headLimit?: number;
  /** 排除模式（如 ['.git', 'node_modules']） */
  readonly excludePatterns?: readonly string[];
}

/** Grep 匹配行 */
export interface GrepMatchLine {
  /** 文件路径 */
  readonly filePath: string;
  /** 行号（1-based） */
  readonly lineNumber: number;
  /** 行内容 */
  readonly content: string;
  /** 匹配前上下文行 */
  readonly beforeContext?: readonly string[];
  /** 匹配后上下文行 */
  readonly afterContext?: readonly string[];
}

/** Grep 文件匹配计数 */
export interface GrepFileCount {
  /** 文件路径 */
  readonly filePath: string;
  /** 匹配次数 */
  readonly count: number;
}

/** Grep 搜索结果 */
export interface GrepResult {
  /** 输出模式 */
  readonly mode: GrepOutputMode;
  /** content 模式: 匹配行列表 */
  readonly matches?: readonly GrepMatchLine[];
  /** files-with-matches 模式: 文件路径列表 */
  readonly filePaths?: readonly string[];
  /** count 模式: 文件匹配计数列表 */
  readonly counts?: readonly GrepFileCount[];
  /** 总匹配数 */
  readonly totalMatches: number;
  /** 是否截断（headLimit 导致） */
  readonly truncated?: boolean;
}

// === 命令执行相关类型 ===

/** 命令执行选项 */
export interface RunCommandOptions {
  /** 超时时间（毫秒） */
  readonly timeout?: number;
  /** 是否后台运行 */
  readonly runInBackground?: boolean;
  /** 工作目录 */
  readonly cwd?: string;
  /** 环境变量 */
  readonly env?: Record<string, string>;
}

/** 命令执行结果 */
export interface CommandResult {
  /** 退出码（0=成功） */
  readonly exitCode: number;
  /** 标准输出 */
  readonly stdout: string;
  /** 标准错误输出 */
  readonly stderr: string;
  /** 是否因超时被终止 */
  readonly timedOut: boolean;
  /** 工作目录（可选） */
  readonly cwd?: string;
}

// === G8: 后台任务生命周期类型 ===

/** 后台任务状态 */
export type BackgroundTaskStatus = 'running' | 'completed' | 'failed' | 'stopped';

/** 后台任务结果（spawnBackgroundCommand 返回） */
export interface BackgroundTaskResult {
  /** 后台任务唯一 ID */
  readonly taskId: string;
  /** 任务状态 */
  readonly status: BackgroundTaskStatus;
  /** 命令 */
  readonly command: string;
  /** 启动时间戳 */
  readonly startedAt: number;
}

/** 后台任务详情（查询结果） */
export interface BackgroundTaskDetail {
  /** 后台任务唯一 ID */
  readonly taskId: string;
  /** 任务状态 */
  readonly status: BackgroundTaskStatus;
  /** 命令 */
  readonly command: string;
  /** 退出码（完成后） */
  readonly exitCode?: number;
  /** 标准输出（完成后或部分） */
  readonly stdout: string;
  /** 标准错误输出（完成后或部分） */
  readonly stderr: string;
  /** 是否超时 */
  readonly timedOut: boolean;
  /** 启动时间戳 */
  readonly startedAt: number;
  /** 完成时间戳（完成后） */
  readonly completedAt?: number;
  /** 工作目录（可选 — 部分实现会带上） */
  readonly cwd?: string;
  /** 输出文件路径（可选 — 大输出持久化到文件） */
  readonly outputFilePath?: string;
}

/** 后台命令启动选项 */
export interface SpawnBackgroundOptions {
  /** 工作目录 */
  readonly cwd?: string;
  /** 环境变量 */
  readonly env?: Record<string, string>;
  /** 完成回调（可选 — 任务完成时通知宿主） */
  readonly onCompleted?: (detail: BackgroundTaskDetail) => void;
}

// === 目录列表 ===

/** 目录列表条目 */
export interface FileLsEntry {
  /** 文件/目录名 */
  readonly name: string;
  /** 类型 */
  readonly type: 'file' | 'directory' | 'symlink' | 'other';
  /** 大小（字节） */
  readonly size: number;
  /** 最后修改时间（毫秒时间戳） */
  readonly mtimeMs: number;
}

// === FileSystemProvider 接口 ===

/**
 * 文件系统提供者 — 宿主注入实现
 *
 * 工具的所有 I/O 操作委托到此接口。 工具本身不直接使用 fs/child_process，完全依赖宿主注入。
 */
export interface FileSystemProvider {
  // === 文件操作 ===

  /** 获取文件/目录状态信息 */
  stat(path: string): Promise<FileStat>;

  /** 读取文件内容（可选 offset/limit 用于行范围读取） */
  readFile(path: string, options?: { offset?: number; limit?: number }): Promise<FileContent>;

  /** 写入文件内容（全覆盖替换，宿主应保证 LF 行尾） */
  writeFile(path: string, content: string): Promise<void>;

  /** 编辑文件：替换精确字符串匹配 */
  editFile(
    path: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean
  ): Promise<EditResult>;

  /** Glob 模式搜索 — 返回匹配的文件路径列表（按修改时间排序） */
  glob(pattern: string, path?: string): Promise<string[]>;

  /** Grep (ripgrep 风格) 搜索 */
  grep(pattern: string, options: GrepOptions): Promise<GrepResult>;

  // === 目录列表 ===

  /** 列出目录内容 */
  ls(path: string, options?: { recursive?: boolean }): Promise<FileLsEntry[]>;

  // === 命令执行 ===

  /** 运行 shell 命令 */
  runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult>;

  // === G8: 后台任务生命周期 ===

  /** 启动后台 shell 命令 — 返回任务 ID，命令在 detached 子进程中运行 */
  spawnBackgroundCommand(
    command: string,
    options?: SpawnBackgroundOptions
  ): Promise<BackgroundTaskResult>;

  /** 获取后台任务详情 */
  getBackgroundTask(taskId: string): Promise<BackgroundTaskDetail | null>;

  /** 停止后台任务（发送 SIGTERM） */
  stopBackgroundTask(taskId: string): Promise<boolean>;

  /** 列出所有后台任务 */
  listBackgroundTasks(): Promise<readonly BackgroundTaskDetail[]>;

  /** 注册前台保活 — 防止宿主进程在有后台任务时退出 */
  registerForeground(taskId: string): void;

  /** 取消前台保活 */
  unregisterForeground(taskId: string): void;

  /** 标记任务已通知 — 宿主已处理任务完成事件 */
  markTaskNotified(taskId: string): void;
}
