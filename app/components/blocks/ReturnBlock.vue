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
import ComparisonBlock from './ComparisonBlock.vue';
import FunctionCallBlock from './FunctionCallBlock.vue';
import ParameterBlock from './ParameterBlock.vue';
import PrintBlock from "~/components/blocks/PrintBlock.vue";

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
}>();

const { functions, activeFunctionId, updateFunctionMetadata } = useFunctions();
const { formatType } = useTypeFormatter();

const activeFunction = computed(() => functions.value.find(f => f.id === activeFunctionId.value));

const returnType = computed(() => activeFunction.value?.metadata?.returnType || 'any');

const getValueComponent = (block: any) => {
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
  <BaseBlock color="#AF5198" :minimal="minimal">
    <template #label>
      <div class="return-label-container">
        <span class="block-label">{{ $t('blocks.return.label') }}</span>
        <span class="return-type-display">({{ formatType(returnType) }})</span>
      </div>
    </template>
    <template v-if="!minimal">
      <BlockDropZone 
        :parentBlockId="blockId!" 
        slotName="value"
        :acceptedBlockTypes="['expression']"
        :block="config?.slots?.value"
      >
        <component 
          v-if="config?.slots?.value" 
          :is="getValueComponent(config.slots.value)" 
          v-bind="config.slots.value.type.startsWith('math-') || config.slots.value.type.startsWith('compare-') ? 
            { symbol: config.slots.value.type.split('-')[1], blockId: config.slots.value.id, config: config.slots.value.config, ...config.slots.value.config.slots, isExpression: true } : 
            (config.slots.value.type === 'boolean' || config.slots.value.type === 'true' || config.slots.value.type === 'false' || config.slots.value.type === 'equal' ? 
              { value: config.slots.value.type === 'true' || (config.slots.value.config && (config.slots.value.config.value === true || config.slots.value.config.value === 'true')), blockId: config.slots.value.id, config: config.slots.value.config, ...config.slots.value.config.slots, isExpression: true } : 
              { blockId: config.slots.value.id, config: config.slots.value.config, ...config.slots.value.config.slots, isExpression: true }
            )"
        />
      </BlockDropZone>
    </template>
  </BaseBlock>
</template>

<style scoped>
.return-label-container {
  display: flex;
  align-items: center;
  gap: 8px;
}
.block-label {
  white-space: nowrap;
}
.return-type-display {
  color: white;
  opacity: 0.8;
  font-size: 0.9em;
}
</style>
