<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
defineProps<{
  minimal?: boolean;
  blockId?: string;
}>();
</script>

<template>
  <BaseBlock color="#9966FF" :label="$t('blocks.literal.string')" :minimal="minimal" :blockId="blockId" blockType="string">
    <input v-if="!minimal" class="block-input" :placeholder="$t('blocks.var.placeholder_value')" />
  </BaseBlock>
</template>

<style scoped>
.block-input {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 0.9em;
  width: 100px;
}
</style>
