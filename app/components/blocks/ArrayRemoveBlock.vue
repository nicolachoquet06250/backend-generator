<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';

defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  array?: any;
  index?: any;
  children?: any[];
}>();

const acceptedArrayTypes = ['var', 'parameter', 'array', 'function'];
const acceptedIndexTypes = ['number', 'var', 'parameter', 'math-op', 'function'];

</script>

<template>
  <BaseBlock color="#FF661A" :label="$t('blocks.array_remove.label')" :minimal="minimal">
    <div class="array-remove-block" v-if="!minimal">
      <BlockDropZone 
        slotName="index" 
        :parentBlockId="blockId!" 
        :block="index"
        :acceptedBlockTypes="acceptedIndexTypes"
      >
        <BlockRenderer v-if="index" :block="index" isExpression />
      </BlockDropZone>

      <span class="sep">{{ $t('blocks.array_remove.from_label') }}</span>

      <BlockDropZone 
        slotName="array" 
        :parentBlockId="blockId!" 
        :block="array"
        :acceptedBlockTypes="acceptedArrayTypes"
      >
        <BlockRenderer v-if="array" :block="array" isExpression />
      </BlockDropZone>
    </div>
  </BaseBlock>
</template>

<style scoped>
.array-remove-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sep {
  font-weight: bold;
}
</style>
