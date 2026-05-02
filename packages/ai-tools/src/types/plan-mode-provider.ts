/** PlanModeProvider — 计划模式宿主注入接口 */

/** 计划模式切换结果 */
export interface PlanModeResult {
  success: boolean;
  message: string;
  previousMode: string;
  currentMode: string;
}

/**
 * PlanModeProvider — 计划模式宿主注入
 *
 * 工具通过此接口切换计划模式。 宿主的AppState/权限管理可作为真实宿主后端。
 */
export interface PlanModeProvider {
  /** 进入计划模式 */
  enterPlanMode(): Promise<PlanModeResult>;
  /** 退出计划模式 */
  exitPlanMode(): Promise<PlanModeResult>;
  /** 是否在计划模式 */
  isInPlanMode(): boolean;
}
