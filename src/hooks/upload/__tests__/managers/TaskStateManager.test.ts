/** TaskStateManager 测试 */
import { beforeEach, describe, expect, it } from 'vitest';
import { TaskStateManager } from '../../managers/TaskStateManager';
import type { ReactiveRef } from '../../adapters/types';
import type { FileTask } from '../../types';
import { UploadStatus } from '../../types';

describe('TaskStateManager', () => {
  let manager: TaskStateManager;
  let uploadQueue: ReactiveRef<FileTask[]>;
  let activeUploads: ReactiveRef<Map<string, FileTask>>;
  let completedUploads: ReactiveRef<FileTask[]>;

  const createMockTask = (id: string, status: UploadStatus = UploadStatus.PENDING): FileTask => ({
    id,
    file: new File(['content'], `${id}.txt`, { type: 'text/plain' }),
    status,
    progress: 0,
    speed: 0,
    chunks: [],
    uploadedChunks: 0,
    totalChunks: 0,
    retryCount: 0,
    startTime: null,
    endTime: null,
    pausedTime: 0,
    resumeTime: 0,
    uploadedSize: 0,
    result: null,
    error: null,
    fileMD5: '',
    options: {}
  });

  beforeEach(() => {
    uploadQueue = { value: [] };
    activeUploads = { value: new Map<string, FileTask>() };
    completedUploads = { value: [] };

    manager = new TaskStateManager(uploadQueue, activeUploads, completedUploads);
  });

  describe('getTask', () => {
    it('应该从活动上传中查找任务（最快路径）', () => {
      const task = createMockTask('task-1', UploadStatus.UPLOADING);
      activeUploads.value.set('task-1', task);

      const found = manager.getTask('task-1');
      expect(found).toBe(task);
    });

    it('应该从队列中查找任务', () => {
      const task = createMockTask('task-2', UploadStatus.PENDING);
      uploadQueue.value = [task];

      const found = manager.getTask('task-2');
      expect(found).toBe(task);
    });

    it('应该从已完成列表中查找任务', () => {
      const task = createMockTask('task-3', UploadStatus.SUCCESS);
      completedUploads.value = [task];

      const found = manager.getTask('task-3');
      expect(found).toBe(task);
    });

    it('应该返回 undefined 当任务不存在', () => {
      const found = manager.getTask('nonexistent');
      expect(found).toBeUndefined();
    });

    it('应该优先从活动上传中查找', () => {
      const activeTask = createMockTask('task-1', UploadStatus.UPLOADING);
      const queuedTask = createMockTask('task-1', UploadStatus.PENDING);

      activeUploads.value.set('task-1', activeTask);
      uploadQueue.value = [queuedTask];

      const found = manager.getTask('task-1');
      expect(found).toBe(activeTask); // 优先从 Map 中查找
    });
  });

  describe('getAllTasks', () => {
    it('应该返回所有集合中的任务', () => {
      const queuedTask = createMockTask('task-1', UploadStatus.PENDING);
      const activeTask = createMockTask('task-2', UploadStatus.UPLOADING);
      const completedTask = createMockTask('task-3', UploadStatus.SUCCESS);

      uploadQueue.value = [queuedTask];
      activeUploads.value.set('task-2', activeTask);
      completedUploads.value = [completedTask];

      const all = manager.getAllTasks();
      expect(all).toHaveLength(3);
      expect(all).toContain(queuedTask);
      expect(all).toContain(activeTask);
      expect(all).toContain(completedTask);
    });

    it('应该返回空数组当没有任何任务', () => {
      const all = manager.getAllTasks();
      expect(all).toEqual([]);
    });
  });

  describe('removeFile', () => {
    it('应该从所有集合中移除任务', () => {
      const task = createMockTask('task-1');
      uploadQueue.value = [task];
      activeUploads.value.set('task-1', task);
      completedUploads.value = [task];

      manager.removeFile('task-1');

      expect(uploadQueue.value).toHaveLength(0);
      expect(activeUploads.value.has('task-1')).toBe(false);
      expect(completedUploads.value).toHaveLength(0);
    });

    it('应该只移除存在的集合中的任务', () => {
      const task = createMockTask('task-1');
      uploadQueue.value = [task];

      manager.removeFile('task-1');

      expect(uploadQueue.value).toHaveLength(0);
      expect(activeUploads.value.has('task-1')).toBe(false);
      expect(completedUploads.value).toHaveLength(0);
    });

    it('应该不影响不匹配的任务', () => {
      const task1 = createMockTask('task-1');
      const task2 = createMockTask('task-2');
      uploadQueue.value = [task1, task2];

      manager.removeFile('task-1');

      expect(uploadQueue.value).toHaveLength(1);
      expect(uploadQueue.value[0].id).toBe('task-2');
    });
  });

  describe('exists', () => {
    it('应该在活动上传中存在时返回 true', () => {
      const task = createMockTask('task-1');
      activeUploads.value.set('task-1', task);

      expect(manager.exists('task-1')).toBe(true);
    });

    it('应该在队列中存在时返回 true', () => {
      const task = createMockTask('task-1');
      uploadQueue.value = [task];

      expect(manager.exists('task-1')).toBe(true);
    });

    it('应该在已完成列表中存在时返回 true', () => {
      const task = createMockTask('task-1');
      completedUploads.value = [task];

      expect(manager.exists('task-1')).toBe(true);
    });

    it('应该在不存在时返回 false', () => {
      expect(manager.exists('nonexistent')).toBe(false);
    });
  });

  describe('addToQueue', () => {
    it('应该将任务添加到队列', () => {
      const task = createMockTask('task-1');

      manager.addToQueue(task);

      expect(uploadQueue.value).toHaveLength(1);
      expect(uploadQueue.value[0]).toBe(task);
    });

    it('应该不添加重复任务到队列', () => {
      const task = createMockTask('task-1');
      uploadQueue.value = [task];

      manager.addToQueue(task);

      expect(uploadQueue.value).toHaveLength(1);
    });

    it('应该添加多个不同任务', () => {
      const task1 = createMockTask('task-1');
      const task2 = createMockTask('task-2');

      manager.addToQueue(task1);
      manager.addToQueue(task2);

      expect(uploadQueue.value).toHaveLength(2);
    });
  });

  describe('addToActive', () => {
    it('应该将任务添加到活动上传', () => {
      const task = createMockTask('task-1');

      manager.addToActive(task);

      expect(activeUploads.value.has('task-1')).toBe(true);
      expect(activeUploads.value.get('task-1')).toBe(task);
    });

    it('应该覆盖已有的相同 ID 任务', () => {
      const task1 = createMockTask('task-1');
      const task2 = createMockTask('task-1', UploadStatus.UPLOADING);

      manager.addToActive(task1);
      manager.addToActive(task2);

      expect(activeUploads.value.get('task-1')).toBe(task2);
    });
  });

  describe('moveToCompleted', () => {
    it('应该从活动上传移除并添加到已完成', () => {
      const task = createMockTask('task-1', UploadStatus.UPLOADING);
      activeUploads.value.set('task-1', task);

      manager.moveToCompleted('task-1');

      expect(activeUploads.value.has('task-1')).toBe(false);
      expect(completedUploads.value).toHaveLength(1);
      expect(completedUploads.value[0]).toBe(task);
    });

    it('应该不添加已存在的任务到已完成', () => {
      const task = createMockTask('task-1', UploadStatus.SUCCESS);
      activeUploads.value.set('task-1', task);
      completedUploads.value = [task];

      manager.moveToCompleted('task-1');

      expect(completedUploads.value).toHaveLength(1);
    });

    it('应该在活动上传中不存在时不做任何操作', () => {
      manager.moveToCompleted('nonexistent');

      expect(completedUploads.value).toHaveLength(0);
    });
  });

  describe('moveToQueue', () => {
    it('应该从已完成移除并添加到队列', () => {
      const task = createMockTask('task-1', UploadStatus.SUCCESS);
      completedUploads.value = [task];

      manager.moveToQueue('task-1');

      expect(completedUploads.value).toHaveLength(0);
      expect(uploadQueue.value).toHaveLength(1);
      expect(uploadQueue.value[0]).toBe(task);
    });

    it('应该在已完成中不存在时不做任何操作', () => {
      manager.moveToQueue('nonexistent');

      expect(uploadQueue.value).toHaveLength(0);
    });

    it('应该不添加已存在于队列中的任务', () => {
      const task = createMockTask('task-1');
      completedUploads.value = [task];
      uploadQueue.value = [task];

      manager.moveToQueue('task-1');

      // 不应重复添加
      expect(uploadQueue.value).toHaveLength(1);
    });

    it('应该将任务插入到队列前端', () => {
      const existingTask = createMockTask('task-existing');
      const moveToTask = createMockTask('task-move');
      completedUploads.value = [moveToTask];
      uploadQueue.value = [existingTask];

      manager.moveToQueue('task-move');

      expect(uploadQueue.value[0]).toBe(moveToTask);
      expect(uploadQueue.value[1]).toBe(existingTask);
    });
  });

  describe('clear', () => {
    it('应该清空所有状态', () => {
      const task = createMockTask('task-1');
      uploadQueue.value = [task];
      activeUploads.value.set('task-1', task);
      completedUploads.value = [task];

      manager.clear();

      expect(uploadQueue.value).toEqual([]);
      expect(activeUploads.value.size).toBe(0);
      expect(completedUploads.value).toEqual([]);
    });

    it('应该处理空状态', () => {
      manager.clear();

      expect(uploadQueue.value).toEqual([]);
      expect(activeUploads.value.size).toBe(0);
      expect(completedUploads.value).toEqual([]);
    });
  });

  describe('getTasksByStatus', () => {
    it('应该返回指定状态的任务', () => {
      const pendingTask = createMockTask('task-1', UploadStatus.PENDING);
      const uploadingTask = createMockTask('task-2', UploadStatus.UPLOADING);
      const successTask = createMockTask('task-3', UploadStatus.SUCCESS);

      uploadQueue.value = [pendingTask];
      activeUploads.value.set('task-2', uploadingTask);
      completedUploads.value = [successTask];

      const pending = manager.getTasksByStatus(UploadStatus.PENDING);
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('task-1');

      const uploading = manager.getTasksByStatus(UploadStatus.UPLOADING);
      expect(uploading).toHaveLength(1);
      expect(uploading[0].id).toBe('task-2');
    });

    it('应该在无匹配任务时返回空数组', () => {
      const pendingTask = createMockTask('task-1', UploadStatus.PENDING);
      uploadQueue.value = [pendingTask];

      const errorTasks = manager.getTasksByStatus(UploadStatus.ERROR);
      expect(errorTasks).toEqual([]);
    });
  });

  describe('updateTasksStatus', () => {
    it('应该批量更新任务状态', () => {
      const task1 = createMockTask('task-1', UploadStatus.PENDING);
      const task2 = createMockTask('task-2', UploadStatus.PENDING);

      manager.updateTasksStatus([task1, task2], UploadStatus.UPLOADING);

      expect(task1.status).toBe(UploadStatus.UPLOADING);
      expect(task2.status).toBe(UploadStatus.UPLOADING);
    });

    it('应该批量更新任务状态并附带额外字段', () => {
      const task = createMockTask('task-1', UploadStatus.UPLOADING);

      manager.updateTasksStatus([task], UploadStatus.PAUSED, { pausedTime: 1000 });

      expect(task.status).toBe(UploadStatus.PAUSED);
      expect(task.pausedTime).toBe(1000);
    });

    it('应该处理空任务列表', () => {
      manager.updateTasksStatus([], UploadStatus.UPLOADING);
      // 不应有任何异常
    });
  });
});
