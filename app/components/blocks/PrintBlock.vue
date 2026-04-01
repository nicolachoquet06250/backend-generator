<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';
import StringBlock from '~/components/blocks/StringBlock.vue';
import NumberBlock from '~/components/blocks/NumberBlock.vue';
import VarBlock from '~/components/blocks/VarBlock.vue';
import MathBlock from '~/components/blocks/MathBlock.vue';
import ObjectBlock from '~/components/blocks/ObjectBlock.vue';
import ArrayBlock from '~/components/blocks/ArrayBlock.vue';
import ObjectPropertyBlock from '~/components/blocks/ObjectPropertyBlock.vue';
import BooleanBlock from '~/components/blocks/BooleanBlock.vue';
import ComparisonBlock from '~/components/blocks/ComparisonBlock.vue';
import FunctionCallBlock from '~/components/blocks/FunctionCallBlock.vue';
import EqualBlock from '~/components/blocks/EqualBlock.vue';
import ParameterBlock from '~/components/blocks/ParameterBlock.vue';

defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  value?: any;
  children?: any[];
}>();

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
  if (type === 'parameter') return ParameterBlock;
  if (type === 'boolean' || type === 'true' || type === 'false') return BooleanBlock;
  if (type === 'equal') return EqualBlock;
  if (type.startsWith('compare-')) return ComparisonBlock;
  if (type.startsWith('math-')) return MathBlock;
  return null;
};
</script>

<template>
  <BaseBlock color="#333333" :label="$t('blocks.print.label')" :minimal="minimal">
    <BlockDropZone
      v-if="!minimal"
      slotName="value" 
      :parentBlockId="blockId!"
      :block="value"
      :acceptedBlockTypes="['expression', 'function']"
    >
      <component 
        v-if="value" 
        :is="getOperandComponent(value)" 
        v-bind="value.type.startsWith('math-') || value.type.startsWith('compare-') ? { symbol: value.type.split('-')[1], blockId: value.id, config: value.config, ...value.config.slots, isExpression: true } : (value.type === 'boolean' || value.type === 'true' || value.type === 'false' || value.type === 'equal' ? { value: value.type === 'true' || (value.config && value.config.value === true), blockId: value.id, config: value.config, ...value.config.slots, isExpression: true } : { blockId: value.id, config: value.config, ...value.config.slots, isExpression: true })"
      />
    </BlockDropZone>
  </BaseBlock>
</template>

<style scoped>
</style>
