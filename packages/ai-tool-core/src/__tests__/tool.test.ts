/** buildTool 测试 — 失败封闭默认值和工具构建 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { buildTool } from '../tool';
import type { ToolDef } from '../types/tool';
import { DEFAULT_MAX_RESULT_SIZE } from '../constants';
import { ToolRegistry } from '../registry';

describe('buildTool', () => {
  describe('失败封闭默认值', () => {
    it('应该为未声明的安全字段填充保守默认值', () => {
      const tool = buildTool({
        name: 'test-tool',
        inputSchema: z.object({ x: z.number() }),
        call: async args => ({ data: args.x }),
        description: async input => `测试: ${input.x}`
      });

      // 失败封闭：所有安全字段默认为最保守值
      expect(tool.isConcurrencySafe({ x: 1 })).toBe(false);
      expect(tool.isReadOnly({ x: 1 })).toBe(false);
      expect(tool.isDestructive({ x: 1 })).toBe(false);
      expect(tool.isEnabled()).toBe(true);
      expect(tool.safetyLabel({ x: 1 })).toBe('system');
      expect(tool.interruptBehavior()).toBe('cancel');
      expect(tool.maxResultSizeChars).toBe(DEFAULT_MAX_RESULT_SIZE);
    });

    it('应该使用工具自定义声明覆盖默认值', () => {
      const tool = buildTool({
        name: 'safe-tool',
        inputSchema: z.object({ path: z.string() }),
        call: async _args => ({ data: 'content' }),
        description: async input => `读取: ${input.path}`,
        isReadOnly: () => true,
        isConcurrencySafe: () => true,
        isDestructive: () => false,
        safetyLabel: () => 'readonly',
        interruptBehavior: () => 'block',
        maxResultSizeChars: 50_000
      });

      expect(tool.isReadOnly({ path: '/test' })).toBe(true);
      expect(tool.isConcurrencySafe({ path: '/test' })).toBe(true);
      expect(tool.isDestructive({ path: '/test' })).toBe(false);
      expect(tool.safetyLabel({ path: '/test' })).toBe('readonly');
      expect(tool.interruptBehavior()).toBe('block');
      expect(tool.maxResultSizeChars).toBe(50_000);
    });

    it('默认 validateInput 应返回 allow', () => {
      const tool = buildTool({
        name: 'test',
        inputSchema: z.object({}),
        call: async () => ({ data: null }),
        description: async () => 'desc'
      });
      const result = tool.validateInput(
        {},
        { abortController: new AbortController(), tools: new ToolRegistry(), sessionId: 'test' }
      );
      expect(result.behavior).toBe('allow');
    });

    it('默认 checkPermissions 应返回 allow', () => {
      const tool = buildTool({
        name: 'test',
        inputSchema: z.object({}),
        call: async () => ({ data: null }),
        description: async () => 'desc'
      });
      const result = tool.checkPermissions(
        {},
        { abortController: new AbortController(), tools: new ToolRegistry(), sessionId: 'test' }
      );
      expect(result.behavior).toBe('allow');
    });
  });

  describe('工具名称验证', () => {
    it('应该接受合法的工具名称', () => {
      expect(() =>
        buildTool({
          name: 'my-tool',
          inputSchema: z.object({}),
          call: async () => ({ data: null }),
          description: async () => 'desc'
        })
      ).not.toThrow();
    });

    it('应该接受纯小写字母名称', () => {
      expect(() =>
        buildTool({
          name: 'read',
          inputSchema: z.object({}),
          call: async () => ({ data: null }),
          description: async () => 'desc'
        })
      ).not.toThrow();
    });

    it('应该拒绝包含大写字母的名称', () => {
      expect(() =>
        buildTool({
          name: 'MyTool',
          inputSchema: z.object({}),
          call: async () => ({ data: null }),
          description: async () => 'desc'
        })
      ).toThrow('不符合格式要求');
    });

    it('应该拒绝以数字开头的名称', () => {
      expect(() =>
        buildTool({
          name: '1tool',
          inputSchema: z.object({}),
          call: async () => ({ data: null }),
          description: async () => 'desc'
        })
      ).toThrow('不符合格式要求');
    });

    it('应该拒绝包含空格的名称', () => {
      expect(() =>
        buildTool({
          name: 'my tool',
          inputSchema: z.object({}),
          call: async () => ({ data: null }),
          description: async () => 'desc'
        })
      ).toThrow('不符合格式要求');
    });
  });

  describe('别名', () => {
    it('应该接受别名声明', () => {
      const tool = buildTool({
        name: 'read-file',
        aliases: ['rf', 'read'],
        inputSchema: z.object({ path: z.string() }),
        call: async _args => ({ data: 'ok' }),
        description: async () => 'desc'
      });
      expect(tool.aliases).toEqual(['rf', 'read']);
    });

    it('应该为无别名声明填充空数组默认值', () => {
      const tool = buildTool({
        name: 'simple-tool',
        inputSchema: z.object({}),
        call: async () => ({ data: null }),
        description: async () => 'desc'
      });
      expect(tool.aliases).toEqual([]);
    });
  });

  describe('lazy schema', () => {
    it('应该接受函数形式的 inputSchema 并自动解析', () => {
      const tool = buildTool({
        name: 'lazy-tool',
        inputSchema: () => z.object({ path: z.string() }),
        call: async args => ({ data: args.path }),
        description: async input => `路径: ${input.path}`
      });
      // inputSchema 应被解析为 Zod schema 对象（而非函数）
      const result = tool.inputSchema.safeParse({ path: '/test' });
      expect(result.success).toBe(true);
    });

    it('解析后的 inputSchema 应与直接传入的等效', () => {
      const directSchema = z.object({ x: z.number() });
      const toolDirect = buildTool({
        name: 'direct-tool',
        inputSchema: directSchema,
        call: async args => ({ data: args.x }),
        description: async () => 'desc'
      });
      const toolLazy = buildTool({
        name: 'lazy-tool',
        inputSchema: () => directSchema,
        call: async args => ({ data: args.x }),
        description: async () => 'desc'
      });

      const directResult = toolDirect.inputSchema.safeParse({ x: 5 });
      const lazyResult = toolLazy.inputSchema.safeParse({ x: 5 });
      expect(directResult.success).toBe(true);
      expect(lazyResult.success).toBe(true);
    });
  });

  describe('satisfies 模式', () => {
    it('应该支持 satisfies ToolDef 进行编译时类型检查', () => {
      const toolDef = {
        name: 'satisfies-tool',
        inputSchema: z.object({ n: z.number() }),
        call: async (args: { n: number }) => ({ data: args.n * 2 }),
        description: async (input: { n: number }) => `计算: ${input.n}`,
        isReadOnly: () => true
      } satisfies ToolDef<{ n: number }, number>;

      const tool = buildTool(toolDef);
      expect(tool.name).toBe('satisfies-tool');
      expect(tool.isReadOnly({ n: 1 })).toBe(true);
    });
  });

  describe('BuiltTool 不可变性', () => {
    it('所有字段应为 readonly', () => {
      const tool = buildTool({
        name: 'immutable-test',
        inputSchema: z.object({}),
        call: async () => ({ data: null }),
        description: async () => 'desc'
      });

      // TypeScript 层面 readonly 已生效，运行时验证基本结构
      expect(tool.name).toBe('immutable-test');
      expect(typeof tool.call).toBe('function');
      expect(typeof tool.isConcurrencySafe).toBe('function');
    });
  });

  describe('validateInput 自定义', () => {
    it('自定义 validateInput 拒绝时应返回 deny', () => {
      const tool = buildTool({
        name: 'validated-tool',
        inputSchema: z.object({ path: z.string() }),
        call: async args => ({ data: args.path }),
        description: async () => 'desc',
        validateInput: (_input, _context) => ({
          behavior: 'deny',
          message: '路径不允许',
          reason: 'path_not_allowed'
        })
      });
      const result = tool.validateInput(
        { path: '/etc/passwd' },
        { abortController: new AbortController(), tools: new ToolRegistry(), sessionId: 'test' }
      );
      expect(result.behavior).toBe('deny');
      if (result.behavior === 'deny') {
        expect(result.message).toBe('路径不允许');
      }
    });

    it('自定义 validateInput 应能修正输入', () => {
      const tool = buildTool({
        name: 'normalized-tool',
        inputSchema: z.object({ path: z.string() }),
        call: async args => ({ data: args.path }),
        description: async () => 'desc',
        validateInput: input => ({
          behavior: 'allow',
          updatedInput: { ...input, path: input.path.toLowerCase() }
        })
      });
      const result = tool.validateInput(
        { path: '/TEST' },
        { abortController: new AbortController(), tools: new ToolRegistry(), sessionId: 'test' }
      );
      expect(result.behavior).toBe('allow');
      if (result.behavior === 'allow') {
        expect(result.updatedInput).toEqual({ path: '/test' });
      }
    });
  });

  describe('checkPermissions 自定义', () => {
    it('自定义 checkPermissions 询问时应返回 ask', () => {
      const tool = buildTool({
        name: 'ask-permission-tool',
        inputSchema: z.object({ cmd: z.string() }),
        call: async args => ({ data: args.cmd }),
        description: async () => 'desc',
        checkPermissions: (_input, _context) => ({
          behavior: 'ask',
          message: '确认执行此命令?'
        })
      });
      const result = tool.checkPermissions(
        { cmd: 'rm -rf' },
        { abortController: new AbortController(), tools: new ToolRegistry(), sessionId: 'test' }
      );
      expect(result.behavior).toBe('ask');
      if (result.behavior === 'ask') {
        expect(result.message).toBe('确认执行此命令?');
      }
    });
  });
});
