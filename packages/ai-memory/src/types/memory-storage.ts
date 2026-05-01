/**
 * 记忆存储提供者 — 宿主注入接口
 *
 * 窄接口设计 — 仅覆盖记忆所需的7个操作，不含 glob/grep/runCommand。 宿主可将 FileSystemProvider 适配为 MemoryStorageProvider。
 */
export interface MemoryStorageProvider {
  /** 读取文件全部内容 */
  readFile(path: string): Promise<string>;

  /** 写入文件内容（覆盖） */
  writeFile(path: string, content: string): Promise<void>;

  /** 检查文件/目录是否存在 */
  exists(path: string): Promise<boolean>;

  /** 递归创建目录（swallow EEXIST） */
  mkdir(path: string): Promise<void>;

  /** 列出目录下所有文件（可选扩展名过滤） */
  listFiles(dir: string, extension?: string): Promise<string[]>;

  /** 获取文件元信息 */
  stat(path: string): Promise<{ mtimeMs: number; size: number }>;

  /** 解析符号链接，返回真实路径 */
  realpath(path: string): Promise<string>;
}
