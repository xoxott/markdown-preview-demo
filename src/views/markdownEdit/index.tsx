/**
 * Markdown 编辑器页面
 * 支持流式渲染和笔写效果
 */
import { computed, defineComponent, ref } from 'vue';
import { NInput, NButton, useThemeVars } from 'naive-ui';
import Markdown from '@/components/markdown';
import README from './README.md?raw';

export default defineComponent({
  name: 'MarkdownEdit',
  setup() {
    const themeVars = useThemeVars();
    const content = ref(README);
    const isTyping = ref(false);

    /**
     * 逐字打印工具函数
     *
     * @param fullText 要打印的完整文本
     * @param onUpdate 每次更新调用的回调，传入当前累积的文本
     * @param delay 每个字符之间的延迟（毫秒）
     */
    async function typewriterEffect(
      fullText: string,
      onUpdate: (current: string) => void,
      delay = 10
    ) {
      let currentText = '';
      for (let i = 0; i < fullText.length; i++) {
        currentText += fullText[i];
        onUpdate(currentText);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const clickHandle = () => {
      if (isTyping.value) return;

      isTyping.value = true;
      const fullText = README;
      content.value = '';

      typewriterEffect(
        fullText,
        currentText => {
          content.value = currentText;
        },
        50
      ).then(() => {
        isTyping.value = false;
      });
    };

    const editorStyle = computed(() => ({
      backgroundColor: themeVars.value.bodyColor
    }));

    const leftStyle = computed(() => ({
      backgroundColor: themeVars.value.bodyColor,
      borderColor: themeVars.value.borderColor,
      color: themeVars.value.textColorBase
    }));

    const rightStyle = computed(() => ({
      backgroundColor: themeVars.value.bodyColor,
      color: themeVars.value.textColorBase
    }));

    const previewStyle = computed(() => ({
      backgroundColor: themeVars.value.cardColor,
      color: themeVars.value.textColorBase,
      borderColor: themeVars.value.borderColor,
      position: 'relative' as const
    }));

    return () => (
      <div class="h-full flex bg-gray-50" style={editorStyle.value}>
        {/* 左侧输入框 */}
        <div
          class="w-1/3 overflow-y-auto border-r border-gray-200 p-4"
          style={leftStyle.value}
        >
          <div class="mb-2 text-lg font-semibold">
            Markdown 输入
            <NButton onClick={clickHandle} disabled={isTyping.value} class="ml-2">
              {isTyping.value ? '流式渲染中...' : '流式渲染'}
            </NButton>
          </div>
          <NInput
            value={content.value}
            type="textarea"
            autosize={{ minRows: 20 }}
            placeholder="请输入 Markdown 内容..."
            class="w-full text-sm font-mono"
            onUpdate: value={(val: string) => {
              content.value = val;
            }}
          />
        </div>

        {/* 右侧预览框 */}
        <div class="w-2/3 overflow-y-auto p-4" style={rightStyle.value}>
          <div class="mb-2 text-lg font-semibold">预览结果</div>
          <div
            class="border border-gray-200 rounded-md p-4 shadow"
            style={previewStyle.value}
          >
            <Markdown
              content={content.value}
              showPenEffect={isTyping.value}
            />
          </div>
        </div>
      </div>
    );
  }
});
