import { computed, defineComponent, ref } from 'vue';
import { NCard, NGrid, NGridItem, NInput, NTag } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { getHex, getHsl, getRgb, isValidColor } from '@suga/color';
import {
  WORKSPACE_PACKAGES,
  type WorkspacePackageGroup
} from '@/views/chat/data/workspace-packages';

const groupOrder: WorkspacePackageGroup[] = ['render', 'pipeline', 'agent', 'infra'];

function packagesInGroup(grp: WorkspacePackageGroup) {
  return WORKSPACE_PACKAGES.filter(p => p.group === grp);
}

export default defineComponent({
  name: 'PackageGrid',
  setup() {
    const { t, locale } = useI18n();
    const colorInput = ref('#22d3ee');

    const parsed = computed(() => {
      const v = colorInput.value.trim();
      if (!isValidColor(v)) return null;
      return {
        hex: getHex(v),
        rgb: getRgb(v),
        hsl: getHsl(v)
      };
    });

    function groupTitle(g: WorkspacePackageGroup): string {
      const keys: Record<WorkspacePackageGroup, string> = {
        render: 'page.chat.groupRender',
        pipeline: 'page.chat.groupPipeline',
        agent: 'page.chat.groupAgent',
        infra: 'page.chat.groupInfra'
      };
      return t(keys[g]);
    }

    function pkgDesc(desc: Record<'zh-CN' | 'en-US', string>): string {
      const loc = locale.value as 'zh-CN' | 'en-US';
      return desc[loc] ?? desc['en-US'];
    }

    return () => (
      <div class="chat-pkg-root">
        <p class="chat-pkg-lead">{t('page.chat.packagesLead')}</p>
        {groupOrder.map(grp => (
          <section key={grp} class="chat-pkg-section">
            <h3 class="chat-pkg-section-title">{groupTitle(grp)}</h3>
            <NGrid cols="1 s:2 l:3" x-gap={14} y-gap={14} responsive="screen">
              {packagesInGroup(grp).map(pkg => (
                <NGridItem key={pkg.name}>
                  <NCard
                    size="small"
                    class="chat-pkg-card"
                    bordered={false}
                    content-style="padding: 14px 16px;"
                  >
                    <span class="chat-pkg-name">{pkg.name}</span>
                    <p class="chat-pkg-desc">{pkgDesc(pkg.desc)}</p>
                    <div class="chat-pkg-tags">
                      {pkg.tags.map(tag => (
                        <NTag key={tag} size="small" round bordered={false}>
                          {tag}
                        </NTag>
                      ))}
                    </div>
                  </NCard>
                </NGridItem>
              ))}
            </NGrid>
          </section>
        ))}
        <div class="chat-pkg-color">
          <div class="chat-pkg-color-title">{t('page.chat.colorDemo')}</div>
          <p class="chat-pkg-color-hint">{t('page.chat.colorHint')}</p>
          <NInput v-model:value={colorInput} clearable placeholder="#22d3ee" />
          {parsed.value ? (
            <pre class="chat-pkg-color-out">{JSON.stringify(parsed.value, null, 2)}</pre>
          ) : (
            <p class="chat-pkg-color-invalid">—</p>
          )}
        </div>
      </div>
    );
  }
});
