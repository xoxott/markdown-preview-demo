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
import { NDivider } from 'naive-ui';

// 导入示例组件
import {
  BasicComponentsExample,
  FlowBasicExample,
  FlowConfigExample,
  FlowStateExample,
  FlowFullFeatureExample,
  FlowPerformanceExample,
  FlowEmptyExample,
  FlowThemeExample,
  FlowBezierExample
} from './examples';

export default defineComponent({
  name: 'ComponentExample',
  setup() {

    return () => (
      <div class="p-4 space-y-4">
        {/* 基础组件示例 */}
        <BasicComponentsExample />

        <NDivider />

        {/* Flow 示例 */}
        <FlowBasicExample />
        <FlowConfigExample />
        <FlowStateExample />
        <FlowFullFeatureExample />
        <FlowPerformanceExample />
        <FlowEmptyExample />
        <FlowThemeExample />
        <FlowBezierExample />
      </div>
    );
  }
});

