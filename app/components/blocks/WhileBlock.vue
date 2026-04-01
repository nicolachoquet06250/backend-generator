<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';
import StringBlock from '~/components/blocks/StringBlock.vue';
import NumberBlock from '~/components/blocks/NumberBlock.vue';
import ArrayBlock from '~/components/blocks/ArrayBlock.vue';
import ObjectBlock from '~/components/blocks/ObjectBlock.vue';
import ObjectPropertyBlock from '~/components/blocks/ObjectPropertyBlock.vue';
import MathBlock from '~/components/blocks/MathBlock.vue';
import VarBlock from '~/components/blocks/VarBlock.vue';

import BooleanBlock from '~/components/blocks/BooleanBlock.vue';
import ComparisonBlock from '~/components/blocks/ComparisonBlock.vue';
import FunctionCallBlock from '~/components/blocks/FunctionCallBlock.vue';
import PrintBlock from "~/components/blocks/PrintBlock.vue";
import ParameterBlock from '~/components/blocks/ParameterBlock.vue';

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
      :acceptedBlockTypes="['boolean']"
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

