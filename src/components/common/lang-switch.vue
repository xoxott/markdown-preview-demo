<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';

defineOptions({
  name: 'LangSwitch'
});

interface Props {
  /** Current language */
  lang: App.I18n.LangType;
  /** Language options */
  langOptions: App.I18n.LangOption[];
  /** Show tooltip */
  showTooltip?: boolean;
}

type Emits = {
  (e: 'changeLang', lang: App.I18n.LangType): void;
};

const { lang, langOptions, showTooltip = true } = defineProps<Props>();

const emit = defineEmits<Emits>();

const tooltipContent = computed(() => {
  if (!showTooltip) return '';

  return $t('icon.lang');
});

function changeLang(selectedLang: App.I18n.LangType) {
  emit('changeLang', selectedLang);
}
</script>

<template>
  <NDropdown :value="lang" :options="langOptions" trigger="hover" @select="changeLang">
    <div>
      <ButtonIcon :tooltip-content="tooltipContent" tooltip-placement="left">
        <SvgIcon icon="heroicons:language" />
      </ButtonIcon>
    </div>
  </NDropdown>
</template>

<style scoped></style>
