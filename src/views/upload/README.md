# 🚀 分片上传工具

一个为 **Vue3 项目** 打造的分片上传工具，提供完善的 **类型安全**、**性能优化** 和 **用户体验**。

---

## ✨ 核心特性

### 1. 📝 完整的 TypeScript 类型支持

- 详细的接口定义和类型约束
- 完善的泛型支持和类型推导
- IDE 智能提示和错误检查

### 2. 🔄 Vue3 响应式集成

- 使用 Vue3 的 `ref`、`reactive`、`computed`
- 完美的响应式状态管理
- 组合式 API：`useChunkUpload`

### 3. 🎨 Naive UI 原生支持

- 无缝集成 **Naive UI 上传组件**
- 状态转换和格式适配
- 完整的组件使用示例

### 4. ⚡ 增强的功能特性

#### 📊 性能监控

- 实时上传速度计算
- 预计剩余时间
- 详细的统计信息

#### 🔄 断点续传

- 支持暂停 / 恢复上传
- 网络中断自动恢复
- 切片级别的状态管理

#### ⚡ 并发控制优化

- 信号量机制控制并发
- 智能优先级调度
- 资源使用优化

#### 🛡️ 错误处理

- 指数退避重试策略
- 详细的错误信息
- 优雅的降级处理

#### 📈 扩展功能

- 文件去重（秒传）
- MD5 校验
- 自定义参数支持
- Web Worker 支持（预留）

---

## 🎯 在 Vue3 项目中的使用

### 1. 基础用法

```ts
// 在组件中使用
const {
  uploadQueue,
  activeUploads,
  completedUploads,
  totalProgress,
  uploadSpeed,
  isUploading,
  isPaused,
  uploadStats,
  uploader,
  addFiles,
  start,
  pause,
  resume,
  cancel,
  retryFailed,
  removeFile,
  clear,
  createNaiveFileList
  } = useChunkUpload({
  maxConcurrentFiles: 2,
  maxConcurrentChunks: 4,
  chunkSize: 2 * 1024 * 1024, // 2MB
  uploadChunkUrl: '/api/upload/chunk',
  mergeChunksUrl: '/api/upload/merge',
  maxFileSize: 500 * 1024 * 1024, // 500MB
  enableResume: true,
  enableDeduplication: true
})

// 链式调用设置回调
uploader
  .onFileStart(task => {
    console.log(`开始上传: ${task.file.name}`);
  })
  .onFileSuccess(async (task) => {
    // 文件上传成功后的后续处理
    await processUploadedFile(task.result.fileUrl)
  })
  .onFileError((task, error) => {
    console.log(`上传失败: ${task.file.name} - ${error.message}`);
  })
  .onAllComplete(tasks => {
    const successCount = tasks.filter(t => t.status === UploadStatus.SUCCESS).length;
    console.log(`批量上传完成! 成功: ${successCount}${tasks.length}`);
  });
  .onTotalProgress((progress) => {
    console.log(`总进度: ${progress}%`)
  })


```
