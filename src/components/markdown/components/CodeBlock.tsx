import { type PropType, computed, defineComponent, ref } from 'vue';
import { NCard, NCode, NConfigProvider } from 'naive-ui';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
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
    }
  },
  setup(props) {
    const { darkMode } = useMarkdownTheme();
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
      <NConfigProvider hljs={hljs}>
        <NCard class="mb-2 mt-4">
          <ToolBar
            copyFeedback={copyFeedback.value}
            langName={language.value}
            isSvg={false}
            onCopy={handleCopy}
            onRun={handleRun}
          />
          <NCode
            showLineNumbers
            code={props.meta.content}
            language={language.value}
            style={{ margin: 0, padding: 0, marginBottom: 0 }}
          />
          {canRun.value && props.meta.content && (
            <SandBox
              v-model:show={showSandBox.value}
              code={props.meta.content}
              mode={props.meta.langName as 'javascript' | 'vue'}
            />
          )}
        </NCard>
      </NConfigProvider>
    );
  }
});
