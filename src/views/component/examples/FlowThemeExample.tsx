/**
 * Flow 主题模式示例
 *
 * 展示如何使用 Flow 的主题系统，包括 light、dark、auto 三种主题模式
 */

import { defineComponent, ref, computed, h } from 'vue';
import { NCard, NH3, NText, NSpace, NButton, NRadioGroup, NRadio } from 'naive-ui';
import { useMessage } from 'naive-ui';
// 导入 Flow 主题样式
import '@/components/flow/styles/index.scss';
import FlowCanvas from '@/components/flow/components/FlowCanvas';
import FlowBackground from '@/components/flow/components/FlowBackground';
import { useFlowTheme } from '@/components/flow/hooks/useFlowTheme';
import type { FlowNode, FlowEdge, FlowViewport } from '@/components/flow/types';

export default defineComponent({
  name: 'FlowThemeExample',
  setup() {
    const message = useMessage();

    // 使用主题 Hook
    const { theme, setTheme, toggleTheme, isDark } = useFlowTheme({
      initialTheme: 'light',
      persist: true,
      storageKey: 'flow-theme-example'
    });

    // 示例节点和连接线
    const themeNodes = ref<FlowNode[]>([
      {
        id: 'theme-node-1',
        type: 'default',
        position: { x: 100, y: 100 },
        data: { label: '节点 1', description: '浅色主题示例' },
        size: { width: 180, height: 80 },
        handles: [
          { id: 'source-1', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'theme-node-2',
        type: 'default',
        position: { x: 350, y: 100 },
        data: { label: '节点 2', description: '深色主题示例' },
        size: { width: 180, height: 80 },
        handles: [
          { id: 'target-2', type: 'target', position: 'left' },
          { id: 'source-2', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'theme-node-3',
        type: 'default',
        position: { x: 100, y: 250 },
        data: { label: '节点 3', description: '自动主题示例' },
        size: { width: 180, height: 80 },
        handles: [
          { id: 'source-3', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'theme-node-4',
        type: 'default',
        position: { x: 350, y: 250 },
        data: { label: '节点 4', description: '自定义主题示例' },
        size: { width: 180, height: 80 },
        handles: [
          { id: 'target-4', type: 'target', position: 'left' }
        ]
      }
    ]);

    const themeEdges = ref<FlowEdge[]>([
      {
        id: 'theme-edge-1',
        source: 'theme-node-1',
        target: 'theme-node-2',
        sourceHandle: 'source-1',
        targetHandle: 'target-2',
        type: 'bezier'
      },
      {
        id: 'theme-edge-2',
        source: 'theme-node-3',
        target: 'theme-node-4',
        sourceHandle: 'source-3',
        targetHandle: 'target-4',
        type: 'bezier'
      }
    ]);

    // FlowCanvas 内部会管理自己的 viewport，需要通过事件同步
    const themeViewport = ref<FlowViewport>({
      x: 0,
      y: 0,
      zoom: 1
    });

    // 处理视口变化（同步 FlowCanvas 内部的 viewport）
    const handleViewportChange = (newViewport: FlowViewport) => {
      console.log('handleViewportChange', newViewport);
      themeViewport.value = newViewport;
    };

    // 处理主题切换
    const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
      setTheme(newTheme);
      message.success(`已切换到 ${newTheme === 'light' ? '浅色' : newTheme === 'dark' ? '深色' : '自动'} 主题`);
    };

    // 当前主题显示文本
    const themeText = computed(() => {
      if (theme.value === 'auto') {
        return `自动（当前：${isDark.value ? '深色' : '浅色'}）`;
      }
      return theme.value === 'light' ? '浅色' : '深色';
    });

    return () => (
      <NCard bordered>
        <NH3 class="border-b pb-2 text-lg font-semibold">Flow 示例 7: 主题模式</NH3>
        <NText class="text-gray-500 mb-4 block">
          展示 Flow 组件的主题系统，支持 light（浅色）、dark（深色）、auto（自动跟随系统）三种主题模式。
          主题设置会持久化到 localStorage，刷新页面后仍然保持。
        </NText>

        {/* 主题控制面板 */}
        <NSpace vertical class="mb-4">
          <div>
            <NText strong class="mr-2">当前主题：</NText>
            <NText class="text-blue-500">{themeText.value}</NText>
          </div>

          <NSpace>
            <NText strong>切换主题：</NText>
            <NRadioGroup
              value={theme.value}
              onUpdateValue={(value) => handleThemeChange(value as 'light' | 'dark' | 'auto')}
            >
              <NSpace>
                <NRadio value="light">浅色</NRadio>
                <NRadio value="dark">深色</NRadio>
                <NRadio value="auto">自动</NRadio>
              </NSpace>
            </NRadioGroup>
          </NSpace>

          <NSpace>
            <NButton onClick={toggleTheme}>快速切换（Light ↔ Dark）</NButton>
            <NText class="text-gray-400 text-sm">
              提示：在 auto 模式下，快速切换会切换到系统主题的相反主题
            </NText>
          </NSpace>
        </NSpace>

        {/* Flow 画布 */}
        <div
          style={{
            height: '500px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            position: 'relative',
            backgroundColor: 'var(--flow-background-color, #ffffff)'
          }}
        >
          <FlowCanvas
            id="theme-flow-example"
            initialNodes={themeNodes.value}
            initialEdges={themeEdges.value}
            width="100%"
            height="100%"
            onViewport-change={handleViewportChange}
          >
            {{
              background: () => (
                   <FlowBackground
                  gridType="dots"
                  gridSize={20}
                  viewport={themeViewport.value}
                  key={`background-${themeViewport.value.x}-${themeViewport.value.y}-${themeViewport.value.zoom}`}
                />
              )
            }}
          </FlowCanvas>
        </div>

        {/* 使用说明 */}
        <NSpace vertical class="mt-4">
          <NH3 class="text-base font-semibold">使用说明：</NH3>
          <ul class="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>
              <strong>浅色主题（Light）</strong>：适合在明亮环境下使用，使用浅色背景和深色文字
            </li>
            <li>
              <strong>深色主题（Dark）</strong>：适合在暗光环境下使用，使用深色背景和浅色文字
            </li>
            <li>
              <strong>自动主题（Auto）</strong>：自动跟随系统主题设置（通过 <code>prefers-color-scheme</code> 媒体查询）
            </li>
            <li>
              <strong>自定义主题</strong>：可以通过覆盖 CSS 变量来自定义主题颜色，详见 <code>styles/README.md</code>
            </li>
            <li>
              <strong>持久化</strong>：主题设置会自动保存到 localStorage，刷新页面后仍然保持
            </li>
          </ul>
        </NSpace>

        {/* 代码示例 */}
        <NSpace vertical class="mt-4">
        {themeViewport.value}
          <NH3 class="text-base font-semibold">代码示例：</NH3>
          <pre class="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            <code>{`import { useFlowTheme } from '@/components/flow/hooks/useFlowTheme';

                    const { theme, setTheme, toggleTheme, isDark } = useFlowTheme({
                      initialTheme: 'auto',
                      persist: true, // 持久化到 localStorage
                      storageKey: 'flow-theme-example'
                    });

                    // 切换主题
                    setTheme('dark');

                    // 快速切换
                    toggleTheme();

                    // 检查是否为深色模式
                    console.log(isDark.value); // true or false`}
            </code>
          </pre>
        </NSpace>
      </NCard>
    );
  }
});

