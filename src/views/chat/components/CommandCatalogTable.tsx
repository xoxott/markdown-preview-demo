import { computed, defineComponent, h, ref } from 'vue';
import { NDataTable, NRadioButton, NRadioGroup, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { COMMAND_CATALOG } from '@suga/ai-commands/catalog-data';

type TierFilter = 'all' | 'tier1' | 'tier2' | 'tier3';
type Row = (typeof COMMAND_CATALOG)[number];

function tierPillClass(tier: Row['tier']): string {
  const base = 'inline-block rounded-md px-2 py-0.5 text-[0.72rem] font-semibold tracking-wide';
  if (tier === 'tier1') return `${base} bg-emerald-500/12 text-emerald-800`;
  if (tier === 'tier2') return `${base} bg-blue-500/12 text-blue-800`;
  return `${base} bg-amber-400/14 text-amber-900`;
}

export default defineComponent({
  name: 'CommandCatalogTable',
  setup() {
    const { t } = useI18n();
    const tier = ref<TierFilter>('all');

    const rows = computed<Row[]>(() => {
      if (tier.value === 'all') return [...COMMAND_CATALOG];
      return COMMAND_CATALOG.filter(e => e.tier === tier.value);
    });

    const columns = computed<DataTableColumns<Row>>(() => [
      {
        title: () => t('page.chat.colName'),
        key: 'name',
        ellipsis: { tooltip: true },
        width: 140,
        render: (row: Row) =>
          h('code', { class: 'font-mono text-sm text-cyan-800' }, row.name)
      },
      {
        title: () => t('page.chat.colTier'),
        key: 'tier',
        width: 92,
        render: (row: Row) =>
          h(
            'span',
            {
              class: tierPillClass(row.tier)
            },
            row.tier.replace('tier', 'T')
          )
      },
      {
        title: () => t('page.chat.colCategory'),
        key: 'category',
        width: 120,
        ellipsis: { tooltip: true }
      },
      {
        title: () => t('page.chat.colProviders'),
        key: 'requiredProviders',
        render: (row: Row) => (row.requiredProviders.length ? row.requiredProviders.join(', ') : '—')
      }
    ]);

    return () => (
      <div class="chat-cmd">
        <p class="chat-cmd-lead">{t('page.chat.commandsLead')}</p>
        <div class="chat-cmd-toolbar">
          <span class="chat-cmd-toolbar-label">{t('page.chat.tierFilter')}</span>
          <NRadioGroup v-model:value={tier} size="small">
            <NSpace>
              <NRadioButton value="all">{t('page.chat.tierAll')}</NRadioButton>
              <NRadioButton value="tier1">{t('page.chat.tier1')}</NRadioButton>
              <NRadioButton value="tier2">{t('page.chat.tier2')}</NRadioButton>
              <NRadioButton value="tier3">{t('page.chat.tier3')}</NRadioButton>
            </NSpace>
          </NRadioGroup>
        </div>
        <NDataTable
          class="w-full min-w-0"
          columns={columns.value}
          data={rows.value}
          bordered={false}
          size="small"
          scrollX={720}
          striped
        />
      </div>
    );
  }
});
