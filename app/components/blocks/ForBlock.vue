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
  from?: any;
  to?: any;
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
  <BaseBlock color="#FF6680" :label="$t('blocks.for.label')" :minimal="minimal">
    <input class="block-input small" placeholder="i" v-if="!minimal" />
    <span>{{ $t('blocks.for.from') }}</span>
    <BlockDropZone 
      v-if="!minimal"
      slotName="from" 
      :parentBlockId="blockId!" 
      :block="from"
      :acceptedBlockTypes="['expression']"
    >
      <component 
        v-if="from" 
        :is="getOperandComponent(from)" 
        v-bind="from.type.startsWith('math-') || from.type.startsWith('compare-') ? 
          { symbol: from.type.split('-')[1], blockId: from.id, config: from.config, ...from.config.slots, isExpression: true } : 
          (from.type === 'boolean' || from.type === 'true' || from.type === 'false' || from.type === 'equal' ? 
            { value: from.type === 'true' || (from.config && (from.config.value === true || from.config.value === 'true')), blockId: from.id, config: from.config, ...from.config.slots, isExpression: true } : 
            { blockId: from.id, config: from.config, ...from.config.slots, isExpression: true }
          )"
      />
    </BlockDropZone>
    <span>{{ $t('blocks.for.to') }}</span>
    <BlockDropZone 
      v-if="!minimal"
      slotName="to" 
      :parentBlockId="blockId!" 
      :block="to"
      :acceptedBlockTypes="['expression']"
    >
      <component 
        v-if="to" 
        :is="getOperandComponent(to)" 
        v-bind="to.type.startsWith('math-') || to.type.startsWith('compare-') ? 
          { symbol: to.type.split('-')[1], blockId: to.id, config: to.config, ...to.config.slots, isExpression: true } : 
          (to.type === 'boolean' || to.type === 'true' || to.type === 'false' || to.type === 'equal' ? 
            { value: to.type === 'true' || (to.config && (to.config.value === true || to.config.value === 'true')), blockId: to.id, config: to.config, ...to.config.slots, isExpression: true } : 
            { blockId: to.id, config: to.config, ...to.config.slots, isExpression: true }
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
  width: 40px;
}
</style>
