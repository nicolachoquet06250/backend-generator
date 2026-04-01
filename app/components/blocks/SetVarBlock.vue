<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';
import VarBlock from '~/components/blocks/VarBlock.vue';
import BlockRenderer from '~/components/blocks/BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  variable?: any;
  value?: any;
  children?: any[];
}>();

const { functions, activeFunctionId, updateBlockConfig } = useFunctions();
const { findVarType } = useExpressionType();

// Trouver le type de la variable sélectionnée
const targetVariableType = computed(() => {
  if (!props.variable || !props.variable.config?.selectedVar) return 'any';

  const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
  if (!currentFunction) return 'any';

  const typeConfig = findVarType(currentFunction.blocks, props.variable.config.selectedVar);
  return (typeConfig && typeof typeConfig === 'object' && typeConfig.kind) ? typeConfig.kind : (typeConfig || 'any');
});

const acceptedValueTypes = computed(() => {
  const type = targetVariableType.value;
  if (type === 'number') return ['number', 'math-op', 'var', 'function', 'ternary'];
  if (type === 'string') return ['string', 'var', 'function', 'ternary'];
  if (type === 'boolean') return ['boolean', 'var', 'equal', 'compare-op', 'function', 'ternary'];
  if (type === 'array') return ['array', 'var', 'function', 'ternary'];
  if (type === 'object') return ['object', 'var', 'function', 'ternary'];
  return ['expression'];
});

// Lorsqu'un ArrayBlock ou ObjectBlock est affecté, on lui passe son elementType ou structId
watch(() => props.value, (newVal) => {
  if (activeFunctionId.value && props.blockId) {
    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    if (!currentFunction || !props.variable?.config?.selectedVar) return;

    const targetTypeConfig = findVarType(currentFunction.blocks, props.variable.config.selectedVar);

    if (newVal?.type === 'array' && targetTypeConfig?.kind === 'array') {
      const itemType = targetTypeConfig.itemType || targetTypeConfig.elementType;
      if (itemType && JSON.stringify(newVal.config?.itemType) !== JSON.stringify(itemType)) {
        updateBlockConfig(activeFunctionId.value, newVal.id, { itemType });
      }
    } else if (newVal?.type === 'object' && targetTypeConfig?.kind === 'object') {
      const structId = targetTypeConfig.structId;
      if (structId && newVal.config?.structId !== structId) {
        updateBlockConfig(activeFunctionId.value, newVal.id, { structId });
      }
    }
  }
}, { immediate: true, deep: true });

</script>

<template>
  <BaseBlock color="#FF8C1A" :label="$t('blocks.assign.label')" :minimal="minimal">
    <div class="assign-block" v-if="!minimal">
      <BlockDropZone 
        slotName="variable" 
        :parentBlockId="blockId!" 
        :block="variable"
        :acceptedBlockTypes="['var']"
      >
        <component 
          v-if="variable" 
          :is="VarBlock" 
          v-bind="{ blockId: variable.id, config: variable.config, ...variable.config.slots, isExpression: true }"
        />
      </BlockDropZone>

      <span class="assign-sep">=</span>

      <BlockDropZone 
        slotName="value" 
        :parentBlockId="blockId!" 
        :block="value"
        :acceptedBlockTypes="acceptedValueTypes"
      >
        <BlockRenderer v-if="value" :block="value" isExpression />
      </BlockDropZone>
    </div>
  </BaseBlock>
</template>

<style scoped>
.assign-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.assign-sep {
  font-weight: bold;
}
</style>
