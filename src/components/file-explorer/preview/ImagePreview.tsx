import type { PropType } from 'vue';
import { defineComponent, ref, watch } from 'vue';
import { NImage, NSpin, useThemeVars } from 'naive-ui';
import type { FileItem } from '../types/file-explorer';

export default defineComponent({
  name: 'ImagePreview',
  props: {
    file: {
      type: Object as PropType<FileItem>,
      required: true
    },
    blob: {
      type: Object as PropType<Blob>,
      required: true
    }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const imageUrl = ref<string>('');
    const loading = ref(true);
    const error = ref(false);

    // 创建对象 URL
    const createImageUrl = () => {
      if (imageUrl.value) {
        URL.revokeObjectURL(imageUrl.value);
      }
      imageUrl.value = URL.createObjectURL(props.blob);
      loading.value = false;
    };

    watch(
      () => props.blob,
      () => {
        loading.value = true;
        error.value = false;
        createImageUrl();
      },
      { immediate: true }
    );

    const handleImageLoad = () => {
      loading.value = false;
    };

    const handleImageError = () => {
      loading.value = false;
      error.value = true;
    };

    return () => (
      <div
        class="flex h-full items-center justify-center overflow-auto p-4"
        style={{ backgroundColor: themeVars.value.bodyColor }}
      >
        {loading.value ? (
          <NSpin size="large" />
        ) : error.value ? (
          <div class="text-center text-gray-500">
            <div class="mb-2 text-sm">图片加载失败</div>
            <div class="text-xs">文件: {props.file.name}</div>
          </div>
        ) : (
          <NImage
            src={imageUrl.value}
            alt={props.file.name}
            objectFit="contain"
            previewDisabled={false}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        )}
      </div>
    );
  }
});

