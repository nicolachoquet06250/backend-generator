<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
defineProps<{
  minimal?: boolean;
  blockId?: string;
  children?: any[];
}>();
</script>

<template>
  <BaseBlock color="#5C5C5C" :label="$t('blocks.literal.number')" :minimal="minimal" :blockId="blockId" blockType="number">
    <input v-if="!minimal" class="block-input" type="number" placeholder="0" />
  </BaseBlock>
</template>

<style scoped>
.block-input {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 0.9em;
  width: 60px;
}
</style>
