<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
defineProps<{
  children?: any[];
}>();
</script>

<template>
  <BaseBlock color="#FFBF00" :label="$t('blocks.start.label')" :draggable="false" is-root>
    <div class="start-icon">🏁</div>
  </BaseBlock>
</template>

<style scoped>
.start-icon {
  font-size: 1.2em;
}
</style>
