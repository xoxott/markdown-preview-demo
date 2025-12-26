import { defineComponent, ref } from 'vue';
import { NCard, NCollapse, NCollapseItem, NIcon, NEmpty } from 'naive-ui';
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
      }
    };

    return () => (
      <div class="node-library-panel h-full flex flex-col">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <NIcon size={20}>
              <Icon icon="mdi:view-grid-plus-outline" />
            </NIcon>
            节点库
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">拖拽节点到画布</p>
        </div>

        <div class="flex-1 overflow-y-auto p-3">
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
      </div>
    );
  }
});

