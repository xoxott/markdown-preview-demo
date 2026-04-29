import type { PropType } from 'vue';
import { defineComponent, onBeforeUnmount, ref, watch } from 'vue';
import { NIcon, NText, useThemeVars } from 'naive-ui';
import { MusicalNotesOutline } from '@vicons/ionicons5';
import type { FileItem } from '../../types/file-explorer';

/** 音频预览器 — HTML5 audio 标签 + 波形展示区域 */
export const AudioPreviewer = defineComponent({
  name: 'AudioPreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const audioUrl = ref<string>('');
    const error = ref(false);

    const createAudioUrl = () => {
      if (audioUrl.value && audioUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl.value);
      }
      if (props.content instanceof Blob) {
        audioUrl.value = URL.createObjectURL(props.content);
      } else if (typeof props.content === 'string') {
        audioUrl.value = props.content.startsWith('data:') ? props.content : props.content;
      } else {
        audioUrl.value = '';
        error.value = true;
      }
    };

    watch(() => props.content, createAudioUrl, { immediate: true });
    onBeforeUnmount(() => {
      if (audioUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl.value);
      }
    });

    return () => {
      if (error.value) {
        return (
          <div
            class="h-full flex flex-col items-center justify-center gap-6 p-8"
            style={{ backgroundColor: themeVars.value.bodyColor }}
          >
            <NText depth={3} class="text-sm">
              音频加载失败
            </NText>
          </div>
        );
      }

      if (audioUrl.value) {
        return (
          <div
            class="h-full flex flex-col items-center justify-center gap-6 p-8"
            style={{ backgroundColor: themeVars.value.bodyColor }}
          >
            <div class="flex flex-col items-center gap-3">
              <div
                class="flex items-center justify-center rounded-full"
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: `${themeVars.value.primaryColor}15`
                }}
              >
                <NIcon size={40} style={{ color: themeVars.value.primaryColor }}>
                  <MusicalNotesOutline />
                </NIcon>
              </div>
              <NText strong class="text-sm">
                {props.file.name}
              </NText>
            </div>
            <audio
              src={audioUrl.value}
              controls
              class="max-w-md w-full"
              onError={() => {
                error.value = true;
              }}
              style={{ filter: themeVars.value.bodyColor === '#fff' ? 'none' : 'invert(1)' }}
            >
              您的浏览器不支持音频播放
            </audio>
          </div>
        );
      }

      return null;
    };
  }
});
