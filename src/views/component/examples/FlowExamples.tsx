/** Flow 流程图组件示例集合 统一管理所有 Flow 相关的示例展示 */
import { defineComponent } from 'vue';
import { FlowPerformanceExample } from './index';

export const FlowExamples = defineComponent({
  name: 'FlowExamples',
  setup() {
    return () => (
      <div class="space-y-6">
        {/* 基础示例 */}
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl text-gray-800 font-semibold">基础示例</h2>
          {/* <FlowBasicExample /> */}
        </div>

        {/* 配置示例 */}
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl text-gray-800 font-semibold">配置示例</h2>
          {/* <FlowConfigExample /> */}
        </div>

        {/* 状态管理 */}
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl text-gray-800 font-semibold">状态管理</h2>
          {/* <FlowStateExample /> */}
        </div>

        {/* 完整功能 */}
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl text-gray-800 font-semibold">完整功能</h2>
          {/* <FlowFullFeatureExample /> */}
        </div>

        {/* 性能优化 */}
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl text-gray-800 font-semibold">性能优化</h2>
          <FlowPerformanceExample />
        </div>

        {/* 空状态 */}
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl text-gray-800 font-semibold">空状态</h2>
          {/* <FlowEmptyExample /> */}
        </div>

        {/* 主题切换 */}
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl text-gray-800 font-semibold">主题切换</h2>
          {/* <FlowThemeExample /> */}
        </div>

        {/* 贝塞尔曲线 */}
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl text-gray-800 font-semibold">贝塞尔曲线</h2>
          {/* <FlowBezierExample /> */}
        </div>
      </div>
    );
  }
});
