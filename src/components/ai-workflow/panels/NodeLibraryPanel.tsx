import { defineComponent, ref } from 'vue';
import { NCard, NCollapse, NCollapseItem, NIcon, NEmpty, NScrollbar } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { getNodesByCategory } from '../nodes/NodeRegistry';

export default defineComponent({
  name: 'NodeLibraryPanel',
  setup() {
    const categories = getNodesByCategory();
    const expandedKeys = ref(['control', 'ai', 'data', 'integration']);

    const categoryLabels = {
      control: '控制流',
      ai: 'AI',
      data: '数据处理',
      integration: '集成'
    };

    const handleDragStart = (type: Api.Workflow.NodeType, e: DragEvent) => {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/workflow-node', type);

        // 创建自定义拖拽预览
        const target = e.currentTarget as HTMLElement;
        const clone = target.cloneNode(true) as HTMLElement;

        // 设置克隆元素的样式
        clone.style.position = 'absolute';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.width = `${target.offsetWidth}px`;
        clone.style.opacity = '0.9';
        clone.style.transform = 'rotate(2deg)';
        clone.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
        clone.style.pointerEvents = 'none';

        document.body.appendChild(clone);

        // 设置拖拽图像
        e.dataTransfer.setDragImage(clone, target.offsetWidth / 2, target.offsetHeight / 2);

        // 延迟移除克隆元素
        setTimeout(() => {
          document.body.removeChild(clone);
        }, 0);
      }
    };

    return () => (
      <div class="node-library-panel h-full flex flex-col w-64" >
        {/* 标题栏 - 与工具栏高度一致 */}
        <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <NIcon size={18}>
              <Icon icon="mdi:view-grid-plus-outline" />
            </NIcon>
            节点库
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">拖拽节点到画布</p>
        </div>

        {/* 使用 NScrollbar 替代原生滚动条 */}
        <NScrollbar class="flex-1" style={{ maxHeight: 'calc(100vh - 60px)' }}>
          <div class="p-3">
          <NCollapse v-model:expanded-names={expandedKeys.value} accordion={false}>
            {Object.entries(categories).map(([category, nodes]) => (
              <NCollapseItem
                key={category}
                name={category}
                title={categoryLabels[category as keyof typeof categoryLabels]}
              >
                {nodes.length > 0 ? (
                  <div class="space-y-2.5">
                    {nodes.map(({ type, config }) => (
                      <div
                        key={type}
                        class="node-library-item group p-3 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg cursor-move hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                        draggable
                        onDragstart={(e: DragEvent) => handleDragStart(type, e)}
                        style={{
                          borderLeftColor: config.color,
                          borderLeftWidth: '4px'
                        }}
                      >
                        <div class="flex items-center gap-3">
                          <div
                            class="flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform"
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: `${config.color}15`,
                              color: config.color,
                              border: `1.5px solid ${config.color}30`
                            }}
                          >
                            <NIcon size={20}>
                              <Icon icon={config.icon} />
                            </NIcon>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-0.5">
                              {config.label}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {config.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <NEmpty description="暂无节点" size="small" />
                )}
              </NCollapseItem>
            ))}
          </NCollapse>
          </div>
        </NScrollbar>
      </div>
    );
  }
});

