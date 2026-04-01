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
import ComparisonBlock from './ComparisonBlock.vue';
import FunctionCallBlock from './FunctionCallBlock.vue';
import PrintBlock from "~/components/blocks/PrintBlock.vue";

defineProps<{
  minimal?: boolean;
  blockId?: string;
  condition?: any;
}>();

const getConditionComponent = (block: any) => {
  if (!block) return null;
  const type = block.type;
  if (type === 'string') return StringBlock;
  if (type === 'number') return NumberBlock;
  if (type === 'array') return ArrayBlock;
  if (type === 'object') return ObjectBlock;
  if (type === 'object_property') return ObjectPropertyBlock;
  if (type === 'boolean' || type === 'true' || type === 'false' || type === 'equal') return BooleanBlock;
  if (type === 'var') return VarBlock;
  if (type === 'function') return FunctionCallBlock;
  if (type === 'print') return PrintBlock;
  if (type.startsWith('compare-')) return ComparisonBlock;
  if (type.startsWith('math-')) return MathBlock;
  return null;
};
</script>

<template>
  <BaseBlock color="#FFAB19" :label="$t('blocks.elseif.label')" :minimal="minimal">
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
    <span>{{ $t('blocks.elseif.then') }}</span>
    <template #bottom>
      <slot />
    </template>
  </BaseBlock>
</template>

