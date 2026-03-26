<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  condition?: any;
  config?: any;
  children?: any[];
}>();
</script>

<template>
  <BaseBlock color="#FFAB19" :label="$t('blocks.if.label')" :minimal="minimal">
    <BlockDropZone 
      v-if="!minimal"
      slotName="condition" 
      :parentBlockId="blockId!" 
      :block="condition"
      :acceptedBlockTypes="['expression']"
    >
      <BlockRenderer v-if="condition" :block="condition" isExpression />
    </BlockDropZone>
    <span>{{ $t('blocks.if.then') }}</span>
    <template #bottom>
      <slot />
    </template>
  </BaseBlock>
</template>

<style scoped>
.block-input {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  width: 120px;
  outline: none;
}
</style>
