import { ref } from 'vue';
import { FileTask,UploadStatus,IUploadController } from '../type';

/** 任务和分片控制器 */
export class UploadController implements IUploadController {
  // 任务级别的 AbortController
  private taskAbortControllers = new Map<string, AbortController>();
  // 分片级别的 AbortController
  private chunkAbortControllers = new Map<string, Map<number, AbortController>>();
  
  public readonly isPaused = ref(false);
  public readonly pausedTasks = new Set<string>();

  pause(taskId: string): void {
    const task = this.getTask(taskId);
    if (!task || task.status !== UploadStatus.UPLOADING) return;

    // 中止该任务的所有网络请求
    this.abortTask(taskId);
    
    // 更新任务状态
    task.status = UploadStatus.PAUSED;
    task.pausedTime = Date.now();
    this.pausedTasks.add(taskId);
    
    console.log(`任务 ${task.file.name} 已暂停`);
  }

  resume(taskId: string): void {
    const task = this.getTask(taskId);
    if (!task || task.status !== UploadStatus.PAUSED) return;

    // 创建新的 AbortController
    this.createAbortController(taskId);
    
    // 更新任务状态
    task.status = UploadStatus.PENDING;
    task.resumeTime = Date.now();
    this.pausedTasks.delete(taskId);
    
    console.log(`任务 ${task.file.name} 已恢复`);
  }

  cancel(taskId: string): void {
    const task = this.getTask(taskId);
    if (!task) return;

    // 中止网络请求
    this.abortTask(taskId);
    
    // 更新任务状态
    task.status = UploadStatus.CANCELLED;
    task.endTime = Date.now();
    
    // 清理
    this.pausedTasks.delete(taskId);
    
    console.log(`任务 ${task.file.name} 已取消`);
  }

  pauseAll(): void {
    this.isPaused.value = true;
    // 暂停所有活跃任务
    this.taskAbortControllers.forEach((_, taskId) => {
      this.pause(taskId);
    });
  }

  resumeAll(): void {
    this.isPaused.value = false;
    
    // 恢复所有暂停的任务
    const pausedTaskIds = Array.from(this.pausedTasks);
    pausedTaskIds.forEach(taskId => {
      this.resume(taskId);
    });
  }

  cancelAll(): void {
    // 取消所有任务
    this.taskAbortControllers.forEach((_, taskId) => {
      this.cancel(taskId);
    });
    
    // 清理
    this.taskAbortControllers.clear();
    this.chunkAbortControllers.clear();
    this.pausedTasks.clear();
  }

  // 创建任务的 AbortController
  createAbortController(taskId: string): AbortController {
    const controller = new AbortController();
    this.taskAbortControllers.set(taskId, controller);
    return controller;
  }

  // 创建分片的 AbortController
  createChunkAbortController(taskId: string, chunkIndex: number): AbortController {
    const controller = new AbortController();
    
    if (!this.chunkAbortControllers.has(taskId)) {
      this.chunkAbortControllers.set(taskId, new Map());
    }
    
    this.chunkAbortControllers.get(taskId)!.set(chunkIndex, controller);
    return controller;
  }

  // 获取任务的 AbortSignal
  getTaskAbortSignal(taskId: string): AbortSignal | undefined {
    return this.taskAbortControllers.get(taskId)?.signal;
  }

  // 获取分片的 AbortSignal
  getChunkAbortSignal(taskId: string, chunkIndex: number): AbortSignal | undefined {
    // 组合任务级别和分片级别的信号
    const taskController = this.taskAbortControllers.get(taskId);
    const chunkController = this.chunkAbortControllers.get(taskId)?.get(chunkIndex);
    
    if (taskController && chunkController) {
      // 创建组合信号
      const combinedController = new AbortController();
      
      const onAbort = () => combinedController.abort();
      taskController.signal.addEventListener('abort', onAbort);
      chunkController.signal.addEventListener('abort', onAbort);
      
      return combinedController.signal;
    }
    
    return taskController?.signal || chunkController?.signal;
  }

  // 中止任务
  private abortTask(taskId: string): void {
    // 中止任务级别的请求
    const taskController = this.taskAbortControllers.get(taskId);
    if (taskController) {
      taskController.abort();
      this.taskAbortControllers.delete(taskId);
    }
    
    // 中止所有分片级别的请求
    const chunkControllers = this.chunkAbortControllers.get(taskId);
    if (chunkControllers) {
      chunkControllers.forEach(controller => controller.abort());
      this.chunkAbortControllers.delete(taskId);
    }
  }

  // 清理已完成任务的控制器
  cleanupTask(taskId: string): void {
    this.taskAbortControllers.delete(taskId);
    this.chunkAbortControllers.delete(taskId);
    this.pausedTasks.delete(taskId);
  }

  // 检查是否应该暂停
  shouldPause(taskId: string): boolean {
    return this.isPaused.value || this.pausedTasks.has(taskId);
  }

  // 需要外部提供获取任务的方法
  private getTask: (taskId: string) => FileTask | undefined = () => undefined;
  
  setTaskGetter(getter: (taskId: string) => FileTask | undefined): void {
    this.getTask = getter;
  }
}
