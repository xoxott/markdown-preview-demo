import { type PropType, computed, defineComponent } from 'vue';
import { NCard, NCode, NConfigProvider, darkTheme } from 'naive-ui';
import hljs from 'highlight.js';
import { useToggle } from '@/hooks/customer/useToggle';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useCodeTools } from '../hooks/useToolbar';
import type { CodeBlockMeta } from '@suga/markdown-it-render-vnode';
import { RUN_CODE_LANGS } from '../constants';
import { ToolBar } from './ToolBar';
import { SandBox } from './SandBox';
import './css/CodeBlock.scss';

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
    const { state: showSandBox, toggle: toggleSandBox } = useToggle(false);

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
      <NCard bordered={props.bordered} class={'mb-4 mt-4'} style={cssVars.value as any}>
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
        <div class="code-block-wrapper flex flex-col overflow-hidden">
          <NConfigProvider theme={darkMode.value ? darkTheme : null} hljs={hljs}>
            <NCode code={props.meta.content} language={language.value} style={codeStyle.value} wordWrap />
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
