<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';
import BlockRenderer from '~/components/blocks/BlockRenderer.vue';

defineProps<{
  minimal?: boolean;
  blockId?: string;
  condition?: any;
  config?: any;
  children?: any[];
}>();

provide('inLoop', ref(true));
</script>

<template>
  <BaseBlock color="#FF6680" :label="$t('blocks.while.label')" :minimal="minimal">
    <BlockDropZone 
      v-if="!minimal"
      slotName="condition" 
      :parentBlockId="blockId!" 
      :block="condition"
      :acceptedBlockTypes="['boolean', 'compare-op']"
    >
      <BlockRenderer v-if="condition" :block="condition" isExpression />
    </BlockDropZone>
    <template #bottom>
      <slot />
    </template>
  </BaseBlock>
</template>

