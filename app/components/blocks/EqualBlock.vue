<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';
import BlockRenderer from '~/components/blocks/BlockRenderer.vue';

defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  left?: any;
  right?: any;
  isExpression?: boolean;
  children?: any[];
}>();

</script>

<template>
  <BaseBlock color="#59C059" :minimal="minimal" :label="minimal ? $t('blocks.equal.label') : undefined">
    <div class="equal-block" v-if="!minimal">
      <BlockDropZone 
        slotName="left" 
        :parentBlockId="blockId!" 
        :block="left"
        :acceptedBlockTypes="['expression']"
      >
        <BlockRenderer v-if="left" :block="left" isExpression />
      </BlockDropZone>

      <span class="equal-sep">==</span>

      <BlockDropZone 
        slotName="right" 
        :parentBlockId="blockId!" 
        :block="right"
        :acceptedBlockTypes="['expression']"
      >
        <BlockRenderer v-if="right" :block="right" isExpression />
      </BlockDropZone>
    </div>
  </BaseBlock>
</template>

<style scoped>
.equal-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.equal-sep {
  font-weight: bold;
}
</style>
