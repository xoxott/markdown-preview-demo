// Workers module exports
export * from './UploadWorkerManager';

// 注意：md5.worker.ts 是 Web Worker 脚本文件，不能作为普通模块导出
// Worker 文件在 Worker 线程中运行，使用 importScripts 而不是 ES 模块

