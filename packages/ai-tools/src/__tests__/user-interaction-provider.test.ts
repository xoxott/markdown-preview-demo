/** @suga/ai-tools — InMemoryUserInteractionProvider测试 */

import { describe, expect, it } from 'vitest';
import { InMemoryUserInteractionProvider } from '../provider/InMemoryUserInteractionProvider';

const sampleQuestions = [
  {
    question: 'Which?',
    header: 'Choice',
    options: [
      { label: 'A', description: 'Option A' },
      { label: 'B', description: 'Option B' }
    ],
    multiSelect: false
  }
];

describe('InMemoryUserInteractionProvider', () => {
  it('askQuestions(预设answers) → 返回预设值', async () => {
    const provider = new InMemoryUserInteractionProvider({ 'Which?': 'B' });
    const result = await provider.askQuestions(sampleQuestions);
    expect(result.answers['Which?']).toBe('B');
  });

  it('askQuestions(无预设) → 返回第一个option', async () => {
    const provider = new InMemoryUserInteractionProvider();
    const result = await provider.askQuestions(sampleQuestions);
    expect(result.answers['Which?']).toBe('A');
  });

  it('isEnabled → true(默认)', () => {
    const provider = new InMemoryUserInteractionProvider();
    expect(provider.isEnabled()).toBe(true);
  });

  it('setEnabled(false) → isEnabled返回false', () => {
    const provider = new InMemoryUserInteractionProvider();
    provider.setEnabled(false);
    expect(provider.isEnabled()).toBe(false);
  });

  it('reset → 清空历史', async () => {
    const provider = new InMemoryUserInteractionProvider();
    await provider.askQuestions(sampleQuestions);
    provider.reset();
    expect(provider.getQuestionHistory()).toEqual([]);
  });
});
