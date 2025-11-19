import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { FileItem } from '../types/file-explorer';
import TextPreview from './TextPreview';
import ImagePreview from './ImagePreview';
import { MarkdownPreview } from '@/components/markdown';

export default defineComponent({
  name: 'FilePreview',
  props: {
    file: {
      type: Object as PropType<FileItem>,
      required: true
    },
    content: {
      type: [String, Blob] as PropType<string | Blob>,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const fileExtension = computed(() => {
      return props.file.extension?.toLowerCase() || '';
    });

    const isTextFile = computed(() => {
      const textExtensions = ['txt', 'md', 'js', 'ts', 'json', 'html', 'css', 'vue', 'tsx', 'jsx', 'xml', 'yaml', 'yml', 'sh', 'py', 'java', 'cpp', 'c', 'h'];
      return textExtensions.includes(fileExtension.value);
    });

    const isImageFile = computed(() => {
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'];
      return imageExtensions.includes(fileExtension.value);
    });

    const isMarkdownFile = computed(() => {
      return fileExtension.value === 'md' || fileExtension.value === 'markdown';
    });

    return () => {
      if (props.loading) {
        return (
          <div class="flex h-full items-center justify-center">
            <div class="text-center">
              <div class="mb-2 text-sm text-gray-500">加载中...</div>
            </div>
          </div>
        );
      }

      if (!props.content) {
        return (
          <div class="flex h-full items-center justify-center">
            <div class="text-center text-gray-500">
              <div class="mb-2 text-sm">无法预览此文件</div>
              <div class="text-xs">文件类型: {props.file.extension || '未知'}</div>
            </div>
          </div>
        );
      }

      // Markdown 文件
      if (isMarkdownFile.value && typeof props.content === 'string') {
        return (
          <div class="h-full overflow-auto">
            <MarkdownPreview content={props.content} />
          </div>
        );
      }

      // 图片文件
      if (isImageFile.value && props.content instanceof Blob) {
        return <ImagePreview file={props.file} blob={props.content} />;
      }

      // 文本文件
      if (isTextFile.value && typeof props.content === 'string') {
        return <TextPreview file={props.file} content={props.content} />;
      }

      // 其他文件类型
      return (
        <div class="flex h-full items-center justify-center">
          <div class="text-center text-gray-500">
            <div class="mb-2 text-sm">不支持预览此文件类型</div>
            <div class="text-xs">文件: {props.file.name}</div>
          </div>
        </div>
      );
    };
  }
});

