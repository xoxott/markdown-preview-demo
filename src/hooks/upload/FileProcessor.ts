import type { FileTask, FileUploadOptions, IFileProcessor, UploadConfig } from './type';
import FileValidator from './FileValidator';
import FileCompressor from './FileCompressor';
import PreviewGenerator from './PreviewGenerator';
import TaskQueueManager from './managers/TaskQueueManager';
import { calculateFileMD5 } from './utils';

export class FileProcessor implements IFileProcessor {
  private fileValidator: FileValidator;
  private taskQueueManager: TaskQueueManager;

  constructor(private config: UploadConfig) {
    this.fileValidator = new FileValidator(config);
    this.taskQueueManager = new TaskQueueManager();
  }

  async processFile(file: File, options: FileUploadOptions): Promise<FileTask> {
    // 验证文件
    const isValid = await this.validateFile(file);
    if (!isValid) {
      throw new Error(`文件验证失败: ${file.name}`);
    }

    // 压缩文件
    const processedFile = await this.compressFile(file);

    // 生成预览
    const preview = await this.generatePreview(processedFile);

    // 计算MD5（如果需要）
    let md5: string | undefined;
    if (this.config.enableDeduplication) {
      md5 = await calculateFileMD5(processedFile);
    }

    // 创建任务
    const task = this.taskQueueManager.createTask(file, processedFile, options, this.config, 0, preview);

    if (md5) {
      task.fileMD5 = md5;
      task.options.metadata = {
        ...task.options.metadata,
        md5
      };
    }

    return task;
  }

  async validateFile(file: File): Promise<boolean> {
    const { valid } = this.fileValidator.validate([file]);
    return valid.length > 0;
  }

  async compressFile(file: File): Promise<File> {
    if (!this.config.enableCompression || !file.type.startsWith('image/')) {
      return file;
    }

    try {
      return await FileCompressor.compressImage(
        file,
        this.config.compressionQuality,
        this.config.previewMaxWidth,
        this.config.previewMaxHeight
      );
    } catch (error) {
      console.warn('文件压缩失败:', error);
      return file;
    }
  }

  async generatePreview(file: File): Promise<string | undefined> {
    if (!this.config.enablePreview || !PreviewGenerator.canGeneratePreview(file)) {
      return undefined;
    }

    try {
      if (file.type.startsWith('image/')) {
        return await PreviewGenerator.generateImagePreview(file);
      }
      if (file.type.startsWith('video/')) {
        return await PreviewGenerator.generateVideoPreview(file);
      }
      return undefined;
    } catch (error) {
      console.warn('生成预览失败:', error);
      return undefined;
    }
  }
}
