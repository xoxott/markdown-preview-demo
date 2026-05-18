/** DeclarativeForm 动态表单示例：行内检索、栅格弹窗、内置控件类型 */

import { computed, defineComponent, reactive, ref } from 'vue';
import { NAlert, NButton, NCard, NCode, NSpace, NTabPane, NTabs, useMessage } from 'naive-ui';
import dayjs from 'dayjs';
import {
  DEFAULT_GRID_COLS,
  type DeclarativeFieldConfig,
  DeclarativeForm
} from '@/components/declarative-form';

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已下线', value: 'archived' }
];

const categoryOptions = [
  { label: '公告', value: 'notice' },
  { label: '活动', value: 'event' },
  { label: '系统', value: 'system' }
];

const inlineFields: DeclarativeFieldConfig[] = [
  {
    type: 'input',
    field: 'keyword',
    placeholder: '关键词',
    icon: 'i-carbon-search',
    width: '200px'
  },
  {
    type: 'select',
    field: 'category',
    placeholder: '分类',
    width: '160px',
    options: categoryOptions
  }
];

const dialogFields: DeclarativeFieldConfig[] = [
  { type: 'input', field: 'name', label: '名称', placeholder: '请输入名称' },
  {
    type: 'input-number',
    field: 'amount',
    label: '数量',
    componentProps: { min: 0, precision: 0 }
  },
  {
    type: 'select',
    field: 'category',
    label: '分类',
    placeholder: '请选择',
    options: categoryOptions
  },
  {
    type: 'radio-group',
    field: 'status',
    label: '状态',
    options: statusOptions
  },
  { type: 'switch', field: 'enabled', label: '启用' },
  {
    type: 'date-range',
    field: 'period',
    label: '有效期',
    placeholder: '选择日期范围'
  },
  {
    type: 'textarea',
    field: 'remark',
    label: '备注',
    placeholder: '备注说明',
    span: 2,
    componentProps: { rows: 3 }
  }
];

function createInlineModel() {
  return { keyword: '', category: null as string | null };
}

function createDialogModel() {
  return {
    name: '',
    amount: 1,
    category: null as string | null,
    status: 'draft',
    enabled: true,
    period: null as [number, number] | null,
    remark: ''
  };
}

function createReadonlyDetailModel() {
  const start = dayjs().subtract(7, 'day').startOf('day').valueOf();
  const end = dayjs().add(7, 'day').startOf('day').valueOf();
  return {
    name: '季度活动公告',
    amount: 128,
    category: 'event' as string | null,
    status: 'published',
    enabled: true,
    period: [start, end] as [number, number],
    remark: ''
  };
}

export default defineComponent({
  name: 'DeclarativeFormExample',
  setup() {
    const message = useMessage();
    const activeTab = ref('inline');
    const inlineModel = reactive(createInlineModel());
    const dialogModel = reactive(createDialogModel());
    const readonlyDetailModel = reactive(createReadonlyDetailModel());

    const patchField = (target: Record<string, unknown>, key: string, value: unknown) => {
      // 受控 model 由 reactive 包裹，需就地写入
      // eslint-disable-next-line no-param-reassign -- reactive 对象字段更新
      target[key] = value;
    };

    const currentModelJson = computed(() => {
      let data: Record<string, unknown>;
      if (activeTab.value === 'inline') data = inlineModel;
      else if (activeTab.value === 'readonly') data = readonlyDetailModel;
      else data = dialogModel;
      return JSON.stringify(data, null, 2);
    });

    const handleInlineSearch = () => {
      message.success('行内检索 · Enter / 查询');
    };

    return () => (
      <div class="space-y-16px">
        <NAlert type="info" showIcon={false}>
          通过 `fields` 配置驱动 Naive 表单控件；`layout="grid"` + `showLabel`
          适合弹窗编辑，`layout="inline"` 适合检索栏。`readonly` 时仅展示标签与文本值，空字段为
          `-`；可用 `renderReadonly` 单字段覆盖。
        </NAlert>

        <div class="flex flex-col gap-16px lg:flex-row">
          <NTabs v-model:value={activeTab.value} type="line" class="min-w-0 flex-1">
            <NTabPane name="inline" tab="行内检索">
              <NCard title="layout=inline" size="small" bordered={false} class="!bg-transparent">
                <DeclarativeForm
                  fields={inlineFields}
                  model={inlineModel}
                  onUpdateModel={(field, value) => patchField(inlineModel, field, value)}
                  inline
                  wrap
                  onInputEnterPress={handleInlineSearch}
                  v-slots={{
                    suffix: () => (
                      <NSpace>
                        <NButton onClick={() => Object.assign(inlineModel, createInlineModel())}>
                          重置
                        </NButton>
                        <NButton type="primary" onClick={handleInlineSearch}>
                          查询
                        </NButton>
                      </NSpace>
                    )
                  }}
                />
              </NCard>
            </NTabPane>

            <NTabPane name="dialog" tab="栅格弹窗">
              <NCard
                title="layout=grid（弹窗表单）"
                size="small"
                bordered={false}
                class="!bg-transparent"
              >
                <DeclarativeForm
                  fields={dialogFields}
                  model={dialogModel}
                  onUpdateModel={(field, value) => patchField(dialogModel, field, value)}
                  layout="grid"
                  gridCols={DEFAULT_GRID_COLS}
                  suffixPlacement="below-grid"
                  labelPlacement="left"
                  labelWidth={80}
                  showLabel
                  v-slots={{
                    suffix: () => (
                      <NSpace justify="end">
                        <NButton onClick={() => Object.assign(dialogModel, createDialogModel())}>
                          重置
                        </NButton>
                        <NButton type="primary" onClick={() => message.success('已提交（示例）')}>
                          提交
                        </NButton>
                      </NSpace>
                    )
                  }}
                />
              </NCard>
            </NTabPane>

            <NTabPane name="readonly" tab="只读详情">
              <NCard
                title="readonly + showLabel"
                size="small"
                bordered={false}
                class="!bg-transparent"
              >
                <DeclarativeForm
                  readonly
                  fields={dialogFields}
                  model={readonlyDetailModel}
                  onUpdateModel={() => {}}
                  layout="grid"
                  gridCols={DEFAULT_GRID_COLS}
                  labelPlacement="left"
                  labelWidth={80}
                  showLabel
                />
              </NCard>
            </NTabPane>
          </NTabs>

          <NCard title="model 快照" size="small" class="w-full shrink-0 lg:w-320px">
            <NCode code={currentModelJson.value} language="json" wordWrap />
          </NCard>
        </div>
      </div>
    );
  }
});
