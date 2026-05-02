/** @suga/ai-tools — NotebookEditTool测试 */

import { describe, expect, it } from 'vitest';
import { notebookEditTool } from '../tools/notebook-edit';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

const sampleNotebook = JSON.stringify({
  cells: [
    {
      cell_type: 'code',
      id: 'cell-1',
      metadata: {},
      source: ['print("hello")'],
      outputs: [],
      execution_count: 1
    },
    { cell_type: 'markdown', id: 'cell-2', metadata: {}, source: ['# Title'] }
  ],
  metadata: {},
  nbformat: 4,
  nbformat_minor: 5
});

describe('NotebookEditTool', () => {
  const fsProvider = new MockFileSystemProvider();

  it('name → notebook-edit', () => {
    expect(notebookEditTool.name).toBe('notebook-edit');
  });

  it('isReadOnly → false', () => {
    const input = {
      notebook_path: '/test.ipynb',
      cell_id: 'cell-1',
      new_source: 'content',
      cell_type: undefined,
      edit_mode: 'replace' as const
    };
    expect(notebookEditTool.isReadOnly!(input)).toBe(false);
  });

  it('safetyLabel → destructive', () => {
    const input = {
      notebook_path: '/test.ipynb',
      cell_id: 'cell-1',
      new_source: 'content',
      cell_type: undefined,
      edit_mode: 'replace' as const
    };
    expect(notebookEditTool.safetyLabel!(input)).toBe('destructive');
  });

  it('call → replace模式替换cell内容', async () => {
    fsProvider.reset();
    fsProvider.addFile('/test.ipynb', sampleNotebook);

    const result = await notebookEditTool.call(
      {
        notebook_path: '/test.ipynb',
        cell_id: 'cell-1',
        new_source: 'print("world")',
        cell_type: undefined,
        edit_mode: 'replace'
      },
      { fsProvider } as any
    );

    expect(result.data.applied).toBe(true);
    expect(result.data.cellId).toBe('cell-1');

    const updatedContent = await fsProvider.readFile('/test.ipynb');
    const nb = JSON.parse(updatedContent.content);
    expect(nb.cells[0].source).toEqual(['print("world")']);
  });

  it('call → insert模式插入新cell', async () => {
    fsProvider.reset();
    fsProvider.addFile('/test.ipynb', sampleNotebook);

    const result = await notebookEditTool.call(
      {
        notebook_path: '/test.ipynb',
        cell_id: 'cell-1',
        new_source: '# New Section',
        cell_type: 'markdown',
        edit_mode: 'insert'
      },
      { fsProvider } as any
    );

    expect(result.data.applied).toBe(true);
    expect(result.data.editMode).toBe('insert');

    const updatedContent = await fsProvider.readFile('/test.ipynb');
    const nb = JSON.parse(updatedContent.content);
    expect(nb.cells.length).toBe(3);
    expect(nb.cells[1].source).toEqual(['# New Section']);
  });

  it('call → delete模式删除cell', async () => {
    fsProvider.reset();
    fsProvider.addFile('/test.ipynb', sampleNotebook);

    const result = await notebookEditTool.call(
      {
        notebook_path: '/test.ipynb',
        cell_id: 'cell-2',
        new_source: '',
        cell_type: undefined,
        edit_mode: 'delete'
      },
      { fsProvider } as any
    );

    expect(result.data.applied).toBe(true);

    const updatedContent = await fsProvider.readFile('/test.ipynb');
    const nb = JSON.parse(updatedContent.content);
    expect(nb.cells.length).toBe(1);
    expect(nb.cells[0].id).toBe('cell-1');
  });

  it('call → cell不存在返回error', async () => {
    fsProvider.reset();
    fsProvider.addFile('/test.ipynb', sampleNotebook);

    const result = await notebookEditTool.call(
      {
        notebook_path: '/test.ipynb',
        cell_id: 'nonexistent',
        new_source: 'content',
        cell_type: undefined,
        edit_mode: 'replace'
      },
      { fsProvider } as any
    );

    expect(result.data.applied).toBe(false);
    expect(result.data.error).toContain('not found');
  });

  it('call → insert无cell_id → 在开头插入', async () => {
    fsProvider.reset();
    fsProvider.addFile('/test.ipynb', sampleNotebook);

    const result = await notebookEditTool.call(
      {
        notebook_path: '/test.ipynb',
        cell_id: undefined,
        new_source: '# First',
        cell_type: 'markdown',
        edit_mode: 'insert'
      },
      { fsProvider } as any
    );

    expect(result.data.applied).toBe(true);

    const updatedContent = await fsProvider.readFile('/test.ipynb');
    const nb = JSON.parse(updatedContent.content);
    expect(nb.cells[0].source).toEqual(['# First']);
    expect(nb.cells.length).toBe(3);
  });

  it('inputSchema → 正确定义', () => {
    expect(notebookEditTool.inputSchema).toBeDefined();
  });
});
