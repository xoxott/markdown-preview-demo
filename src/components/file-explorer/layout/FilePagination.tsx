import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { NPagination, NSelect, useThemeVars } from 'naive-ui';

export default defineComponent({
  name: 'FilePagination',
  props: {
    /** 当前页码 */
    currentPage: {
      type: Number,
      required: true
    },
    /** 每页数量 */
    pageSize: {
      type: Number,
      required: true
    },
    /** 总数 */
    total: {
      type: Number,
      required: true
    },
    /** 总页数 */
    totalPages: {
      type: Number,
      required: true
    },
    /** 是否显示分页器 */
    show: {
      type: Boolean,
      default: true
    },
    /** 页码变化回调 */
    onPageChange: {
      type: Function as PropType<(page: number) => void>,
      required: true
    },
    /** 每页数量变化回调 */
    onPageSizeChange: {
      type: Function as PropType<(size: number) => void>,
      required: false
    },
    /** 是否显示每页数量选择器 */
    showPageSizeSelector: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const themeVars = useThemeVars();

    // 每页数量选项
    const pageSizeOptions = [
      { label: '10', value: 10 },
      { label: '20', value: 20 },
      { label: '30', value: 30 },
      { label: '50', value: 50 },
      { label: '100', value: 100 }
    ];

    // 处理页码变化
    const handlePageChange = (page: number) => {
      props.onPageChange(page);
    };

    // 处理每页数量变化
    const handlePageSizeChange = (size: number) => {
      if (props.onPageSizeChange) {
        props.onPageSizeChange(size);
      }
    };

    if (!props.show) {
      return () => null;
    }

    return () => (
      <div
        class="flex items-center justify-between border-t px-4 py-2"
        style={{
          backgroundColor: themeVars.value.bodyColor,
          borderColor: themeVars.value.dividerColor
        }}
      >
        {/* 左侧：每页数量选择器 */}
        {props.showPageSizeSelector && props.onPageSizeChange && (
          <div class="flex items-center gap-2">
            <span class="text-xs" style={{ color: themeVars.value.textColor3 }}>
              每页显示
            </span>
            <NSelect
              value={props.pageSize}
              options={pageSizeOptions}
              size="small"
              style={{ width: '80px' }}
              onUpdateValue={handlePageSizeChange}
            />
            <span class="text-xs" style={{ color: themeVars.value.textColor3 }}>
              项
            </span>
          </div>
        )}

        {/* 中间：分页器 */}
        <div class="flex-1 flex items-center justify-center gap-3">
          {/* 当前页范围显示 */}
          <span class="text-xs whitespace-nowrap" style={{ color: themeVars.value.textColor3 }}>
            {(() => {
              const start = props.total === 0 ? 0 : (props.currentPage - 1) * props.pageSize + 1;
              const end = Math.min(props.currentPage * props.pageSize, props.total);
              return `${start}-${end}`;
            })()}
          </span>
          <NPagination
            page={props.currentPage}
            pageCount={props.totalPages}
            pageSize={props.pageSize}
            showSizePicker={false}
            showQuickJumper
            onUpdatePage={handlePageChange}
          />
        </div>

        {/* 右侧：占位，保持布局平衡 */}
        {props.showPageSizeSelector && <div style={{ width: '120px' }} />}
      </div>
    );
  }
});

