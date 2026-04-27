/** 接口定义 */

/** 上传控制器接口 */
export interface IUploadController {
  pause(taskId: string): void;
  resume(taskId: string): void;
  cancel(taskId: string): void;
  pauseAll(): void;
  resumeAll(): void;
  cancelAll(): void;
}
