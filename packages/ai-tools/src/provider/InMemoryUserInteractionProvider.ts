/** InMemoryUserInteractionProvider — 内存用户交互实现（测试+轻量宿主） */

import type {
  QuestionInput,
  QuestionResult,
  UserInteractionProvider
} from '../types/user-interaction-provider';

export class InMemoryUserInteractionProvider implements UserInteractionProvider {
  private enabled = true;
  private presetAnswers: Record<string, string> = {};
  private questionHistory: QuestionInput[][] = [];

  constructor(presetAnswers?: Record<string, string>) {
    this.presetAnswers = presetAnswers ?? {};
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setPresetAnswers(answers: Record<string, string>): void {
    this.presetAnswers = answers;
  }

  async askQuestions(questions: QuestionInput[]): Promise<QuestionResult> {
    this.questionHistory.push(questions);

    // 用预设answers填充，未预设的选第一个option
    const answers: Record<string, string> = {};
    for (const q of questions) {
      const key = q.question;
      answers[key] = this.presetAnswers[key] ?? q.options[0]?.label ?? '';
    }

    return { answers };
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset(): void {
    this.questionHistory = [];
  }

  getQuestionHistory(): QuestionInput[][] {
    return this.questionHistory;
  }
}
