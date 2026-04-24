# Token 刷新问题修复说明

## 🐛 问题描述

当 Access Token 过期时，后端返回：

```json
{
  "code": 1202,
  "message": "Access token has expired",
  "details": { ... },
  "timestamp": "2025-12-07T13:59:34.945Z"
}
```

HTTP 状态码为 **401**，但前端没有自动触发 token 刷新机制。

## 🔍 问题原因

### 原问题

axios 的 `validateStatus` 配置只认为 HTTP 状态码 200-299 和 304 是"成功"的：

```typescript
// packages/axios/src/shared.ts
export function isHttpSuccess(status: number) {
  const isSuccessCode = status >= 200 && status < 300;
  return isSuccessCode || status === 304;
}
```

### 导致的问题流程

```
1. API 返回: HTTP 401 + code 1202
   ↓
2. axios validateStatus 判断: 401 不是成功状态
   ↓
3. axios 抛出错误，进入 onError
   ↓
4. onError 只显示错误消息，不处理 token 刷新
   ↓
5. ❌ Token 刷新逻辑没有触发
```

## ✅ 修复方案

### 修改 validateStatus 配置

将 HTTP 401 也视为有效响应，让业务逻辑来判断是否真正成功：

```typescript
// packages/axios/src/shared.ts
export function isHttpSuccess(status: number) {
  const isSuccessCode = status >= 200 && status < 300;
  // 401 也视为成功，因为业务错误（如 token 过期）应该由 isBackendSuccess 和 onBackendFail 处理
  // 真正的业务状态由响应体中的 code 字段决定，而不是 HTTP 状态码
  return isSuccessCode || status === 304 || status === 401;
}
```

### 修复后的流程

```
1. API 返回: HTTP 401 + code 1202
   ↓
2. axios validateStatus 判断: 401 被视为有效响应 ✅
   ↓
3. 进入 isBackendSuccess 判断: code !== 200/201
   ↓
4. 进入 onBackendFail 处理
   ↓
5. 检测到 errorCode = 1202，在 expiredTokenCodes 中
   ↓
6. ✅ 触发 token 刷新逻辑
   ↓
7. 刷新成功后重新发送原请求
```

## 🎯 核心设计理念

### HTTP 状态码 vs 业务状态码

| 类型                  | 作用                             | 示例                     |
| --------------------- | -------------------------------- | ------------------------ |
| **HTTP 状态码**       | 传输层状态，表示请求是否成功到达 | 200, 401, 404, 500       |
| **业务状态码 (code)** | 业务层状态，表示业务逻辑是否成功 | 200=成功, 1202=token过期 |

### 处理原则

1. **HTTP 401 不代表业务失败**

   - 只是表示需要认证
   - 响应体中的 `code` 才是真正的业务状态

2. **业务逻辑由 code 字段决定**

   ```typescript
   isBackendSuccess(response) {
     const code = response.data.code;
     return code === 200 || code === 201;
   }
   ```

3. **特殊业务场景由 onBackendFail 处理**
   - Token 过期刷新 (code=1202)
   - 账号异常登出 (code=1200,1201,1203...)
   - 模态框提示 (code=1206,1207,2000)

## 📊 完整的请求响应流程

```
┌─────────────────────────────────────────────────┐
│                  发起 API 请求                    │
└────────────────────┬────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│           axios validateStatus 检查              │
│   HTTP 401 → 视为有效响应 ✅                     │
└────────────────────┬────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│         isBackendSuccess 业务状态检查            │
│   code = 1202 → 业务失败 ❌                      │
└────────────────────┬────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│            onBackendFail 错误处理                │
│                                                  │
│  1️⃣ errorCode = 1202 (在 expiredTokenCodes 中)  │
│     ↓                                            │
│  调用 handleExpiredRequest(request.state)       │
│     ↓                                            │
│  调用 /api/admin/auth/refresh                   │
│     ↓                                            │
│  刷新成功？                                       │
│  ├─ 是 → 使用新 token 重试原请求 ✅               │
│  └─ 否 → 执行登出逻辑 ❌                          │
│                                                  │
│  2️⃣ errorCode = 1200,1201,1203... (认证失败)     │
│     → 立即登出                                   │
│                                                  │
│  3️⃣ errorCode = 1206,1207,2000 (账号异常)        │
│     → 显示模态框后登出                            │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 🧪 测试方法

### 1. 测试 Token 自动刷新

```bash
# 1. 登录系统
# 2. 在浏览器控制台执行，查看日志：

# 应该看到以下日志：
[Request] isBackendSuccess check: {
  code: 1202,
  isSuccess: false,
  url: '/api/admin/roles',
  status: 401
}

[Request] onBackendFail triggered: {
  errorCode: '1202',
  expiredTokenCodes: ['1202'],
  url: '/api/admin/roles',
  status: 401,
  message: 'Access token has expired'
}

[Token Refresh] 检测到 token 过期，开始刷新 token，errorCode: 1202
[Token Refresh] 开始调用刷新 token API
[Token Refresh] Token 刷新成功
[Token Refresh] SSE connections updated with new token
[Token Refresh] Token 刷新成功，重新发送请求

# 3. 原请求会自动重试并成功
```

### 2. 测试环境变量配置

```bash
# 在 .env 文件中修改配置
VITE_SERVICE_EXPIRED_TOKEN_CODES=1202,1205

# 重启开发服务器
npm run dev

# 验证配置是否生效（在控制台执行）：
import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES
// 应该输出: "1202,1205"
```

### 3. 测试刷新失败场景

```bash
# 1. 手动清除 refresh token
localStorage.removeItem('refreshToken');

# 2. 等待 access token 过期

# 3. 发起任意 API 请求

# 应该看到以下日志：
[Token Refresh] 检测到 token 过期，开始刷新 token
[Token Refresh] Refresh token 不存在，无法刷新
[Token Refresh] Token 刷新失败，将执行登出逻辑

# 4. 自动跳转到登录页
```

## 🔧 调试技巧

### 1. 启用详细日志

已在代码中添加详细的 console.log，关键日志包括：

```typescript
// 检查响应是否被正确处理
[Request] isBackendSuccess check

// 检查是否进入错误处理
[Request] onBackendFail triggered

// 检查 token 刷新流程
[Token Refresh] 检测到 token 过期
[Token Refresh] 开始调用刷新 token API
[Token Refresh] Token 刷新成功/失败
```

### 2. 检查环境变量

```javascript
// 在浏览器控制台执行
console.log({
  expiredCodes: import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES,
  logoutCodes: import.meta.env.VITE_SERVICE_LOGOUT_CODES,
  modalLogoutCodes: import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES
});
```

### 3. 手动触发 token 过期

```javascript
// 在浏览器控制台执行，设置一个即将过期的 token
// 注意：需要后端配合生成一个短期 token
localStorage.setItem('token', 'your-short-lived-token');
```

## ⚠️ 注意事项

1. **修改后需要重启开发服务器**

   ```bash
   # 停止当前服务器 (Ctrl+C)
   npm run dev
   ```

2. **生产环境需要重新构建**

   ```bash
   npm run build
   ```

3. **清除浏览器缓存**

   - 修改后建议清除浏览器缓存
   - 或者使用隐私模式测试

4. **检查后端配置**
   - 确保后端 token 过期时返回 code = 1202
   - 确保 refresh token 接口正常工作

## 📚 相关文件

- **HTTP 状态验证**: `packages/axios/src/shared.ts`
- **请求拦截器**: `src/service/request/index.ts`
- **Token 刷新逻辑**: `src/service/request/shared.ts`
- **环境变量配置**: `env.example.txt`
- **类型定义**: `src/typings/vite-env.d.ts`

## ✅ 验证清单

- [ ] HTTP 401 响应能正确进入 `onBackendFail`
- [ ] Token 过期时自动触发刷新
- [ ] 刷新成功后原请求自动重试
- [ ] 刷新失败后自动登出
- [ ] 控制台日志完整输出
- [ ] 环境变量配置生效
