import { type PropType, computed, defineComponent } from 'vue';
import { NForm, NFormItem, NGi, NGrid } from 'naive-ui';
import type {
  DeclarativeFieldConfig,
  DeclarativeFormLayout,
  DeclarativeFormSuffixPlacement,
  DeclarativeFormSuffixSlotProps
} from './types';
import { resolveFieldLabel } from './fieldLabel';
import './naiveFormControls';
import { renderDeclarativeControl } from './controlRegistry';
import { DEFAULT_GRID_COLS, resolveFieldSpan } from './grid';
import { renderReadonlyFieldValue } from './renderReadonlyFieldValue';
import './declarative-form.scss';

/**
 * 配置驱动的 Naive UI 表单容器。
 *
 * 通过 `fields` 描述字段，由 `renderDeclarativeControl` 渲染具体控件； 数据由外部 `model` + `onUpdateModel`
 * 受控，本组件不维护字段状态。
 *
 * ## 布局模式
 *
 * | layout   | 结构                                 | 典型场景               |
 * | -------- | ------------------------------------ | ---------------------- |
 * | `inline` | `NFormItem` 行内排列，可 `wrap` 换行 | 简单筛选、弹窗表单     |
 * | `grid`   | `NGrid` + `NGi`，字段按 `span` 占列  | 表格页检索栏、多列表单 |
 *
 * ## 插槽
 *
 * - `#suffix`：尾部操作区（查询 / 重置等），位置由 `suffixPlacement` 决定。
 * - `#toolbarBefore` / `#toolbarAfter`：表单首尾扩展区（如批量操作、说明文案）。
 *
 * ## suffixPlacement 与 layout 的组合
 *
 * - `inline` + `layout="inline"`：与字段同一行末尾内联。
 * - `grid-cell` + `layout="grid"`：`NGi suffix`，与最后一行字段并列（`SearchBar` 默认，对齐 Pro Naive）。
 * - `below-grid` + `layout="grid"`：栅格下方独占一行。
 *
 * 检索栏收起：传 `gridCollapsed` + `gridCollapsedRows` 给 `NGrid`，勿裁剪 `fields`。
 *
 * @see DeclarativeFormProps
 * @see SearchBar
 */
export default defineComponent({
  name: 'DeclarativeForm',
  props: {
    fields: {
      type: Array as PropType<DeclarativeFieldConfig[]>,
      required: true
    },
    model: {
      type: Object as PropType<Record<string, unknown>>,
      required: true
    },
    onUpdateModel: {
      type: Function as PropType<(field: string, value: unknown) => void>,
      required: true
    },
    labelPlacement: {
      type: String as PropType<'left' | 'top'>,
      default: 'left'
    },
    labelWidth: {
      type: [Number, String] as PropType<number | string>,
      default: undefined
    },
    showLabel: {
      type: Boolean,
      default: false
    },
    layout: {
      type: String as PropType<DeclarativeFormLayout>,
      default: 'inline'
    },
    inline: {
      type: Boolean,
      default: true
    },
    wrap: {
      type: Boolean,
      default: true
    },
    suffixPlacement: {
      type: String as PropType<DeclarativeFormSuffixPlacement>,
      default: 'inline'
    },
    gridCols: {
      type: [Number, String] as PropType<number | string>,
      default: DEFAULT_GRID_COLS
    },
    gridXGap: {
      type: Number,
      default: 24
    },
    gridYGap: {
      type: Number,
      default: 0
    },
    gridResponsive: {
      type: String as PropType<'self' | 'screen'>,
      default: 'screen'
    },
    gridCollapsed: {
      type: Boolean,
      default: undefined
    },
    gridCollapsedRows: {
      type: Number,
      default: 2
    },
    onInputEnterPress: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { slots }) {
    const isGrid = computed(() => props.layout === 'grid');
    const suffixInGrid = computed(() => isGrid.value && props.suffixPlacement === 'grid-cell');
    const suffixBelowGrid = computed(() => isGrid.value && props.suffixPlacement === 'below-grid');
    const suffixSearchMode = computed(() => suffixInGrid.value || suffixBelowGrid.value);

    const formClass = computed(() => {
      if (!isGrid.value) {
        const parts: string[] = [];
        if (props.readonly) parts.push('declarative-form--readonly');
        if (props.inline && props.wrap) parts.push('declarative-form--inline-wrap');
        return parts.length ? parts.join(' ') : undefined;
      }
      const parts: string[] = [];
      if (props.readonly) parts.push('declarative-form--readonly');
      parts.push('declarative-form--grid');
      if (suffixSearchMode.value) parts.push('declarative-form--search');
      return parts;
    });

    const gridProps = computed(() => {
      const base = {
        cols: props.gridCols,
        xGap: props.gridXGap,
        yGap: props.gridYGap,
        responsive: props.gridResponsive
      };
      if (props.gridCollapsed === undefined) return base;
      return {
        ...base,
        collapsed: props.gridCollapsed,
        collapsedRows: props.gridCollapsedRows
      };
    });

    const controlCtx = computed(() => ({
      model: props.model,
      onUpdateModel: props.onUpdateModel,
      isGrid: isGrid.value,
      onInputEnterPress: props.onInputEnterPress
    }));

    /** 栅格检索无校验文案，关闭反馈区避免控件下方留白；换行间距改由 `gridYGap`（SearchBar 默认 16）承担。 */
    const formItemProps = computed(() =>
      isGrid.value ? ({ showFeedback: false } as const) : ({} as const)
    );

    const renderSuffixContent = (slotProps?: DeclarativeFormSuffixSlotProps) => {
      if (!slots.suffix) return null;
      return (slots.suffix as (props?: DeclarativeFormSuffixSlotProps) => unknown)(slotProps);
    };

    const renderField = (field: DeclarativeFieldConfig, index: number) => {
      const label = resolveFieldLabel(field, props.showLabel);
      const control = props.readonly
        ? renderReadonlyFieldValue(field, props.model)
        : renderDeclarativeControl(field, controlCtx.value);

      if (!isGrid.value) {
        return (
          <NFormItem
            key={field.field || index}
            path={field.field}
            label={label}
            class="!mb-0"
            {...formItemProps.value}
          >
            {control}
          </NFormItem>
        );
      }

      return (
        <NGi key={field.field || index} span={resolveFieldSpan(field)}>
          <NFormItem
            path={field.field}
            label={label}
            class="declarative-form__grid-item !mb-0"
            {...formItemProps.value}
          >
            {control}
          </NFormItem>
        </NGi>
      );
    };

    /** `grid-cell`：对齐 Pro Naive `NGi suffix` */
    const renderSuffixInGrid = () =>
      slots.suffix ? (
        <NGi suffix class="declarative-form__action-gi">
          {{
            default: ({ overflow }: { overflow: boolean }) => (
              <NFormItem
                showLabel={false}
                class="declarative-form__suffix !mb-0"
                {...formItemProps.value}
              >
                {renderSuffixContent({ overflow })}
              </NFormItem>
            )
          }}
        </NGi>
      ) : null;

    const renderSuffixBelowGrid = () =>
      slots.suffix ? (
        <div class="declarative-form__action-row">
          <NFormItem
            showLabel={false}
            class="declarative-form__suffix !mb-0"
            {...formItemProps.value}
          >
            {renderSuffixContent()}
          </NFormItem>
        </div>
      ) : null;

    return () => (
      <NForm
        class={formClass.value}
        model={props.model}
        inline={!isGrid.value && props.inline}
        labelPlacement={props.labelPlacement}
        labelWidth={props.labelWidth}
        showLabel={props.showLabel}
      >
        {slots.toolbarBefore?.()}
        {isGrid.value ? (
          <>
            <NGrid {...gridProps.value}>
              {props.fields.map(renderField)}
              {suffixInGrid.value ? renderSuffixInGrid() : null}
            </NGrid>
            {suffixBelowGrid.value ? renderSuffixBelowGrid() : null}
          </>
        ) : (
          <>
            {props.fields.map(renderField)}
            {slots.toolbarAfter?.()}
            {props.suffixPlacement === 'inline' ? slots.suffix?.() : null}
          </>
        )}
        {isGrid.value ? slots.toolbarAfter?.() : null}
      </NForm>
    );
  }
});
