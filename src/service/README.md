# 业务服务层约定

## 分层

| 层级               | 路径                                | 职责                                                                                                                                |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| HTTP 门面          | `src/service/request/index.ts`      | 装配：`createAxiosRequestStack` + 步骤链 + `createFlatRequestFromStack`；对外导出 `request` / `refreshTokenRequest` / `demoRequest` |
| 业务策略（拦截器） | `src/service/request/policies/*.ts` | 主站鉴权、业务码、Token 刷新与登出、Demo 后端形态等（**含业务逻辑**，属正常）                                                       |
| 横切管道           | `src/service/request/pipeline/`     | `buildPipelineSteps(transport, profile)`、`createPipelineClient`：缓存、去重、中止、队列、事件、重试、熔断；**profile** 见下        |
| 领域 API           | `src/service/api/*.ts`              | 按资源拆分的函数（如 `fetchUserList`），内部只调 `request`                                                                          |
| 页面 / 特性模块    | `src/views/*`、`src/components/*`   | **只**从 `@/service/api`（或具体 `./api/xxx`）引用方法，不直接依赖 `axios`                                                          |

### 管道 profile（`PipelineProfile`）

| 值          | 含义                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `standard`  | 默认：缓存、去重、中止、队列、事件、重试、熔断 + 传输（与历史 `buildDefaultPipelineSteps` 一致） |
| `minimal`   | 仅 `PrepareContext` + `PipelineTransport`，适合调试或极轻场景                                    |
| `resilient` | 在 `standard` 基础上提高重试次数与队列并发（见 `pipeline/pipelineProfile.ts`）                   |

主业务实例可通过环境变量 **`VITE_HTTP_PIPELINE_PROFILE`** 设为 `standard` | `resilient`（非法或未设则 `standard`）。`createPipelineClient({ pipelineProfile: 'minimal' })` 亦可单独指定。

`buildPipelineSteps` 对缓存/去重/队列/重试/熔断步骤传入 **`enabledByDefault: true`**，并共用同一个 `RequestCacheManager`；`CacheWrite` 排在 `Transport` 之前（先 `next()` 发请求再写入）。`AxiosTransport` 向上抛出原始 `AxiosError`（保留 `response.status`），供 5xx 重试与熔断计数；`composeSteps` 为 `RetryStep` 注入可重入的后续链执行。主站 `request` 无需为每次请求塞 `meta`；GET 命中缓存时由 `runPipelineAxiosRequest` 合成 `AxiosResponse`。集成测试见 `src/service/request/__tests__/pipeline-axios.test.ts`。

## 页面怎么用

1. **默认**：`import { fetchUserList } from '@/service/api/user'` 或 `import { fetchUserList } from '@/service/api'`（统一从 barrel 导出时）。
2. **需要管道能力**（第三方演示、非标准后端等）：`import { createPipelineClient } from '@/service/request/pipeline'`，自行处理响应体与鉴权。

主业务 `request` 已与共享 `AxiosInstance` 上的拦截器策略及默认步骤链合并；策略代码在 `policies/`，避免在 `index.ts` 堆叠过长逻辑。
