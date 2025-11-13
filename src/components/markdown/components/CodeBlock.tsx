import { type PropType, computed, defineComponent, ref } from 'vue';
import { NCard, NCode, NConfigProvider, darkTheme } from 'naive-ui';
import hljs from 'highlight.js';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useCodeTools } from '../hooks/useToolbar';
import type { CodeBlockMeta } from '../plugins/types';
import { RUN_CODE_LANGS } from '../constants';
import { ToolBar } from './ToolBar';
import { SandBox } from './SandBox';

export const CodeBlock = defineComponent({
  name: 'CodeBlock',
  props: {
    meta: {
      type: Object as PropType<CodeBlockMeta>,
      required: true
    },
    bordered: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const { darkMode, cssVars } = useMarkdownTheme();
    const { copyCode, copyFeedback } = useCodeTools();
    const showSandBox = ref(false);

    const language = computed(() => props.meta.langName || 'text');
    const canRun = computed(() => RUN_CODE_LANGS.includes(props.meta.langName as any));

    const handleCopy = () => {
      copyCode(props.meta.content);
    };

    const handleRun = () => {
      showSandBox.value = true;
    };

    return () => (
      <NCard
        bordered={props.bordered}
        style={cssVars.value as any}
      >
        {/* 工具栏 */}
        <ToolBar
          copyFeedback={copyFeedback.value}
          langName={language.value}
          isSvg={false}
          onCopy={handleCopy}
          onRun={handleRun}
        />

        {/* 代码块 */}
        <div class="overflow-hidden flex flex-col">
          <NConfigProvider theme={darkMode.value ? darkTheme : null} hljs={hljs}>
            <NCode
              code={props.meta.content}
              language={language.value}
              showLineNumbers
              style={{
                  padding: 0,
                  fontSize: 'none',
                  marginBottom: 0
              }}
            />
          </NConfigProvider>
        </div>

        {/* 代码沙箱 */}
        {canRun.value && props.meta.content && (
          <SandBox
            v-model:show={showSandBox.value}
            code={props.meta.content}
            mode={props.meta.langName as 'javascript' | 'vue'}
          />
        )}
      </NCard>
    );
  }
});

// 添加样式
const style = document.createElement('style');
style.textContent = `
 .markdown-body code pre {
   margin-bottom: 0;
   font-size: 14px !important;
   background: transparent;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('code-block-styles')) {
  style.id = 'code-block-styles';
  document.head.appendChild(style);
}
