/**
 * 画布空状态提示组件
 */

import { defineComponent } from 'vue';
import { NIcon } from 'naive-ui';
import { Icon } from '@iconify/vue';

export default defineComponent({
  name: 'CanvasEmptyState',
  setup() {
    return () => (
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="text-center">
          <div class="mb-6">
            <NIcon size={80} color="#d1d5db" class="dark:opacity-50">
              <Icon icon="mdi:robot-outline" />
            </NIcon>
          </div>
          <div class="text-xl font-medium text-gray-600 dark:text-gray-400 mb-4">
            从左侧拖拽节点到画布开始创建工作流
          </div>
          <div class="space-y-2 text-sm text-gray-500 dark:text-gray-500">
            <div class="flex items-center justify-center gap-2">
              <NIcon size={16}>
                <Icon icon="mdi:mouse" />
              </NIcon>
              <span>鼠标滚轮缩放画布</span>
            </div>
            <div class="flex items-center justify-center gap-2">
              <NIcon size={16}>
                <Icon icon="mdi:cursor-move" />
              </NIcon>
              <span>左键或右键拖拽平移画布</span>
            </div>
            <div class="flex items-center justify-center gap-2">
              <NIcon size={16}>
                <Icon icon="mdi:drag" />
              </NIcon>
              <span>拖拽节点移动位置</span>
            </div>
            <div class="flex items-center justify-center gap-2">
              <NIcon size={16}>
                <Icon icon="mdi:connection" />
              </NIcon>
              <span>拖拽端口创建连接</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

