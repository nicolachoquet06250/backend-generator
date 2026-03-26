<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
defineProps<{
  minimal?: boolean;
  blockId?: string;
  children?: any[];
}>();
</script>

<template>
  <BaseBlock color="#FF8C1A" :label="$t('blocks.literal.object_property')" :minimal="minimal">
    <input v-if="!minimal" class="block-input" :placeholder="$t('blocks.struct.field_name')" />
  </BaseBlock>
</template>

<style scoped>
.block-input {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 0.9em;
  width: 80px;
}
</style>
