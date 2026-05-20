import { defineComponent } from 'vue';
import { NScrollbar } from 'naive-ui';
import { FILE_LIST_SCROLL_HOST_CLASS } from '../constants/fileListScrollHost';

/**
 * 文件列表区默认纵向滚动外壳：打标 `FILE_LIST_SCROLL_HOST_CLASS` 供 NSelectionRect 绑定。 需要「表头固定 + 表体自滚动」的视图（如
 * DetailView）在视图内单独包 `NScrollbar` 并自行打标滚动宿主。
 */
export default defineComponent({
  name: 'FileListNaiveScrollShell',
  setup(_, { slots }) {
    return () => (
      <NScrollbar
        yPlacement="right"
        xPlacement="bottom"
        class="h-full"
        // @ts-expect-error containerClass 由 naive-ui 内部 scrollbar 支持，公共类型未导出
        containerClass={FILE_LIST_SCROLL_HOST_CLASS}
      >
        {slots.default?.()}
      </NScrollbar>
    );
  }
});
