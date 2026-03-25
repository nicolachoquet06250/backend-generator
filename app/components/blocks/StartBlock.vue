<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
</script>

<template>
  <BaseBlock color="#FFBF00" :label="$t('blocks.start.label')">
    <div class="start-icon">🏁</div>
  </BaseBlock>
</template>

<style scoped>
.start-icon {
  font-size: 1.2em;
}
</style>
