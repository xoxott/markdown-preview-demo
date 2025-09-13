<script setup>
import { MobilePage } from '@/components/mobile/base/MobilePage';

const headerConfig = {
  show:false
}
</script>
<template>
<div class="flex items-center justify-center overflow-hidden">
  <MobilePage :header-config="headerConfig"/>
</div>
</template>