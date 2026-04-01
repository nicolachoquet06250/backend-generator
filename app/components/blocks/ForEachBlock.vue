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

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  list?: any;
  config?: any;
  children?: any[];
}>();

const { activeFunctionId, updateBlockConfig, functions } = useFunctions();
const { getBlockType } = useExpressionType();

// Support item (value) and optional key (index)
const itemVar = ref(props.config?.item || 'item');
const keyVar = ref(props.config?.key || '');

const parentLoopVars = inject('loopVars', ref<{ name: string, type: any }[]>([]));

const itemType = computed(() => {
  if (!props.list) return 'any';
  
  const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
  const blocks = currentFunction?.blocks || [];
  const listType = getBlockType(props.list, blocks);
  
  if (listType && typeof listType === 'object' && listType.kind === 'array') {
    return listType.itemType || listType.elementType || 'any';
  }
  return 'any';
});

const loopVars = computed(() => {
  const vars = [...parentLoopVars.value];
  if (itemVar.value) vars.push({ name: itemVar.value, type: itemType.value });
  if (keyVar.value) vars.push({ name: keyVar.value, type: 'number' });
  return vars;
});
provide('loopVars', loopVars);

watch(() => props.config?.item, (newVal) => {
  if (newVal !== undefined && newVal !== itemVar.value) {
    itemVar.value = newVal;
  }
});

watch(() => props.config?.key, (newVal) => {
  if (newVal !== undefined && newVal !== keyVar.value) {
    keyVar.value = newVal;
  }
});

watch(itemVar, (val) => {
  if (props.blockId && activeFunctionId.value && val !== props.config?.item) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { item: val });
  }
});

watch(keyVar, (val) => {
  if (props.blockId && activeFunctionId.value && val !== props.config?.key) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { key: val });
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
  <BaseBlock color="#FF6680" :label="$t('blocks.foreach.label')" :minimal="minimal">
    <div v-if="!minimal" style="display: inline-flex; gap: 6px; align-items: center;">
      <input class="block-input small" :placeholder="$t('blocks.foreach.item')" v-model="itemVar" />
      <span v-if="!minimal">,</span>
      <input class="block-input small" :placeholder="$t('blocks.foreach.key')" v-model="keyVar" />
    </div>
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
