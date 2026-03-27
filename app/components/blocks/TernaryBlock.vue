<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';
import { useFunctions } from '~/composables/useFunctions';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  condition?: any;
  isTrue?: any;
  isFalse?: any;
  config?: any;
}>();

const { activeFunctionId, getBlockById, updateFunctionMetadata, findReturnParent } = useFunctions();

const getReturnType = (block: any): string | null => {
  if (!block) return null;
  const type = block.type;
  if (type === 'string' || type === 'number' || type === 'array' || type === 'object') return type;
  if (type === 'true' || type === 'false' || type === 'boolean' || type === 'equal' || type.startsWith('compare-')) return 'boolean';
  if (type.startsWith('math-')) return 'number';
  if (type === 'var' || type === 'parameter') return block.config?.variableType || null;
  if (type === 'function') return block.config?.returnType || null;
  if (type === 'ternary') {
    return getReturnType(block.config?.slots?.isTrue) || 'any';
  }
  return null;
};

const ternaryReturnType = computed(() => {
  if (!activeFunctionId.value || !props.blockId) return 'any';
  const trueType = getReturnType(props.isTrue);
  const falseType = getReturnType(props.isFalse);
  
  if (trueType && falseType && trueType === falseType) {
    return trueType;
  }
  return 'any';
});

watch([() => props.isTrue, () => props.isFalse], () => {
  const newType = ternaryReturnType.value;
  if (activeFunctionId.value && props.blockId) {
    const returnBlock = findReturnParent(activeFunctionId.value, props.blockId);
    if (returnBlock) {
      updateFunctionMetadata(activeFunctionId.value, { returnType: newType || 'any' });
    }
  }
}, { immediate: true });

</script>

<template>
  <BaseBlock color="#FFAB19" :label="$t('blocks.ternary.label')" :minimal="minimal" :blockId="blockId" blockType="ternary">
    <div v-if="!minimal" class="ternary-block">
      <BlockDropZone 
        slotName="condition" 
        :parentBlockId="blockId!" 
        :block="condition"
        :acceptedBlockTypes="['boolean', 'true', 'false', 'equal', 'compare-']"
      >
        <BlockRenderer v-if="condition" :block="condition" isExpression />
      </BlockDropZone>
      
      <span class="ternary-separator">?</span>
      
      <BlockDropZone 
        slotName="isTrue" 
        :parentBlockId="blockId!" 
        :block="isTrue"
        :acceptedBlockTypes="['expression']"
      >
        <BlockRenderer v-if="isTrue" :block="isTrue" isExpression />
      </BlockDropZone>
      
      <span class="ternary-separator">:</span>
      
      <BlockDropZone 
        slotName="isFalse" 
        :parentBlockId="blockId!" 
        :block="isFalse"
        :acceptedBlockTypes="['expression']"
      >
        <BlockRenderer v-if="isFalse" :block="isFalse" isExpression />
      </BlockDropZone>
    </div>
  </BaseBlock>
</template>

<style scoped>
.ternary-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ternary-separator {
  font-weight: bold;
  font-size: 1.2em;
  color: white;
}
</style>
