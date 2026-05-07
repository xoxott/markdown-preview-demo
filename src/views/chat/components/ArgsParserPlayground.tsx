import { defineComponent, onMounted, ref } from 'vue';
import { NButton, NCode, NInput } from 'naive-ui';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { parseCommandArgs } from '@suga/ai-commands/args-parser';

const schema = z.object({
  subcommand: z.string().optional(),
  name: z.string().optional(),
  instruction: z.string().optional()
});

export default defineComponent({
  name: 'ArgsParserPlayground',
  setup() {
    const { t } = useI18n();
    const raw = ref('subcommand=save name=workspace-demo');
    const output = ref('{}');
    const error = ref<string | null>(null);

    function runParse() {
      error.value = null;
      try {
        const result = parseCommandArgs(raw.value, schema);
        output.value = JSON.stringify(result, null, 2);
      } catch (e) {
        const err = e as Error;
        error.value = err?.message ?? String(e);
        output.value = '';
      }
    }

    onMounted(runParse);

    return () => (
      <div class="chat-args">
        <p class="chat-args-lead">{t('page.chat.argsLead')}</p>
        <NInput
          v-model:value={raw}
          type="textarea"
          autosize={{ minRows: 3, maxRows: 8 }}
          placeholder={t('page.chat.argsPlaceholder')}
        />
        <div class="chat-args-actions">
          <NButton type="primary" onClick={runParse}>
            {t('page.chat.argsRun')}
          </NButton>
        </div>
        {error.value ? (
          <div class="chat-args-err">{error.value}</div>
        ) : (
          <div class="chat-args-result">
            <div class="chat-args-label">{t('page.chat.argsParsed')}</div>
            <NCode code={output.value} language="json" word-wrap />
          </div>
        )}
      </div>
    );
  }
});
