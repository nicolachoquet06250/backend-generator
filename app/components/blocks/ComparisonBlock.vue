<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';

const props = defineProps<{
  symbol: string;
  minimal?: boolean;
  blockId?: string;
  config?: any;
  left?: any;
  right?: any;
  isExpression?: boolean;
}>();

const opLabel = computed(() => {
  switch (props.symbol) {
    case '<': return 'lt';
    case '>': return 'gt';
    case '<=': return 'lte';
    case '>=': return 'gte';
    case '!=': return 'neq';
    default: return '';
  }
});

</script>

<template>
  <BaseBlock color="#59C059" :minimal="minimal" :label="minimal ? $t(`blocks.compare.${opLabel}`) : undefined" :blockId="blockId" :blockType="'compare-' + symbol">
    <div class="compare-block" v-if="!minimal">
      <BlockDropZone 
        slotName="left" 
        :parentBlockId="blockId!" 
        :block="left"
        :acceptedBlockTypes="['expression']"
      >
        <BlockRenderer v-if="left" :block="left" isExpression />
      </BlockDropZone>

      <span class="compare-sep">{{ symbol }}</span>

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
.compare-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.compare-sep {
  font-weight: bold;
}
</style>
