# @suga/request-axios

Axios 传输层适配器，用于 `@suga/request-core`。

## 安装

```bash
pnpm add @suga/request-axios
# 或
npm install @suga/request-axios
# 或
yarn add @suga/request-axios
```

## 快速开始

```typescript
import { RequestClient } from '@suga/request-core';
import { AxiosTransport, TransportStep } from '@suga/request-axios';
import axios from 'axios';

// 创建 Axios 实例
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 创建 Transport
const transport = new AxiosTransport({ instance: axiosInstance });

// 创建请求客户端
const client = new RequestClient(transport)
  .with(new TransportStep(transport));

// 发起请求
const data = await client.get('/users');
```

## API

### `AxiosTransport`

Axios 传输层适配器，实现 `Transport` 接口。

#### 构造函数

```typescript
new AxiosTransport(options?: AxiosTransportOptions)
```

**参数：**
- `options.instance?: AxiosInstance` - 使用现有的 Axios 实例
- `options.defaultConfig?: AxiosRequestConfig` - 如果没有提供 instance，使用此配置创建新实例

### `TransportStep`

传输步骤，用于在请求链中执行实际的 HTTP 请求。

#### 构造函数

```typescript
new TransportStep(transport: Transport)
```

**参数：**
- `transport: Transport` - 传输层实例

### `AbortStep`

取消步骤，检查请求是否已通过 `AbortSignal` 取消。

## 特性

- ✅ **轻量级**：只包含 Axios 适配相关代码
- ✅ **类型安全**：完整的 TypeScript 支持
- ✅ **灵活配置**：支持使用现有 Axios 实例或创建新实例
- ✅ **取消支持**：自动处理 Axios `cancelToken`

## 注意事项

- 此包专注于 Axios 传输层适配，不包含业务逻辑
- 响应格式处理应由应用层实现
- 错误处理遵循 Axios 的错误格式

