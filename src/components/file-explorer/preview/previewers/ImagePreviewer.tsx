import type { PropType } from 'vue';
import { defineComponent, onBeforeUnmount, ref, watch } from 'vue';
import { NImage, NText, useThemeVars } from 'naive-ui';
import type { FileItem } from '../../types/file-explorer';

/** 图片预览器 — 支持常见图片格式 + 缩放/预览 */
export const ImagePreviewer = defineComponent({
  name: 'ImagePreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const imageUrl = ref<string>('');
    const error = ref(false);

    const createImageUrl = () => {
      error.value = false;
      if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }
      if (props.content instanceof Blob) {
        imageUrl.value = URL.createObjectURL(props.content);
      } else if (typeof props.content === 'string') {
        imageUrl.value = props.content.startsWith('data:') ? props.content : props.content;
      } else if (props.file.thumbnailUrl) {
        imageUrl.value = props.file.thumbnailUrl;
      } else {
        imageUrl.value = '';
        error.value = true;
      }
    };

    watch(() => props.content, createImageUrl, { immediate: true });

    onBeforeUnmount(() => {
      if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }
    });

    return () => {
      if (error.value) {
        return (
          <div
            class="h-full flex items-center justify-center overflow-auto p-4"
            style={{ backgroundColor: themeVars.value.bodyColor }}
          >
            <NText depth={3} class="text-sm">
              图片加载失败
            </NText>
          </div>
        );
      }

      if (imageUrl.value) {
        return (
          <div
            class="h-full flex items-center justify-center overflow-auto p-4"
            style={{ backgroundColor: themeVars.value.bodyColor }}
          >
            <NImage
              src={imageUrl.value}
              alt={props.file.name}
              objectFit="contain"
              previewDisabled={false}
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
        );
      }

      return null;
    };
  }
});
