<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import VarBlock from './VarBlock.vue';
import StringBlock from './StringBlock.vue';
import NumberBlock from './NumberBlock.vue';
import ArrayBlock from './ArrayBlock.vue';
import ObjectBlock from './ObjectBlock.vue';
import ObjectPropertyBlock from './ObjectPropertyBlock.vue';
import PrintBlock from './PrintBlock.vue';
import MathBlock from "~/components/blocks/MathBlock.vue";

import FunctionCallBlock from './FunctionCallBlock.vue';
import ParameterBlock from './ParameterBlock.vue';
import ComparisonBlock from "~/components/blocks/ComparisonBlock.vue";
import BooleanBlock from "~/components/blocks/BooleanBlock.vue";

const props = defineProps<{
  symbol: string;
  minimal?: boolean;
  blockId?: string;
  left?: any;
  right?: any;
  isExpression?: boolean;
}>();

const { activeFunctionId, addBlockToFunction } = useFunctions();

const opLabel = computed(() => {
  switch (props.symbol) {
    case '+': return 'add';
    case '-': return 'sub';
    case '*': return 'mul';
    case '/': return 'div';
    case '%': return 'mod';
    default: return '';
  }
});

const getOperandComponent = (block: any) => {
  if (!block) return null;
  const type = block.type;
  if (type === 'string') return StringBlock;
  if (type === 'number') return NumberBlock;
  if (type === 'array') return ArrayBlock;
  if (type === 'object') return ObjectBlock;
  if (type === 'object_property') return ObjectPropertyBlock;
  if (type === 'var') return VarBlock;
  if (type === 'parameter') return ParameterBlock;
  if (type === 'function') return FunctionCallBlock;
  if (type === 'print') return PrintBlock;
  if (type === 'equal' || type === 'boolean' || type === 'true' || type === 'false') return BooleanBlock;
  if (type.startsWith('compare-')) return ComparisonBlock;
  if (type.startsWith('math-')) return MathBlock;
  return null;
};
</script>

<template>
  <BaseBlock color="#59C059" :minimal="minimal" :label="minimal ? $t(`blocks.math.${opLabel}`) : undefined" :blockId="blockId" :blockType="'math-' + symbol">
    <div class="math-block" v-if="!minimal">
      <BlockDropZone 
        slotName="left" 
        :parentBlockId="blockId!" 
        :block="left"
        :acceptedBlockTypes="['expression']"
      >
        <component 
          v-if="left" 
          :is="getOperandComponent(left)" 
          v-bind="left.type.startsWith('math-') || left.type.startsWith('compare-') ? 
            { symbol: left.type.split('-')[1], blockId: left.id, config: left.config, ...left.config.slots, isExpression: true } : 
            (left.type === 'boolean' || left.type === 'true' || left.type === 'false' || left.type === 'equal' ? 
              { value: left.type === 'true' || (left.config && (left.config.value === true || left.config.value === 'true')), blockId: left.id, config: left.config, ...left.config.slots, isExpression: true } : 
              { blockId: left.id, config: left.config, ...left.config.slots, isExpression: true }
            )"
        />
      </BlockDropZone>

      <span>{{ symbol }}</span>

      <BlockDropZone 
        slotName="right" 
        :parentBlockId="blockId!" 
        :block="right"
        :acceptedBlockTypes="['expression']"
      >
        <component 
          v-if="right" 
          :is="getOperandComponent(right)" 
          v-bind="right.type.startsWith('math-') || right.type.startsWith('compare-') ? 
            { symbol: right.type.split('-')[1], blockId: right.id, config: right.config, ...right.config.slots, isExpression: true } : 
            (right.type === 'boolean' || right.type === 'true' || right.type === 'false' || right.type === 'equal' ? 
              { value: right.type === 'true' || (right.config && (right.config.value === true || right.config.value === 'true')), blockId: right.id, config: right.config, ...right.config.slots, isExpression: true } : 
              { blockId: right.id, config: right.config, ...right.config.slots, isExpression: true }
            )"
        />
      </BlockDropZone>
    </div>
  </BaseBlock>
</template>

<style scoped>
.math-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.operand-slot {
  min-width: 40px;
  min-height: 30px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
}
.placeholder {
  opacity: 0.5;
  font-size: 0.8em;
}
</style>
