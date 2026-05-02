/** MockFileSystemProvider — 测试用空实现，所有方法返回默认值 */

import type {
  CommandResult,
  EditResult,
  FileContent,
  FileLsEntry,
  FileStat,
  FileSystemProvider,
  GrepResult,
  RunCommandOptions
} from '@suga/ai-tools';

const EMPTY_STAT: FileStat = {
  exists: false,
  isFile: false,
  isDirectory: false,
  size: 0,
  mtimeMs: 0
};
const EMPTY_CONTENT: FileContent = {
  content: '',
  mimeType: 'text/plain',
  lineCount: 0,
  mtimeMs: 0
};
const EMPTY_EDIT_RESULT: EditResult = { applied: false, replacementCount: 0, error: 'mock' };
const EMPTY_GREP_RESULT: GrepResult = { mode: 'content', totalMatches: 0 };
const EMPTY_COMMAND_RESULT: CommandResult = {
  exitCode: 0,
  stdout: '',
  stderr: '',
  timedOut: false
};

/** Mock FileSystemProvider — 所有方法返回空/默认值 */
export class MockFileSystemProvider implements FileSystemProvider {
  async stat(): Promise<FileStat> {
    return EMPTY_STAT;
  }
  async readFile(): Promise<FileContent> {
    return EMPTY_CONTENT;
  }
  async writeFile(): Promise<void> {}
  async editFile(): Promise<EditResult> {
    return EMPTY_EDIT_RESULT;
  }
  async glob(): Promise<string[]> {
    return [];
  }
  async grep(): Promise<GrepResult> {
    return EMPTY_GREP_RESULT;
  }
  async ls(): Promise<FileLsEntry[]> {
    return [];
  }
  async runCommand(_command: string, _options?: RunCommandOptions): Promise<CommandResult> {
    return EMPTY_COMMAND_RESULT;
  }
}
