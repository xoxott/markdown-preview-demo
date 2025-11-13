import { type PropType, computed, defineComponent, ref } from 'vue';
import { NCard, NCode, NConfigProvider, darkTheme } from 'naive-ui';
import hljs from 'highlight.js';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useCodeTools } from '../hooks/useToolbar';
import type { CodeBlockMeta } from '../plugins/types';
import { RUN_CODE_LANGS } from '../constants';
import { ToolBar } from './ToolBar';
import { SandBox } from './SandBox';
import { useToggle } from '@/hooks/customer/useToggle';

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
    const { darkMode, cssVars, themeVars } = useMarkdownTheme();
    const { copyCode, copyFeedback } = useCodeTools();
    const { state:showSandBox,toggle:toggleSandBox } = useToggle(false)

    const language = computed(() => props.meta.langName || 'text');
    const canRun = computed(() => RUN_CODE_LANGS.includes(props.meta.langName as any));

    // 代码块样式（确保在暗色模式下文字颜色正确）
    const codeStyle = computed(() => ({
      padding: 0,
      fontSize: 'none',
      marginBottom: 0,
      color: themeVars.value.textColor2,
      backgroundColor: themeVars.value.codeColor
    }));

    const handleCopy = () => {
      copyCode(props.meta.content);
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
          onRun={toggleSandBox}
          canRun={canRun.value}
        />

        {/* 代码块 */}
        <div class="overflow-hidden flex flex-col code-block-wrapper">
          <NConfigProvider theme={darkMode.value ? darkTheme : null} hljs={hljs}>
            <NCode
              code={props.meta.content}
              language={language.value}
              style={codeStyle.value}
              wordWrap
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
/* 代码块基础样式 */
.code-block-wrapper {
  margin-top: 0.75rem;
}

.code-block-wrapper .n-code {
  font-size: 14px !important;
}

/* 确保代码块内的文本在所有情况下都有正确的颜色 */
.code-block-wrapper .n-code pre,
.code-block-wrapper .n-code code {
  /* background: transparent !important; */
}

/* 未高亮的代码文本颜色继承父元素 */
.code-block-wrapper .__code__ {
  color: inherit;
  margin: 0!important;
}

/* 暗色模式下确保文本可见 */
.n-config-provider[data-theme="dark"] .code-block-wrapper .n-code pre code {
  color: inherit;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('code-block-styles')) {
  style.id = 'code-block-styles';
  document.head.appendChild(style);
}
