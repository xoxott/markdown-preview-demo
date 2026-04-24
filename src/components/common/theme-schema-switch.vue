<script setup lang="ts">
import { computed } from 'vue';
import type { PopoverPlacement } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({ name: 'ThemeSchemaSwitch' });

interface Props {
  /** Theme schema */
  themeSchema: UnionKey.ThemeScheme;
  /** Show tooltip */
  showTooltip?: boolean;
  /** Tooltip placement */
  tooltipPlacement?: PopoverPlacement;
}

const { themeSchema, showTooltip = true, tooltipPlacement = 'bottom' } = defineProps<Props>();

interface Emits {
  (e: 'switch'): void;
}

const emit = defineEmits<Emits>();

function handleSwitch() {
  emit('switch');
}

const icons: Record<UnionKey.ThemeScheme, string> = {
  light: 'material-symbols:sunny',
  dark: 'material-symbols:nightlight-rounded',
  auto: 'material-symbols:hdr-auto'
};

const icon = computed(() => icons[themeSchema]);

const tooltipContent = computed(() => {
  if (!showTooltip) return '';

  return $t('icon.themeSchema');
});
</script>

<template>
  <ButtonIcon
    :icon="icon"
    :tooltip-content="tooltipContent"
    :tooltip-placement="tooltipPlacement"
    @click="handleSwitch"
  />
</template>

<style scoped></style>
