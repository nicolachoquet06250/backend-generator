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

import ComparisonBlock from '~/components/blocks/ComparisonBlock.vue';
import FunctionCallBlock from '~/components/blocks/FunctionCallBlock.vue';
import BooleanBlock from '~/components/blocks/BooleanBlock.vue';
import PrintBlock from "~/components/blocks/PrintBlock.vue";

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  from?: any;
  to?: any;
  config?: any;
  children?: any[];
}>();

defineEmits(['block-interaction-start', 'block-interaction-stop']);

const { activeFunctionId, updateBlockConfig } = useFunctions();

const loopVar = ref(props.config?.loopVar || 'i');

const parentLoopVars = inject('loopVars', ref<{ name: string, type: any }[]>([]));
const loopVars = computed(() => {
  const vars = [...parentLoopVars.value];
  if (loopVar.value) vars.push({ name: loopVar.value, type: 'number' });
  return vars;
});
provide('loopVars', loopVars);

watch(() => props.config?.loopVar, (newVal) => {
  if (newVal !== undefined && newVal !== loopVar.value) {
    loopVar.value = newVal;
  }
});

watch(loopVar, (val) => {
  if (props.blockId && activeFunctionId.value && val !== props.config?.loopVar) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { loopVar: val });
  }
});

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
    <input 
      class="block-input small" 
      placeholder="i" 
      v-if="!minimal" 
      v-model="loopVar"
      @mouseenter="$emit('block-interaction-start')"
      @mouseleave="$emit('block-interaction-stop')"
    />
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
