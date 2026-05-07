import { computed, defineComponent } from 'vue';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { NAlert, NTabPane, NTabs } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import WorkspaceHero from './WorkspaceHero';
import PackageGrid from './PackageGrid';
import CommandCatalogTable from './CommandCatalogTable';
import MarkdownShowcase from './MarkdownShowcase';
import ArgsParserPlayground from './ArgsParserPlayground';

export default defineComponent({
  name: 'WorkspaceShell',
  setup() {
    const { t } = useI18n();
    const bp = useBreakpoints(breakpointsTailwind);
    const tabPlacement = computed(() => (bp.greaterOrEqual('md').value ? 'left' : 'top'));
    const tabType = computed(() => (tabPlacement.value === 'left' ? 'line' : 'segment'));

    return () => (
      <>
        <WorkspaceHero />
        <NAlert type="info" class="chat-alert" bordered={false}>
          {t('page.chat.notice')}
        </NAlert>
        <NTabs
          key={tabPlacement.value}
          class="chat-workspace-tabs"
          type={tabType.value}
          animated
          placement={tabPlacement.value}
        >
          <NTabPane name="pkg" tab={t('page.chat.tabPackages')}>
            <div class="chat-pane">
              <PackageGrid />
            </div>
          </NTabPane>
          <NTabPane name="cmd" tab={t('page.chat.tabCommands')}>
            <div class="chat-pane">
              <CommandCatalogTable />
            </div>
          </NTabPane>
          <NTabPane name="md" tab={t('page.chat.tabMarkdown')}>
            <div class="chat-pane">
              <MarkdownShowcase />
            </div>
          </NTabPane>
          <NTabPane name="args" tab={t('page.chat.tabArgs')}>
            <div class="chat-pane">
              <ArgsParserPlayground />
            </div>
          </NTabPane>
        </NTabs>
      </>
    );
  }
});
