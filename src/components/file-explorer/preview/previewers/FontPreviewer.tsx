import type { PropType } from 'vue';
import { defineComponent, onBeforeUnmount, ref, watch } from 'vue';
import { NIcon, NText, useThemeVars } from 'naive-ui';
import { TextOutline } from '@vicons/ionicons5';
import type { FileItem } from '../../types/file-explorer';

/** 扩展 FontFaceSet 以包含非标准的 add 方法（Safari/旧版 Chrome） */
interface FontFaceSetWithAdd extends FontFaceSet {
  add(font: FontFace): void;
}

/** 字体预览器 — 使用 CSS @font-face 渲染字体样本 */
export const FontPreviewer = defineComponent({
  name: 'FontPreviewer',
  props: {
    file: { type: Object as PropType<FileItem>, required: true },
    content: { type: [String, Blob] as PropType<string | Blob | undefined>, default: undefined }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const fontUrl = ref<string>('');
    const fontLoaded = ref(false);
    const fontFamilyName = ref(`preview-font-${props.file.id}`);

    const loadFont = async () => {
      fontLoaded.value = false;
      if (props.content instanceof Blob) {
        fontUrl.value = URL.createObjectURL(props.content);
      } else if (typeof props.content === 'string') {
        fontUrl.value = props.content;
      }

      if (fontUrl.value) {
        try {
          const ext = props.file.extension?.toLowerCase() || '';
          const formatMap: Record<string, string> = {
            ttf: 'truetype',
            otf: 'opentype',
            woff: 'woff',
            woff2: 'woff2'
          };
          const format = formatMap[ext] || '';
          const source = format
            ? `url(${fontUrl.value}) format('${format}')`
            : `url(${fontUrl.value})`;
          const font = new FontFace(fontFamilyName.value, source);
          const loaded = await font.load();
          (document.fonts as FontFaceSetWithAdd).add(loaded);
          fontLoaded.value = true;
        } catch {
          fontLoaded.value = false;
        }
      }
    };

    watch(() => props.content, loadFont, { immediate: true });

    onBeforeUnmount(() => {
      if (fontUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(fontUrl.value);
      }
    });

    /** 字体样本展示文本 */
    const sampleTexts = [
      'ABCDEFGHIJKLM',
      'NOPQRSTUVWXYZ',
      'abcdefghijklm',
      'nopqrstuvwxyz',
      '0123456789',
      '你好世界！字体预览',
      'The quick brown fox jumps over the lazy dog.'
    ];

    const sampleSizes = [12, 16, 20, 28, 36];

    return () => (
      <div
        class="h-full flex flex-col overflow-auto p-6"
        style={{ backgroundColor: themeVars.value.bodyColor }}
      >
        {fontLoaded.value ? (
          <>
            {/* 字体名称 */}
            <div class="mb-6">
              <NText strong class="text-lg">
                {props.file.name}
              </NText>
              <NText depth={3} class="ml-2 text-sm">
                字体文件预览
              </NText>
            </div>

            {/* 各尺寸样本 */}
            <div class="space-y-4">
              {sampleSizes.map(size => (
                <div
                  key={size}
                  class="border-b pb-3"
                  style={{ borderColor: themeVars.value.dividerColor }}
                >
                  <NText depth={3} class="mb-1 text-xs">
                    {size}px
                  </NText>
                  <div
                    style={{
                      fontFamily: fontFamilyName.value,
                      fontSize: `${size}px`,
                      lineHeight: 1.4
                    }}
                  >
                    {sampleTexts[0]}
                  </div>
                </div>
              ))}
            </div>

            {/* 完整文本样本 */}
            <div class="mt-6 space-y-3">
              {sampleTexts.map((text, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: fontFamilyName.value,
                    fontSize: '20px',
                    lineHeight: 1.6,
                    color: themeVars.value.textColorBase
                  }}
                >
                  {text}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div class="h-full flex flex-col items-center justify-center gap-4">
            <NIcon size={48} style={{ color: themeVars.value.textColor3 }}>
              <TextOutline />
            </NIcon>
            <NText depth={3} class="text-sm">
              字体加载失败
            </NText>
          </div>
        )}
      </div>
    );
  }
});
