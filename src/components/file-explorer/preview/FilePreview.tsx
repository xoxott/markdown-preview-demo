import type { PropType } from 'vue';
import { computed, defineComponent, h } from 'vue';
import type { FileItem } from '../types/file-explorer';
import type { FileCategory, PreviewerMatch } from './types';
import { previewRegistry } from './previewRegistry';
import { PreviewHeader } from './PreviewHeader';
import { PreviewLoading } from './PreviewLoading';
import { UnsupportedPreview } from './UnsupportedPreview';
import { ensurePreviewRegistryReady } from './ensurePreviewRegistryReady';

/** 文件预览统一入口组件 — 通过注册表路由到具体预览器，统一处理 loading/error/文件信息头 */
export default defineComponent({
  name: 'FilePreview',
  props: {
    file: {
      type: Object as PropType<FileItem>,
      required: true
    },
    content: {
      type: [String, Blob] as PropType<string | Blob | undefined>,
      default: undefined
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    ensurePreviewRegistryReady();

    const previewerMatch = computed<PreviewerMatch | null>(() => {
      return previewRegistry.getPreviewer(props.file.extension, props.file.mimeType);
    });

    const category = computed<FileCategory>(() => {
      return previewerMatch.value?.category ?? 'unsupported';
    });

    return () => {
      if (props.loading) {
        return <PreviewLoading tip="正在加载文件..." />;
      }

      if (!props.content) {
        return (
          <div class="min-h-0 flex flex-col flex-1 overflow-hidden">
            <PreviewHeader file={props.file} category={category.value} />
            <UnsupportedPreview file={props.file} />
          </div>
        );
      }

      if (!previewerMatch.value) {
        return (
          <div class="min-h-0 flex flex-col flex-1 overflow-hidden">
            <PreviewHeader file={props.file} category="unsupported" />
            <UnsupportedPreview file={props.file} />
          </div>
        );
      }

      const PreviewerComponent = previewerMatch.value.component;
      return (
        <div class="min-h-0 flex flex-col flex-1 overflow-hidden">
          <PreviewHeader file={props.file} category={category.value} />
          <div class="flex-1 overflow-hidden">
            {h(PreviewerComponent, { file: props.file, content: props.content })}
          </div>
        </div>
      );
    };
  }
});
