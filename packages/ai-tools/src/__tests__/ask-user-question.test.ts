/** @suga/ai-tools — AskUserQuestionTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { AskUserQuestionInput } from '../types/tool-inputs';
import { InMemoryUserInteractionProvider } from '../provider/InMemoryUserInteractionProvider';
import { askUserQuestionTool } from '../tools/ask-user-question';

const baseQuestions = [
  {
    question: 'Which approach?',
    header: 'Approach',
    options: [
      { label: 'A', description: 'Option A' },
      { label: 'B', description: 'Option B' }
    ],
    multiSelect: false
  }
];

function createContext(provider?: InMemoryUserInteractionProvider): ExtendedToolUseContext {
  const userInteractionProvider = provider ?? new InMemoryUserInteractionProvider();
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test',
    fsProvider: {} as any,
    userInteractionProvider
  };
}

describe('AskUserQuestionTool', () => {
  it('askQuestions → 收集用户回答', async () => {
    const provider = new InMemoryUserInteractionProvider({ 'Which approach?': 'A' });
    const result = await askUserQuestionTool.call(
      { questions: baseQuestions } as AskUserQuestionInput,
      createContext(provider)
    );
    expect(result.data.answers['Which approach?']).toBe('A');
    expect(result.data.questions.length).toBe(1);
  });

  it('askQuestions(answers已提供) → 直接返回', async () => {
    const result = await askUserQuestionTool.call(
      {
        questions: baseQuestions,
        answers: { 'Which approach?': 'B' }
      } as AskUserQuestionInput,
      createContext()
    );
    expect(result.data.answers['Which approach?']).toBe('B');
  });

  it('askQuestions(annotations) → 返回annotations', async () => {
    const result = await askUserQuestionTool.call(
      {
        questions: baseQuestions,
        answers: { 'Which approach?': 'B' },
        annotations: { 'Which approach?': { preview: 'preview', notes: 'my notes' } }
      } as AskUserQuestionInput,
      createContext()
    );
    expect(result.data.annotations?.['Which approach?'].notes).toBe('my notes');
  });

  it('askQuestions(provider禁用) → 返回空answers', async () => {
    const provider = new InMemoryUserInteractionProvider();
    provider.setEnabled(false);
    const result = await askUserQuestionTool.call(
      { questions: baseQuestions } as AskUserQuestionInput,
      createContext(provider)
    );
    expect(result.data.answers).toEqual({});
  });

  it('askQuestions(无provider) → 返回空answers', async () => {
    const result = await askUserQuestionTool.call(
      { questions: baseQuestions } as AskUserQuestionInput,
      { abortController: new AbortController(), tools: {} as ToolRegistry, sessionId: 'test', fsProvider: {} as any } as ExtendedToolUseContext
    );
    expect(result.data.answers).toEqual({});
  });

  it('askQuestions(预设answers为空) → 选第一个option', async () => {
    const provider = new InMemoryUserInteractionProvider();
    const result = await askUserQuestionTool.call(
      { questions: baseQuestions } as AskUserQuestionInput,
      createContext(provider)
    );
    expect(result.data.answers['Which approach?']).toBe('A');
  });

  it('validateInput(0个问题) → deny', () => {
    const ctx = createContext();
    const result = askUserQuestionTool.validateInput!({ questions: [] } as any, ctx);
    expect(result.behavior).toBe('deny');
  });

  it('isReadOnly → true', () => {
    expect(askUserQuestionTool.isReadOnly!({ questions: baseQuestions } as AskUserQuestionInput)).toBe(true);
  });

  it('checkPermissions → ask', () => {
    const ctx = createContext();
    const result = askUserQuestionTool.checkPermissions!({ questions: baseQuestions } as AskUserQuestionInput, ctx);
    expect(result.behavior).toBe('ask');
  });

  it('isDestructive → false', () => {
    expect(askUserQuestionTool.isDestructive!({ questions: baseQuestions } as AskUserQuestionInput)).toBe(false);
  });
});