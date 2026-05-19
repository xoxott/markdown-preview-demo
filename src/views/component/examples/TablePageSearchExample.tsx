/** TablePage / SearchBar 检索区示例：多字段换行、展开收起、按钮可用性 */

import { computed, defineComponent, reactive, ref } from 'vue';
import { NCard, NCode, NTabPane, NTabs, useMessage } from 'naive-ui';
import SearchBar from '@/components/table-page/SearchBar';
import TablePage from '@/components/table-page/TablePage';
import type { TableColumnConfig } from '@/components/table-page/types';
import {
  createInitialSearchModel,
  fewSearchFields,
  manySearchFields
} from './tablePageSearchFieldPresets';

type DemoRow = { id: number; name: string };

const demoColumns: TableColumnConfig<DemoRow>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '名称', width: 160 }
];

const demoData: DemoRow[] = [
  { id: 1, name: '示例 A' },
  { id: 2, name: '示例 B' }
];

export default defineComponent({
  name: 'TablePageSearchExample',
  setup() {
    const message = useMessage();
    const activeTab = ref('few');
    const eventLog = ref<string[]>([]);

    const fewModel = reactive(createInitialSearchModel(fewSearchFields));
    const manyModel = reactive(createInitialSearchModel(manySearchFields));
    const standaloneModel = reactive(createInitialSearchModel(manySearchFields));

    const patchField = (model: Record<string, unknown>, field: string, value: unknown) => {
      model[field] = value;
    };

    const logEvent = (label: string, model: Record<string, unknown>) => {
      const line = `[${new Date().toLocaleTimeString()}] ${label}: ${JSON.stringify({ ...model })}`;
      eventLog.value = [line, ...eventLog.value].slice(0, 8);
    };

    const fewHandlers = {
      onSearch: () => {
        logEvent('少量字段 · 搜索', fewModel);
        message.success('触发搜索');
      },
      onReset: () => {
        Object.assign(fewModel, createInitialSearchModel(fewSearchFields));
        logEvent('少量字段 · 重置', fewModel);
        message.info('已重置');
      },
      onUpdate: (field: string, value: unknown) => patchField(fewModel, field, value)
    };

    const manyHandlers = {
      onSearch: () => {
        logEvent('多字段可折叠 · 搜索', manyModel);
        message.success('触发搜索');
      },
      onReset: () => {
        Object.assign(manyModel, createInitialSearchModel(manySearchFields));
        logEvent('多字段可折叠 · 重置', manyModel);
        message.info('已重置');
      },
      onUpdate: (field: string, value: unknown) => patchField(manyModel, field, value)
    };

    const standaloneHandlers = {
      onSearch: () => {
        logEvent('独立 SearchBar · 搜索', standaloneModel);
        message.success('触发搜索');
      },
      onReset: () => {
        Object.assign(standaloneModel, createInitialSearchModel(manySearchFields));
        logEvent('独立 SearchBar · 重置', standaloneModel);
        message.info('已重置');
      },
      onUpdate: (field: string, value: unknown) => patchField(standaloneModel, field, value)
    };

    const currentModelJson = computed(() => {
      if (activeTab.value === 'few' || activeTab.value === 'label-top') {
        return JSON.stringify(fewModel, null, 2);
      }
      if (
        activeTab.value === 'many' ||
        activeTab.value === 'table-page' ||
        activeTab.value === 'section-collapse'
      ) {
        return JSON.stringify(manyModel, null, 2);
      }
      return JSON.stringify(standaloneModel, null, 2);
    });

    return () => (
      <div class="space-y-16px">
        <div class="flex flex-col gap-16px">
          <NTabs v-model:value={activeTab.value} type="line" class="min-w-0 w-full">
            <NTabPane name="few" tab="少量字段（不折叠）">
              <SearchBar
                config={fewSearchFields}
                model={fewModel}
                onSearch={fewHandlers.onSearch}
                onReset={fewHandlers.onReset}
                onUpdateModel={fewHandlers.onUpdate}
              />
            </NTabPane>

            <NTabPane name="many" tab="多字段 + 可折叠">
              <SearchBar
                config={manySearchFields}
                model={manyModel}
                collapsible
                defaultCollapsed
                onSearch={manyHandlers.onSearch}
                onReset={manyHandlers.onReset}
                onUpdateModel={manyHandlers.onUpdate}
              />
            </NTabPane>

            <NTabPane name="table-page" tab="TablePage 集成">
              <div class="h-360px overflow-hidden border border-gray-200 rounded-8px">
                <TablePage
                  searchConfig={manySearchFields}
                  searchModel={manyModel}
                  onUpdateSearchField={manyHandlers.onUpdate}
                  onSearch={manyHandlers.onSearch}
                  onReset={manyHandlers.onReset}
                  columns={demoColumns}
                  data={demoData}
                  loading={false}
                  showSelection={false}
                  showIndex={false}
                  searchDefaultCollapsed
                  searchCardBordered={false}
                  showActionCard={false}
                  padded={false}
                  class="h-full"
                />
              </div>
            </NTabPane>

            <NTabPane name="section-collapse" tab="整区折叠">
              <div class="h-360px overflow-hidden border border-gray-200 rounded-8px">
                <TablePage
                  searchConfig={manySearchFields}
                  searchModel={manyModel}
                  onUpdateSearchField={manyHandlers.onUpdate}
                  onSearch={manyHandlers.onSearch}
                  onReset={manyHandlers.onReset}
                  columns={demoColumns}
                  data={demoData}
                  loading={false}
                  showSelection={false}
                  showIndex={false}
                  searchSectionCollapsible
                  searchSectionDefaultExpanded={false}
                  searchCardBordered={false}
                  showActionCard={false}
                  padded={false}
                  class="h-full"
                />
              </div>
            </NTabPane>

            <NTabPane name="standalone" tab="独立 SearchBar">
              <SearchBar
                config={manySearchFields}
                model={standaloneModel}
                collapsible
                defaultCollapsed
                onSearch={standaloneHandlers.onSearch}
                onReset={standaloneHandlers.onReset}
                onUpdateModel={standaloneHandlers.onUpdate}
              />
            </NTabPane>

            <NTabPane name="label-top" tab="标签在上">
              <SearchBar
                config={fewSearchFields}
                model={fewModel}
                labelPlacement="top"
                onSearch={fewHandlers.onSearch}
                onReset={fewHandlers.onReset}
                onUpdateModel={fewHandlers.onUpdate}
              />
            </NTabPane>
          </NTabs>

          <NCard
            title="当前 model / 事件"
            class="w-full flex-shrink-0"
            contentClass="flex flex-col gap-12px"
          >
            <div class="text-12px text-gray-500">表单快照</div>
            <NCode
              code={currentModelJson.value}
              language="json"
              wordWrap
              class="max-h-180px overflow-auto text-12px"
            />
            <div class="text-12px text-gray-500">最近操作</div>
            <div class="max-h-160px overflow-auto text-12px leading-relaxed space-y-6px">
              {eventLog.value.length === 0 ? (
                <span class="text-gray-400">点击搜索或重置后显示</span>
              ) : (
                eventLog.value.map((line, i) => (
                  <div key={i} class="break-all border-b border-gray-100 pb-6px">
                    {line}
                  </div>
                ))
              )}
            </div>
          </NCard>
        </div>
      </div>
    );
  }
});
