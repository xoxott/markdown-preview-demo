/**
 * RequestClient 完整功能示例
 * 展示所有功能的使用方法，确保功能正常
 */

import { onRequestComplete, onRequestError, onRequestStart, onRequestSuccess } from '@suga/request-events';
import { configureLogger, logErrorWithManager, logRequestWithManager, logResponseWithManager } from '@suga/request-logger';
import { createRequestClient } from '@/utils/request/createRequestClient';
import type { AxiosProgressEvent } from 'axios';
import { NAlert, NButton, NCard, NCode, NConfigProvider, NDivider, NH3, NProgress, NScrollbar, NSpace, NText } from 'naive-ui';
import { defineComponent, onMounted, ref } from 'vue';

// 创建请求客户端（仅配置 Axios 基础配置，步骤配置已写死在 createRequestClient 内部）
const client = createRequestClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default defineComponent({
  name: 'RequestClientExample',
  setup() {
    // 状态管理
    const loading = ref(false);
    const result = ref<any>(null);
    const error = ref<string | null>(null);
    const logs = ref<string[]>([]);
    const uploadProgress = ref(0);
    const downloadProgress = ref(0);
    const requestId = ref<string | null>(null);
    const cancelController = ref<AbortController | null>(null);

    // 添加日志
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      logs.value.unshift(`[${timestamp}] ${message}`);
      if (logs.value.length > 50) {
        logs.value.pop();
      }
    };
    // 1. 基础请求示例
    const handleBasicRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始基础请求...');

      try {
        const data = await client.get('/posts/1');
        result.value = data;
        addLog('基础请求成功');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`基础请求失败: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 2. 缓存功能示例
    const handleCacheRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始缓存请求（第一次，会发送请求）...');

      try {
        const startTime = Date.now();
        const data = await client.get('/posts/2', undefined, {
          cache: true,
          cacheExpireTime: 60000, // 60秒
        });
        const duration = Date.now() - startTime;
        result.value = { ...(data as Record<string, unknown>), _duration: duration, _fromCache: false };
        addLog(`缓存请求成功（耗时: ${duration}ms）`);

        // 立即再次请求，应该从缓存读取
        setTimeout(async () => {
          addLog('开始缓存请求（第二次，应该从缓存读取）...');
          const startTime2 = Date.now();
          const data2 = await client.get('/posts/2', undefined, {
            cache: true,
            cacheExpireTime: 60000,
          });
          const duration2 = Date.now() - startTime2;
          result.value = { ...(data2 as Record<string, unknown>), _duration: duration2, _fromCache: true };
          addLog(`缓存请求成功（从缓存读取，耗时: ${duration2}ms）`);
          loading.value = false;
        }, 100);
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`缓存请求失败: ${error.value}`);
        loading.value = false;
      }
    };

    // 3. 重试功能示例（模拟失败请求）
    const handleRetryRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始重试请求（会失败并重试）...');

      try {
        const data = await client.get('/posts/99999', undefined, {
          retry: {
            retry: true,
            retryCount: 3,
            retryOnTimeout: false,
          },
        });
        result.value = data;
        addLog('重试请求成功');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`重试请求失败（已重试）: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 4. 去重功能示例
    const handleDedupeRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始去重请求（同时发送3个相同请求，应该只发送1个）...');

      try {
        // 同时发送3个相同的请求
        const promises = [
          client.get('/posts/3', undefined, { dedupe: true }),
          client.get('/posts/3', undefined, { dedupe: true }),
          client.get('/posts/3', undefined, { dedupe: true }),
        ];

        const results = await Promise.all(promises);
        result.value = {
          count: results.length,
          data: results[0],
          message: '3个请求被去重为1个',
        };
        addLog('去重请求成功（3个请求被去重为1个）');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`去重请求失败: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 5. 队列功能示例
    const handleQueueRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始队列请求（发送10个请求，最大并发5个）...');

      try {
        const promises = Array.from({ length: 10 }, (_, i) =>
          client.get(`/posts/${i + 1}`, undefined, {
            queue: {
              maxConcurrent: 5,
              queueStrategy: 'fifo',
            },
            priority: 10 - i, // 优先级递减
          })
        );

        const results = await Promise.all(promises);
        result.value = {
          count: results.length,
          message: '10个请求通过队列管理（最大并发5个）',
        };
        addLog('队列请求成功（10个请求通过队列管理）');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`队列请求失败: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 6. 进度监控示例
    const handleProgressRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      uploadProgress.value = 0;
      downloadProgress.value = 0;
      addLog('开始进度监控请求...');

      try {
        const data = await client.post('/posts', {
          title: 'Test Post',
          body: 'This is a test post',
          userId: 1,
        }, {
          onUploadProgress: (progressEvent: unknown) => {
            const event = progressEvent as AxiosProgressEvent;
            if (event.total) {
              uploadProgress.value = Math.round((event.loaded * 100) / event.total);
              addLog(`上传进度: ${uploadProgress.value}%`);
            }
          },
          onDownloadProgress: (progressEvent: unknown) => {
            const event = progressEvent as AxiosProgressEvent;
            if (event.total) {
              downloadProgress.value = Math.round((event.loaded * 100) / event.total);
              addLog(`下载进度: ${downloadProgress.value}%`);
            }
          },
        });
        result.value = data;
        addLog('进度监控请求成功');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`进度监控请求失败: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 7. 请求中止示例
    const handleCancelRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始可中止请求...');

      // 创建 AbortController
      const controller = new AbortController();
      cancelController.value = controller;
      requestId.value = `request-${Date.now()}`;

      try {
        // 发送一个长时间运行的请求
        const promise = client.get('/posts', undefined, {
          abortable: true,
          requestId: requestId.value,
          signal: controller.signal,
        });

        // 3秒后中止请求
        setTimeout(() => {
          addLog('中止请求...');
          controller.abort();
        }, 3000);

        const data = await promise;
        result.value = data;
        addLog('可中止请求成功');
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('canceled') || err.message?.includes('aborted')) {
          error.value = '请求已被中止';
          addLog('请求已被中止');
        } else {
          error.value = err.message || '请求失败';
          addLog(`可中止请求失败: ${error.value}`);
        }
      } finally {
        loading.value = false;
        cancelController.value = null;
      }
    };

    // 8. 手动中止请求
    const handleManualCancel = () => {
      if (cancelController.value) {
        cancelController.value.abort();
        addLog('手动中止请求');
      }
    };

    // 9. POST 请求示例
    const handlePostRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始 POST 请求...');

      try {
        const data = await client.post('/posts', {
          title: 'New Post',
          body: 'This is a new post',
          userId: 1,
        });
        result.value = data;
        addLog('POST 请求成功');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`POST 请求失败: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 10. PUT 请求示例
    const handlePutRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始 PUT 请求...');

      try {
        const data = await client.put('/posts/1', {
          id: 1,
          title: 'Updated Post',
          body: 'This post has been updated',
          userId: 1,
        });
        result.value = data;
        addLog('PUT 请求成功');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`PUT 请求失败: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 11. DELETE 请求示例
    const handleDeleteRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始 DELETE 请求...');

      try {
        await client.delete('/posts/1');
        result.value = { message: '删除成功' };
        addLog('DELETE 请求成功');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`DELETE 请求失败: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 12. 完整配置示例
    const handleFullConfigRequest = async () => {
      loading.value = true;
      error.value = null;
      result.value = null;
      addLog('开始完整配置请求（包含所有功能）...');

      try {
        const data = await client.get('/posts/1', undefined, {
          // 缓存
          cache: true,
          cacheExpireTime: 60000,

          // 重试
          retry: {
            retry: true,
            retryCount: 3,
            retryOnTimeout: false,
          },

          // 去重
          dedupe: true,

          // 中止
          abortable: true,

          // 日志
          logEnabled: true,
          logger: {
            enabled: true,
            logRequest: true,
            logResponse: true,
            logError: true,
          },

          // 队列
          queue: {
            maxConcurrent: 5,
            queueStrategy: 'fifo',
          },
          priority: 10,
        });
        result.value = data;
        addLog('完整配置请求成功');
      } catch (err: any) {
        error.value = err.message || '请求失败';
        addLog(`完整配置请求失败: ${error.value}`);
      } finally {
        loading.value = false;
      }
    };

    // 清空日志
    const clearLogs = () => {
      logs.value = [];
      addLog('日志已清空');
    };

    return () => (
      <div class="space-y-6">
        <NCard bordered>
          <NH3 class="border-b pb-2 text-lg font-semibold mb-4">RequestClient 功能示例</NH3>
          <NText class="text-gray-500 mb-4 block">
            展示业务层封装的请求客户端功能，包括缓存、重试、熔断、去重、队列、日志、进度监控、请求取消等。
          </NText>

          {/* 功能按钮 */}
          <div class="space-y-4">
            <NDivider>基础功能</NDivider>
            <NSpace wrap>
              <NButton type="primary" onClick={handleBasicRequest} loading={loading.value}>
                基础请求
              </NButton>
              <NButton type="info" onClick={handlePostRequest} loading={loading.value}>
                POST 请求
              </NButton>
              <NButton type="warning" onClick={handlePutRequest} loading={loading.value}>
                PUT 请求
              </NButton>
              <NButton type="error" onClick={handleDeleteRequest} loading={loading.value}>
                DELETE 请求
              </NButton>
            </NSpace>

            <NDivider>高级功能</NDivider>
            <NSpace wrap>
              <NButton type="success" onClick={handleCacheRequest} loading={loading.value}>
                缓存功能
              </NButton>
              <NButton type="info" onClick={handleRetryRequest} loading={loading.value}>
                重试功能
              </NButton>
              <NButton type="warning" onClick={handleDedupeRequest} loading={loading.value}>
                去重功能
              </NButton>
              <NButton type="primary" onClick={handleQueueRequest} loading={loading.value}>
                队列功能
              </NButton>
            </NSpace>

            <NDivider>其他功能</NDivider>
            <NSpace wrap>
              <NButton type="success" onClick={handleProgressRequest} loading={loading.value}>
                进度监控
              </NButton>
              <NButton type="error" onClick={handleCancelRequest} loading={loading.value}>
                可中止请求
              </NButton>
              {cancelController.value && (
                <NButton type="error" onClick={handleManualCancel}>
                  手动中止
                </NButton>
              )}
              <NButton type="primary" onClick={handleFullConfigRequest} loading={loading.value}>
                完整配置
              </NButton>
            </NSpace>
          </div>

          {/* 进度显示 */}
          {(uploadProgress.value > 0 || downloadProgress.value > 0) && (
            <div class="mt-4 space-y-2">
              {uploadProgress.value > 0 && (
                <div>
                  <NText class="text-sm">上传进度:</NText>
                  <NProgress percentage={uploadProgress.value} />
                </div>
              )}
              {downloadProgress.value > 0 && (
                <div>
                  <NText class="text-sm">下载进度:</NText>
                  <NProgress percentage={downloadProgress.value} />
                </div>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {error.value && (
            <NAlert type="error" class="mt-4">
              {error.value}
            </NAlert>
          )}

          {/* 结果显示 */}
          {result.value && (
            <div class="mt-4">
              <NText class="text-sm font-semibold mb-2 block">请求结果:</NText>
              <NScrollbar style="max-height: 300px;">
                <NCode language="json" code={JSON.stringify(result.value, null, 2)} />
              </NScrollbar>
            </div>
          )}
        </NCard>

        {/* 日志面板 */}
        <NCard bordered>
          <div class="flex items-center justify-between mb-4">
            <NH3 class="text-lg font-semibold">请求日志</NH3>
            <NButton size="small" onClick={clearLogs}>
              清空日志
            </NButton>
          </div>
          <NScrollbar style="max-height: 400px;">
            <div class="space-y-1">
              {logs.value.length === 0 ? (
                <NText class="text-gray-400">暂无日志</NText>
              ) : (
                logs.value.map((log, index) => (
                  <div key={index} class="text-sm font-mono text-gray-700 py-1 px-2 hover:bg-gray-50 rounded">
                    {log}
                  </div>
                ))
              )}
            </div>
          </NScrollbar>
        </NCard>
      </div>
    );
  }
});

