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
  ClockLoadingExample,
  BasicComponentsExample,
  FlowExamples
} from './examples';

export default defineComponent({
  name: 'ComponentExample',
  setup() {

    return () => (
      <div class="p-4 space-y-6">
        {/* ==================== 加载组件 (Loading Components) ==================== */}
        <section class="space-y-4">
          <div class="flex items-center gap-3 mb-4">
            <div class="h-1 w-12 bg-blue-500 rounded"></div>
            <h1 class="text-3xl font-bold text-gray-900">加载组件</h1>
            <div class="h-1 flex-1 bg-gray-200 rounded"></div>
          </div>
          <ClockLoadingExample />
        </section>

        {/* ==================== 基础组件 (Basic Components) ==================== */}
        <section class="space-y-4">
          <div class="flex items-center gap-3 mb-4">
            <div class="h-1 w-12 bg-green-500 rounded"></div>
            <h1 class="text-3xl font-bold text-gray-900">基础组件</h1>
            <div class="h-1 flex-1 bg-gray-200 rounded"></div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-sm">
            <BasicComponentsExample />
          </div>
        </section>

        {/* ==================== 流程图组件 (Flow Components) ==================== */}
        <section class="space-y-4">
          <div class="flex items-center gap-3 mb-4">
            <div class="h-1 w-12 bg-purple-500 rounded"></div>
            <h1 class="text-3xl font-bold text-gray-900">流程图组件</h1>
            <div class="h-1 flex-1 bg-gray-200 rounded"></div>
          </div>
          <FlowExamples />
        </section>
      </div>
    );
  }
});

