import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { useThemeVars } from 'naive-ui';
import { EchartsRenderer } from '@/components/markdown/components/EchartsRenderer';
import type { FileItem } from '../../types/file-explorer';

/** ECharts 预览器 — 复用项目已有的 EchartsRenderer 组件 */
export const EchartsPreviewer = defineComponent({
  name: 'EchartsPreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();

    return () => (
      <div class="h-full overflow-auto" style={{ backgroundColor: themeVars.value.bodyColor }}>
        {typeof props.content === 'string' ? (
          <EchartsRenderer option={props.content} height="100%" bordered={false} />
        ) : (
          <div class="h-full flex items-center justify-center text-sm text-gray-500">
            无法预览此 ECharts 配置文件
          </div>
        )}
      </div>
    );
  }
});
