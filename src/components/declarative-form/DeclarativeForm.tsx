import { type PropType, computed, defineComponent } from 'vue';
import { NForm, NFormItem, NGi, NGrid } from 'naive-ui';
import type {
  DeclarativeFieldConfig,
  DeclarativeFormLayout,
  DeclarativeFormSuffixPlacement
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
 * - `grid-cell` + `layout="grid"`：占栅格 1 列，与最后一行字段并列。
 * - `below-grid` + `layout="grid"`：栅格下方独占一行（`SearchBar` 默认用法）。
 *
 * 展开 / 收起逻辑不在本组件内，由调用方裁剪 `fields`（如 `useGridFormCollapse`）。
 *
 * ## 只读模式
 *
 * `readonly={true}` 时渲染标签 + 文本值，不挂载输入控件；无内容时展示 `-`。 字段级可通过 `renderReadonly` 覆盖展示。
 *
 * @see DeclarativeFormProps
 * @see SearchBar
 */
export default defineComponent({
  name: 'DeclarativeForm',
  props: {
    /** 字段配置列表，按数组顺序渲染 */
    fields: {
      type: Array as PropType<DeclarativeFieldConfig[]>,
      required: true
    },
    /** 表单数据对象（受控） */
    model: {
      type: Object as PropType<Record<string, unknown>>,
      required: true
    },
    /** 单字段更新回调，调用方负责合并进 `model` */
    onUpdateModel: {
      type: Function as PropType<(field: string, value: unknown) => void>,
      required: true
    },
    /** 标签相对控件的位置，透传 `NForm.labelPlacement` */
    labelPlacement: {
      type: String as PropType<'left' | 'top'>,
      default: 'left'
    },
    /** 标签宽度，透传 `NForm.labelWidth` */
    labelWidth: {
      type: [Number, String] as PropType<number | string>,
      default: undefined
    },
    /** 是否全局展示字段标签；单字段可通过 `field.showLabel` 覆盖 */
    showLabel: {
      type: Boolean,
      default: false
    },
    /** 布局模式：`inline` 行内 | `grid` 栅格 */
    layout: {
      type: String as PropType<DeclarativeFormLayout>,
      default: 'inline'
    },
    /** 是否行内排列；仅 `layout="inline"` 时透传 `NForm.inline`，栅格模式强制为 false */
    inline: {
      type: Boolean,
      default: true
    },
    /** 行内是否允许换行，对应样式 `declarative-form--inline-wrap` */
    wrap: {
      type: Boolean,
      default: true
    },
    /** `#suffix` 插槽放置方式。 需与 `layout` 匹配，错误组合时插槽可能不渲染。 */
    suffixPlacement: {
      type: String as PropType<DeclarativeFormSuffixPlacement>,
      default: 'inline'
    },
    /** 栅格列数，透传 `NGrid.cols`，默认响应式 `1 s:2 m:3 l:4` */
    gridCols: {
      type: [Number, String] as PropType<number | string>,
      default: DEFAULT_GRID_COLS
    },
    /** 栅格水平间距（px） */
    gridXGap: {
      type: Number,
      default: 24
    },
    /** 栅格垂直间距（px） */
    gridYGap: {
      type: Number,
      default: 0
    },
    /** 栅格响应式断点：`screen` 视口 | `self` 容器宽度 */
    gridResponsive: {
      type: String as PropType<'self' | 'screen'>,
      default: 'screen'
    },
    /** `type="input"` 时按 Enter 的回调（如触发搜索） */
    onInputEnterPress: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    /** 为 true 时只读展示标签与格式化值，空值显示 `-` */
    readonly: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { slots }) {
    /** 是否为栅格布局 */
    const isGrid = computed(() => props.layout === 'grid');

    /** 检索栏模式：栅格 + 操作区在栅格下方独占一行。 会附加 `declarative-form--search` 以应用右对齐等样式。 */
    const suffixBelowGrid = computed(() => isGrid.value && props.suffixPlacement === 'below-grid');

    /**
     * 根 `NForm` 的 class：
     *
     * - inline + wrap → `declarative-form--inline-wrap`
     * - grid → `declarative-form--grid`，检索模式再加 `declarative-form--search`
     */
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
      if (suffixBelowGrid.value) parts.push('declarative-form--search');
      return parts;
    });

    /** 透传给 `NGrid` 的 props，与 props 解耦便于模板展开 */
    const gridProps = computed(() => ({
      cols: props.gridCols,
      xGap: props.gridXGap,
      yGap: props.gridYGap,
      responsive: props.gridResponsive
    }));

    /** 控件渲染上下文，传入 `renderDeclarativeControl`。 `isGrid` 影响控件宽度策略（栅格下 strip 固定 width）。 */
    const controlCtx = computed(() => ({
      model: props.model,
      onUpdateModel: props.onUpdateModel,
      isGrid: isGrid.value,
      onInputEnterPress: props.onInputEnterPress
    }));

    /**
     * 渲染单个字段：解析标签 → 渲染控件 → 包一层表单项。 inline：`NFormItem`；grid：`NGi` + `NFormItem`（`span` 由字段类型 /
     * 配置决定）。
     */
    const renderField = (field: DeclarativeFieldConfig, index: number) => {
      const label = resolveFieldLabel(field, props.showLabel);
      const control = props.readonly
        ? renderReadonlyFieldValue(field, props.model)
        : renderDeclarativeControl(field, controlCtx.value);

      if (!isGrid.value) {
        return (
          <NFormItem key={field.field || index} path={field.field} label={label} class="!mb-0">
            {control}
          </NFormItem>
        );
      }

      return (
        <NGi key={field.field || index} span={resolveFieldSpan(field)}>
          <NFormItem path={field.field} label={label} class="declarative-form__grid-item !mb-0">
            {control}
          </NFormItem>
        </NGi>
      );
    };

    /** 栅格内联 suffix：`suffixPlacement="grid-cell"` 时占 1 列， 与同行字段并列（常用于字段较少、按钮跟在最后一块）。 */
    const renderSuffixInGrid = () =>
      slots.suffix ? (
        <NGi span={1} class="declarative-form__action-gi">
          <NFormItem showLabel={false} class="declarative-form__suffix !mb-0">
            {slots.suffix()}
          </NFormItem>
        </NGi>
      ) : null;

    /** 栅格下方 suffix：`suffixPlacement="below-grid"` 时整行展示操作区， 不占用 `NGrid` 列（检索栏查询 / 重置按钮典型布局）。 */
    const renderSuffixBelowGrid = () =>
      slots.suffix ? (
        <div class="declarative-form__action-row">
          <NFormItem showLabel={false} class="declarative-form__suffix !mb-0">
            {slots.suffix()}
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
              {props.suffixPlacement === 'grid-cell' ? renderSuffixInGrid() : null}
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
        {/* 栅格模式下 toolbarAfter 放在栅格与 suffix 之后，避免打断栅格流 */}
        {isGrid.value ? slots.toolbarAfter?.() : null}
      </NForm>
    );
  }
});
