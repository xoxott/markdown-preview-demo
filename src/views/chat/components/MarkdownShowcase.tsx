import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import Markdown from '@/components/markdown';
import { CHAT_MARKDOWN_SAMPLE } from '@/views/chat/data/sample-markdown';

export default defineComponent({
  name: 'MarkdownShowcase',
  setup() {
    const { t } = useI18n();
    return () => (
      <div class="chat-md-wrap">
        <p class="chat-md-lead">
          <span class="chat-md-lead__accent" aria-hidden={true} />
          <span class="chat-md-lead__text">{t('page.chat.markdownLead')}</span>
        </p>
        <div class="chat-md-frame">
          <div class="chat-md-frame__ribbon" aria-hidden={true} />
          <div class="chat-md-surface">
            <Markdown content={CHAT_MARKDOWN_SAMPLE} />
          </div>
        </div>
      </div>
    );
  }
});
