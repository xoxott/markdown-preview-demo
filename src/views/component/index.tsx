/**
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 21:48:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-08 14:34:28
 * @FilePath: \markdown-preview-demo\src\views\component\index.tsx
 * @Description: 组件示例页面，包含各种组件的使用示例
 *
 * 示例组件已拆分为独立文件，便于维护和扩展
 * 新增示例时，请在 examples 目录下创建对应的组件文件
 */
import { defineComponent } from 'vue';
import {
  BasicComponentsExample,
  ClockLoadingExample,
  FlowExamples,
  RequestClientExample,
  StreamingPenDebugExample,
  StreamingPenExample,
  StreamingPenPositionCompareExample
} from './examples';

export default defineComponent({
  name: 'ComponentExample',
  setup() {
    return () => (
      <div class="p-4 space-y-6">
        {/* ==================== 加载组件 (Loading Components) ==================== */}
        <section class="space-y-4">
          <div class="mb-4 flex items-center gap-3">
            <div class="h-1 w-12 rounded bg-blue-500"></div>
            <h1 class="text-3xl text-gray-900 font-bold">加载组件</h1>
            <div class="h-1 flex-1 rounded bg-gray-200"></div>
          </div>
          <ClockLoadingExample />
        </section>

        {/* ==================== 基础组件 (Basic Components) ==================== */}
        <section class="space-y-4">
          <div class="mb-4 flex items-center gap-3">
            <div class="h-1 w-12 rounded bg-green-500"></div>
            <h1 class="text-3xl text-gray-900 font-bold">基础组件</h1>
            <div class="h-1 flex-1 rounded bg-gray-200"></div>
          </div>
          <div class="rounded-lg bg-white p-6 shadow-sm">
            <BasicComponentsExample />
          </div>
        </section>

        {/* ==================== 流程图组件 (Flow Components) ==================== */}
        <section class="space-y-4">
          <div class="mb-4 flex items-center gap-3">
            <div class="h-1 w-12 rounded bg-purple-500"></div>
            <h1 class="text-3xl text-gray-900 font-bold">流程图组件</h1>
            <div class="h-1 flex-1 rounded bg-gray-200"></div>
          </div>
          <FlowExamples />
        </section>

        {/* ==================== RequestClient 组件 (Request Client) ==================== */}
        <section class="space-y-4">
          <div class="mb-4 flex items-center gap-3">
            <div class="h-1 w-12 rounded bg-orange-500"></div>
            <h1 class="text-3xl text-gray-900 font-bold">RequestClient</h1>
            <div class="h-1 flex-1 rounded bg-gray-200"></div>
          </div>
          <div class="rounded-lg bg-white p-6 shadow-sm">
            <RequestClientExample />
          </div>
        </section>

        {/* ==================== 流式笔写效果 (Streaming Pen Effect) ==================== */}
        <section class="space-y-4">
          <div class="mb-4 flex items-center gap-3">
            <div class="h-1 w-12 rounded bg-pink-500"></div>
            <h1 class="text-3xl text-gray-900 font-bold">流式笔写效果</h1>
            <div class="h-1 flex-1 rounded bg-gray-200"></div>
          </div>

          {/* 位置对比工具 */}
          <div class="rounded-lg bg-white p-6 shadow-sm">
            <StreamingPenPositionCompareExample />
          </div>

          {/* 调试工具 */}
          <div class="rounded-lg bg-white p-6 shadow-sm">
            <StreamingPenDebugExample />
          </div>

          {/* 标准示例 */}
          <div class="rounded-lg bg-white p-6 shadow-sm">
            <StreamingPenExample />
          </div>
        </section>
      </div>
    );
  }
});
