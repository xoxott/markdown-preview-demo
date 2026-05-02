/** InMemoryPlanModeProvider — 内存计划模式实现（测试+轻量宿主） */

import type { PlanModeProvider, PlanModeResult } from '../types/plan-mode-provider';

export class InMemoryPlanModeProvider implements PlanModeProvider {
  private inPlanMode = false;

  async enterPlanMode(): Promise<PlanModeResult> {
    if (this.inPlanMode) {
      return {
        success: true,
        message: 'Already in plan mode',
        previousMode: 'plan',
        currentMode: 'plan'
      };
    }
    this.inPlanMode = true;
    return {
      success: true,
      message: 'Entered plan mode',
      previousMode: 'default',
      currentMode: 'plan'
    };
  }

  async exitPlanMode(): Promise<PlanModeResult> {
    if (!this.inPlanMode) {
      return {
        success: true,
        message: 'Already in default mode',
        previousMode: 'default',
        currentMode: 'default'
      };
    }
    this.inPlanMode = false;
    return {
      success: true,
      message: 'Exited plan mode',
      previousMode: 'plan',
      currentMode: 'default'
    };
  }

  isInPlanMode(): boolean {
    return this.inPlanMode;
  }

  reset(): void {
    this.inPlanMode = false;
  }
}