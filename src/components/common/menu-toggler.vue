<script lang="ts" setup>
import { computed } from 'vue';
import { $t } from '@/locales';

defineOptions({ name: 'MenuToggler' });

interface Props {
  /** Show collapsed icon */
  collapsed?: boolean;
  /** Arrow style icon */
  arrowIcon?: boolean;
  zIndex?: number;
}

const { collapsed, arrowIcon = false, zIndex = 98 } = defineProps<Props>();

type NumberBool = 0 | 1;

const icon = computed(() => {
  const icons: Record<NumberBool, Record<NumberBool, string>> = {
    0: {
      0: 'line-md:menu-fold-left',
      1: 'line-md:menu-fold-right'
    },
    1: {
      0: 'ph-caret-double-left-bold',
      1: 'ph-caret-double-right-bold'
    }
  };

  const arrowIconNum = Number(arrowIcon || false) as NumberBool;

  const collapsedNum = Number(collapsed || false) as NumberBool;

  return icons[arrowIconNum][collapsedNum];
});
</script>

<template>
  <ButtonIcon
    :key="String(collapsed)"
    :tooltip-content="collapsed ? $t('icon.expand') : $t('icon.collapse')"
    tooltip-placement="bottom-start"
    :z-index="zIndex"
  >
    <SvgIcon :icon="icon" />
  </ButtonIcon>
</template>

<style scoped></style>
