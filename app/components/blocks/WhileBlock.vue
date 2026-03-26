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

import BooleanBlock from './BooleanBlock.vue';
import EqualBlock from './EqualBlock.vue';
import ComparisonBlock from './ComparisonBlock.vue';
import FunctionCallBlock from './FunctionCallBlock.vue';
import PrintBlock from "~/components/blocks/PrintBlock.vue";
import ParameterBlock from './ParameterBlock.vue';

defineProps<{
  minimal?: boolean;
  blockId?: string;
  condition?: any;
  config?: any;
  children?: any[];
}>();

provide('inLoop', ref(true));

const getConditionComponent = (block: any) => {
  if (!block) return null;
  const type = block.type;
  if (type === 'string') return StringBlock;
  if (type === 'number') return NumberBlock;
  if (type === 'boolean' || type === 'true' || type === 'false' || type === 'equal') return BooleanBlock;
  if (type === 'array') return ArrayBlock;
  if (type === 'object') return ObjectBlock;
  if (type === 'object_property') return ObjectPropertyBlock;
  if (type === 'var') return VarBlock;
  if (type === 'parameter') return ParameterBlock;
  if (type === 'function') return FunctionCallBlock;
  if (type === 'print') return PrintBlock;
  if (type.startsWith('compare-')) return ComparisonBlock;
  if (type.startsWith('math-')) return MathBlock;
  return null;
};
</script>

<template>
  <BaseBlock color="#FF6680" :label="$t('blocks.while.label')" :minimal="minimal">
    <BlockDropZone 
      v-if="!minimal"
      slotName="condition" 
      :parentBlockId="blockId!" 
      :block="condition"
      :acceptedBlockTypes="['expression']"
    >
      <component 
        v-if="condition" 
        :is="getConditionComponent(condition)" 
        v-bind="condition.type.startsWith('math-') || condition.type.startsWith('compare-') ? 
          { symbol: condition.type.split('-')[1], blockId: condition.id, config: condition.config, ...condition.config.slots, isExpression: true } : 
          (condition.type === 'boolean' || condition.type === 'true' || condition.type === 'false' || condition.type === 'equal' ? 
            { value: condition.type === 'true' || (condition.config && (condition.config.value === true || condition.config.value === 'true')), blockId: condition.id, config: condition.config, ...condition.config.slots, isExpression: true } : 
            { blockId: condition.id, config: condition.config, ...condition.config.slots, isExpression: true }
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
  width: 120px;
  outline: none;
}
</style>
