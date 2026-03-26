<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import StringBlock from './StringBlock.vue';
import NumberBlock from './NumberBlock.vue';
import ArrayBlock from './ArrayBlock.vue';
import ObjectBlock from './ObjectBlock.vue';
import ObjectPropertyBlock from './ObjectPropertyBlock.vue';
import MathBlock from './MathBlock.vue';
import VarBlock from './VarBlock.vue';

import ComparisonBlock from './ComparisonBlock.vue';
import FunctionCallBlock from './FunctionCallBlock.vue';
import EqualBlock from './EqualBlock.vue';
import BooleanBlock from './BooleanBlock.vue';
import PrintBlock from "~/components/blocks/PrintBlock.vue";

defineProps<{
  minimal?: boolean;
  blockId?: string;
  list?: any;
  config?: any;
  children?: any[];
}>();

provide('inLoop', ref(true));

const getOperandComponent = (block: any) => {
  if (!block) return null;
  const type = block.type;
  if (type === 'string') return StringBlock;
  if (type === 'number') return NumberBlock;
  if (type === 'array') return ArrayBlock;
  if (type === 'object') return ObjectBlock;
  if (type === 'object_property') return ObjectPropertyBlock;
  if (type === 'var') return VarBlock;
  if (type === 'function') return FunctionCallBlock;
  if (type === 'print') return PrintBlock;
  if (type === 'boolean' || type === 'true' || type === 'false' || type === 'equal') return BooleanBlock;
  if (type.startsWith('compare-')) return ComparisonBlock;
  if (type.startsWith('math-')) return MathBlock;
  return null;
};
</script>

<template>
  <BaseBlock color="#FF6680" :label="$t('blocks.foreach.label')" :minimal="minimal">
    <input class="block-input small" :placeholder="$t('blocks.foreach.item')" v-if="!minimal" />
    <span>{{ $t('blocks.foreach.in') }}</span>
    <BlockDropZone 
      v-if="!minimal"
      slotName="list" 
      :parentBlockId="blockId!" 
      :block="list"
      :acceptedBlockTypes="['expression']"
    >
      <component 
        v-if="list" 
        :is="getOperandComponent(list)" 
        v-bind="list.type.startsWith('math-') || list.type.startsWith('compare-') ? 
          { symbol: list.type.split('-')[1], blockId: list.id, config: list.config, ...list.config.slots, isExpression: true } : 
          (list.type === 'boolean' || list.type === 'true' || list.type === 'false' || list.type === 'equal' ? 
            { value: list.type === 'true' || (list.config && (list.config.value === true || list.config.value === 'true')), blockId: list.id, config: list.config, ...list.config.slots, isExpression: true } : 
            { blockId: list.id, config: list.config, ...list.config.slots, isExpression: true }
          )"
      />
    </BlockDropZone>
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
  outline: none;
}
.small {
  width: 60px;
}
</style>
