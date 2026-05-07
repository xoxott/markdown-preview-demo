import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: 'WorkspaceHero',
  setup() {
    const { t } = useI18n();
    return () => (
      <header class="chat-hero">
        <div class="chat-hero__grid" aria-hidden={true} />
        <div class="chat-hero__inner">
          <h1 class="chat-hero__title">{t('page.chat.heroTitle')}</h1>
          <p class="chat-hero__subtitle">{t('page.chat.heroSubtitle')}</p>
        </div>
      </header>
    );
  }
});
