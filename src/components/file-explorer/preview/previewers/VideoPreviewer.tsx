import type { PropType } from 'vue';
import { defineComponent, onBeforeUnmount, ref, watch } from 'vue';
import { NText, useThemeVars } from 'naive-ui';
import type { FileItem } from '../../types/file-explorer';

/** 视频预览器 — HTML5 video 标签 + 自定义控制栏 */
export const VideoPreviewer = defineComponent({
  name: 'VideoPreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const videoUrl = ref<string>('');
    const error = ref(false);

    const createVideoUrl = () => {
      if (videoUrl.value && videoUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl.value);
      }
      if (props.content instanceof Blob) {
        videoUrl.value = URL.createObjectURL(props.content);
      } else if (typeof props.content === 'string') {
        videoUrl.value = props.content.startsWith('data:') ? props.content : props.content;
      } else {
        videoUrl.value = '';
        error.value = true;
      }
    };

    watch(() => props.content, createVideoUrl, { immediate: true });
    onBeforeUnmount(() => {
      if (videoUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl.value);
      }
    });

    return () => {
      if (error.value) {
        return (
          <div
            class="h-full flex items-center justify-center overflow-hidden p-4"
            style={{ backgroundColor: themeVars.value.bodyColor }}
          >
            <NText depth={3} class="text-sm">
              视频加载失败
            </NText>
          </div>
        );
      }

      if (videoUrl.value) {
        return (
          <div
            class="h-full flex items-center justify-center overflow-hidden p-4"
            style={{ backgroundColor: themeVars.value.bodyColor }}
          >
            <video
              src={videoUrl.value}
              controls
              class="max-h-full max-w-full rounded"
              style={{ backgroundColor: '#000' }}
              onError={() => {
                error.value = true;
              }}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        );
      }

      return null;
    };
  }
});
