# 存储服务适配指南

upload-v2 支持通过自定义请求转换器适配各种对象存储服务，包括 MinIO、阿里云 OSS、腾讯云 COS、AWS S3 等。

## 目录

- [MinIO](#minio)
- [阿里云 OSS](#阿里云-oss)
- [通用适配方法](#通用适配方法)
- [最佳实践](#最佳实践)

## MinIO

MinIO 是一个高性能的对象存储服务，兼容 Amazon S3 API。

### 配置示例

```typescript
import { useChunkUpload } from '@/hooks/upload-v2';

const uploader = useChunkUpload({
  uploadChunkUrl: 'https://your-minio-server.com/api/upload/chunk',
  mergeChunksUrl: 'https://your-minio-server.com/api/upload/complete',
  
  // MinIO 分片上传参数转换器
  chunkUploadTransformer: ({ task, chunk, customParams = {} }) => {
    const formData = new FormData();
    const blob = chunk.blob || task.file.slice(chunk.start, chunk.end);
    
    // MinIO 分片上传参数
    formData.append('file', blob);
    formData.append('chunk_number', String(chunk.index));
    formData.append('upload_id', task.id); // 或使用 task.fileMD5
    formData.append('total_chunks', String(task.totalChunks));
    formData.append('filename', task.file.name);
    
    // 如果需要认证
    if (customParams.token) {
      formData.append('Authorization', customParams.token);
    }
    
    return formData;
  },
  
  // MinIO 合并分片参数转换器
  mergeChunksTransformer: ({ task, customParams = {} }) => {
    return {
      upload_id: task.id,
      filename: task.file.name,
      total_chunks: task.totalChunks,
      file_md5: task.fileMD5,
      file_size: task.file.size,
      ...customParams
    };
  },
  
  // 其他配置
  maxConcurrentFiles: 3,
  maxConcurrentChunks: 5,
  chunkSize: 5 * 1024 * 1024, // 5MB，MinIO 推荐
  enableResume: true
});
```

### MinIO 服务端要求

#### 分片上传接口 (`uploadChunkUrl`)

**请求方式**: `POST`

**请求参数**:
- `file`: 分片文件 (FormData)
- `chunk_number`: 分片序号 (从 0 开始)
- `upload_id`: 上传任务 ID
- `total_chunks`: 总分片数
- `filename`: 文件名

**响应格式**:
```json
{
  "success": true,
  "chunk_index": 0,
  "etag": "d41d8cd98f00b204e9800998ecf8427e",
  "upload_id": "task-id-123"
}
```

#### 合并分片接口 (`mergeChunksUrl`)

**请求方式**: `POST`

**请求参数**:
- `upload_id`: 上传任务 ID
- `filename`: 文件名
- `total_chunks`: 总分片数
- `file_md5`: 文件 MD5（可选）
- `file_size`: 文件大小

**响应格式**:
```json
{
  "success": true,
  "file_url": "https://your-minio-server.com/bucket/file.jpg",
  "file_id": "file-id-123"
}
```

### 完整示例

```typescript
const uploader = useChunkUpload({
  uploadChunkUrl: 'https://minio.example.com/api/upload/chunk',
  mergeChunksUrl: 'https://minio.example.com/api/upload/complete',
  
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'multipart/form-data'
  },
  
  chunkUploadTransformer: ({ task, chunk }) => {
    const formData = new FormData();
    const blob = chunk.blob || task.file.slice(chunk.start, chunk.end);
    
    formData.append('file', blob, task.file.name);
    formData.append('chunk_number', String(chunk.index));
    formData.append('upload_id', task.id);
    formData.append('total_chunks', String(task.totalChunks));
    formData.append('filename', task.file.name);
    
    return formData;
  },
  
  mergeChunksTransformer: ({ task }) => {
    return {
      upload_id: task.id,
      filename: task.file.name,
      total_chunks: task.totalChunks,
      file_md5: task.fileMD5,
      file_size: task.file.size
    };
  },
  
  // MinIO 推荐配置
  chunkSize: 5 * 1024 * 1024, // 5MB
  maxConcurrentChunks: 5,
  enableResume: true,
  enableCache: true
});
```

## 阿里云 OSS

阿里云 OSS (Object Storage Service) 是阿里云提供的对象存储服务。

### 配置示例

```typescript
import { useChunkUpload } from '@/hooks/upload-v2';

const uploader = useChunkUpload({
  // 阿里云 OSS 分片上传接口
  uploadChunkUrl: 'https://your-bucket.oss-cn-hangzhou.aliyuncs.com',
  mergeChunksUrl: 'https://your-bucket.oss-cn-hangzhou.aliyuncs.com',
  
  // 阿里云 OSS 分片上传参数转换器
  chunkUploadTransformer: ({ task, chunk, customParams = {} }) => {
    const formData = new FormData();
    const blob = chunk.blob || task.file.slice(chunk.start, chunk.end);
    
    // 阿里云 OSS Multipart Upload 参数
    // 注意：OSS 需要先调用 InitiateMultipartUpload 获取 uploadId
    formData.append('partNumber', String(chunk.index + 1)); // OSS 从 1 开始
    formData.append('uploadId', task.id); // 从 InitiateMultipartUpload 获取
    formData.append('key', task.file.name); // 对象键
    
    // 分片内容
    formData.append('file', blob);
    
    return formData;
  },
  
  // 阿里云 OSS 合并分片参数转换器
  mergeChunksTransformer: ({ task, customParams = {} }) => {
    // OSS CompleteMultipartUpload 需要所有分片的 ETag
    const parts = task.chunks
      .filter(c => c.etag)
      .map((c, index) => ({
        PartNumber: index + 1,
        ETag: c.etag
      }))
      .sort((a, b) => a.PartNumber - b.PartNumber);
    
    return {
      uploadId: task.id,
      key: task.file.name,
      completeMultipartUpload: {
        Part: parts
      },
      ...customParams
    };
  },
  
  // 其他配置
  maxConcurrentFiles: 3,
  maxConcurrentChunks: 5,
  chunkSize: 5 * 1024 * 1024, // 5MB，OSS 推荐
  enableResume: true
});
```

### 阿里云 OSS 完整流程

阿里云 OSS 的分片上传需要三个步骤：

1. **InitiateMultipartUpload** - 初始化分片上传
2. **UploadPart** - 上传分片
3. **CompleteMultipartUpload** - 完成分片上传

#### 1. 初始化分片上传

需要在添加文件前调用：

```typescript
// 在添加文件前初始化
const initUpload = async (fileName: string) => {
  const response = await fetch('https://your-bucket.oss-cn-hangzhou.aliyuncs.com', {
    method: 'POST',
    headers: {
      'Authorization': 'OSS your-access-key:your-signature',
      'x-oss-object-name': fileName
    },
    body: JSON.stringify({
      action: 'InitiateMultipartUpload'
    })
  });
  
  const { uploadId } = await response.json();
  return uploadId;
};

// 使用自定义转换器，将 uploadId 传递给任务
const uploader = useChunkUpload({
  uploadChunkUrl: 'https://your-bucket.oss-cn-hangzhou.aliyuncs.com',
  mergeChunksUrl: 'https://your-bucket.oss-cn-hangzhou.aliyuncs.com',
  
  chunkUploadTransformer: ({ task, chunk }) => {
    const formData = new FormData();
    const blob = chunk.blob || task.file.slice(chunk.start, chunk.end);
    
    // OSS UploadPart 参数
    formData.append('partNumber', String(chunk.index + 1));
    formData.append('uploadId', task.id); // 从 InitiateMultipartUpload 获取
    formData.append('key', task.file.name);
    formData.append('file', blob);
    
    return formData;
  },
  
  mergeChunksTransformer: ({ task }) => {
    // OSS CompleteMultipartUpload
    const parts = task.chunks
      .filter(c => c.etag)
      .map((c, index) => ({
        PartNumber: index + 1,
        ETag: c.etag
      }))
      .sort((a, b) => a.PartNumber - b.PartNumber);
    
    return {
      uploadId: task.id,
      key: task.file.name,
      completeMultipartUpload: {
        Part: parts
      }
    };
  }
});

// 添加文件前初始化
const handleAddFiles = async (files: File[]) => {
  for (const file of files) {
    const uploadId = await initUpload(file.name);
    // 将 uploadId 作为任务 ID 或存储在 options 中
    await uploader.addFiles(file, {
      metadata: { uploadId }
    });
  }
  await uploader.start();
};
```

#### 2. 分片上传响应处理

OSS 的 UploadPart 响应会返回 ETag，需要保存：

```typescript
// 在 ChunkService 中，响应格式应该是：
interface ChunkUploadResponse {
  success: boolean;
  chunkIndex: number;
  etag: string; // OSS 返回的 ETag
  uploadId: string;
}
```

#### 3. 完整示例（使用代理服务）

如果你的后端提供了统一的代理接口：

```typescript
const uploader = useChunkUpload({
  // 后端代理 OSS 的接口
  uploadChunkUrl: '/api/oss/upload-part',
  mergeChunksUrl: '/api/oss/complete',
  
  headers: {
    'Authorization': 'Bearer your-token'
  },
  
  chunkUploadTransformer: ({ task, chunk }) => {
    const formData = new FormData();
    const blob = chunk.blob || task.file.slice(chunk.start, chunk.end);
    
    formData.append('file', blob);
    formData.append('partNumber', String(chunk.index + 1));
    formData.append('uploadId', task.id);
    formData.append('key', task.file.name);
    
    return formData;
  },
  
  mergeChunksTransformer: ({ task }) => {
    // 后端会从任务中获取所有分片的 ETag
    return {
      uploadId: task.id,
      key: task.file.name,
      totalChunks: task.totalChunks
    };
  }
});
```

### 阿里云 OSS 服务端要求

#### 分片上传接口

**请求方式**: `PUT` 或 `POST`

**请求参数**:
- `file`: 分片文件
- `partNumber`: 分片序号（从 1 开始）
- `uploadId`: 上传任务 ID（从 InitiateMultipartUpload 获取）
- `key`: 对象键（文件名）

**响应头**:
- `ETag`: 分片的 ETag（必须保存，用于合并）

#### 合并分片接口

**请求方式**: `POST`

**请求参数**:
- `uploadId`: 上传任务 ID
- `key`: 对象键
- `completeMultipartUpload.Part[]`: 所有分片的 PartNumber 和 ETag

**响应格式**:
```json
{
  "success": true,
  "file_url": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/file.jpg",
  "etag": "file-etag"
}
```

## 通用适配方法

对于其他存储服务（如腾讯云 COS、AWS S3、七牛云等），可以按照以下步骤适配：

### 1. 了解存储服务的分片上传 API

- 分片上传接口的参数格式
- 分片序号是从 0 还是 1 开始
- 是否需要先初始化上传
- 合并分片需要的参数

### 2. 配置请求转换器

```typescript
chunkUploadTransformer: ({ task, chunk, customParams }) => {
  // 根据存储服务的 API 要求构建请求参数
  const formData = new FormData();
  const blob = chunk.blob || task.file.slice(chunk.start, chunk.end);
  
  // 添加存储服务需要的参数
  formData.append('file', blob);
  formData.append('chunkIndex', String(chunk.index));
  // ... 其他参数
  
  return formData;
}
```

### 3. 处理响应格式

确保服务端返回的响应格式符合 `ChunkUploadResponse` 接口：

```typescript
interface ChunkUploadResponse {
  success: boolean;
  chunkIndex: number;
  etag?: string;      // 某些服务需要
  uploadId?: string;  // 某些服务需要
  error?: string;
}
```

### 4. 配置合并接口

```typescript
mergeChunksTransformer: ({ task, customParams }) => {
  // 根据存储服务的合并 API 要求构建参数
  return {
    uploadId: task.id,
    fileName: task.file.name,
    totalChunks: task.totalChunks,
    // 如果需要所有分片的 ETag
    parts: task.chunks
      .filter(c => c.etag)
      .map((c, index) => ({
        partNumber: index + 1,
        etag: c.etag
      }))
  };
}
```

## 最佳实践

### 1. 使用后端代理

推荐使用后端代理存储服务的接口，而不是直接调用：

**优点**：
- 安全性：不暴露存储服务的 AccessKey
- 统一性：统一的错误处理和日志记录
- 灵活性：可以在后端做额外的处理（如文件校验、病毒扫描等）

```typescript
const uploader = useChunkUpload({
  // 使用后端代理接口
  uploadChunkUrl: '/api/storage/upload-chunk',
  mergeChunksUrl: '/api/storage/merge-chunks',
  
  // 后端会处理具体的存储服务调用
  chunkUploadTransformer: ({ task, chunk }) => {
    const formData = new FormData();
    formData.append('file', chunk.blob || task.file.slice(chunk.start, chunk.end));
    formData.append('chunkIndex', String(chunk.index));
    formData.append('taskId', task.id);
    return formData;
  }
});
```

### 2. 错误处理

针对不同存储服务的错误码进行处理：

```typescript
uploader.callbackManager.on('onFileError', (task, error) => {
  // 根据错误类型处理
  if (error.message.includes('403')) {
    // 权限错误
    console.error('存储服务权限错误');
  } else if (error.message.includes('503')) {
    // 服务不可用，可以重试
    uploader.retrySingleFile(task.id);
  }
});
```

### 3. 分片大小选择

不同存储服务推荐的分片大小：

- **MinIO**: 5MB - 10MB
- **阿里云 OSS**: 5MB - 10MB（最小 100KB，最大 5GB）
- **腾讯云 COS**: 1MB - 5MB
- **AWS S3**: 5MB - 10MB

```typescript
const chunkSize = 5 * 1024 * 1024; // 5MB，适用于大多数服务
```

### 4. 并发控制

根据存储服务的限制调整并发数：

```typescript
{
  maxConcurrentFiles: 3,  // 同时上传的文件数
  maxConcurrentChunks: 5  // 每个文件同时上传的分片数
}
```

### 5. 断点续传

确保存储服务支持断点续传，并正确配置：

```typescript
{
  enableResume: true,
  enableCache: true  // 缓存上传进度
}
```

## 常见问题

### Q: MinIO 和阿里云 OSS 可以直接使用吗？

A: upload-v2 是通用的分片上传工具，通过自定义请求转换器可以适配任何存储服务。你需要根据存储服务的 API 文档配置 `chunkUploadTransformer` 和 `mergeChunksTransformer`。

### Q: 是否需要后端支持？

A: 推荐使用后端代理，因为：
1. 安全性：不暴露存储服务的密钥
2. 统一性：统一的错误处理
3. 灵活性：可以在后端做额外处理

### Q: 如何获取上传后的文件 URL？

A: 在 `onFileSuccess` 回调中获取：

```typescript
uploader.callbackManager.on('onFileSuccess', (task, result) => {
  const fileUrl = result.fileUrl; // 从合并接口返回
  console.log('文件上传成功:', fileUrl);
});
```

### Q: 如何处理存储服务的特殊要求？

A: 通过自定义转换器处理：

```typescript
chunkUploadTransformer: ({ task, chunk }) => {
  // 根据存储服务的特殊要求构建参数
  // 例如：OSS 需要 partNumber 从 1 开始
  // MinIO 可能需要特定的参数格式
}
```

## 总结

upload-v2 通过灵活的请求转换器机制，可以适配任何支持分片上传的存储服务。只需要：

1. 了解存储服务的分片上传 API
2. 配置 `chunkUploadTransformer` 和 `mergeChunksTransformer`
3. 确保服务端返回正确的响应格式

推荐使用后端代理的方式，这样更安全、更灵活。


