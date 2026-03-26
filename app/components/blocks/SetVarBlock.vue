<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import VarBlock from './VarBlock.vue';
import BlockRenderer from './BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  variable?: any;
  value?: any;
  children?: any[];
}>();

const { functions, activeFunctionId, updateBlockConfig } = useFunctions();

// Trouver le type de la variable sélectionnée
const targetVariableType = computed(() => {
  if (!props.variable || !props.variable.config?.selectedVar) return 'any';

  const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
  if (!currentFunction) return 'any';

  // Chercher le bloc 'var' qui a déclaré cette variable pour obtenir son type
  let foundType = 'any';
  const findVarDeclaration = (blocks: any[]) => {
    for (const block of blocks) {
      if (block.type === 'var' && block.config?.name && block.config?.name === props.variable.config.selectedVar) {
        const tc = block.config.typeConfig;
        foundType = (tc && typeof tc === 'object' && tc.kind) ? tc.kind : (tc || 'any');
        return true;
      }
      if (block.children && findVarDeclaration(block.children)) return true;
      if (block.config?.slots) {
        for (const s of Object.values(block.config.slots)) {
          if (s && findVarDeclaration([s as any])) return true;
        }
      }
    }
    return false;
  };

  findVarDeclaration(currentFunction.blocks);
  return foundType;
});

const acceptedValueTypes = computed(() => {
  const type = targetVariableType.value;
  if (type === 'number') return ['number', 'math-op', 'var', 'function'];
  if (type === 'string') return ['string', 'var', 'function'];
  if (type === 'boolean') return ['boolean', 'var', 'equal', 'compare-op', 'function'];
  if (type === 'array') return ['array', 'var', 'function'];
  if (type === 'object') return ['object', 'var', 'function'];
  return ['expression'];
});

// Lorsqu'un ArrayBlock ou ObjectBlock est affecté, on lui passe son elementType ou structId
watch(() => props.value, (newVal) => {
  if (activeFunctionId.value && props.blockId) {
    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    if (!currentFunction || !props.variable?.config?.selectedVar) return;

    let targetTypeConfig: any = null;
    const findVarDeclaration = (blocks: any[]) => {
      for (const block of blocks) {
        if (block.type === 'var' && block.config?.name === props.variable.config.selectedVar) {
          targetTypeConfig = block.config.typeConfig;
          return true;
        }
        if (block.children && findVarDeclaration(block.children)) return true;
        if (block.config?.slots) {
          for (const s of Object.values(block.config.slots)) {
            if (s && findVarDeclaration([s as any])) return true;
          }
        }
      }
      return false;
    };
    findVarDeclaration(currentFunction.blocks);

    if (newVal?.type === 'array' && targetTypeConfig?.kind === 'array') {
      const elementType = targetTypeConfig.elementType;
      if (elementType && JSON.stringify(newVal.config?.elementType) !== JSON.stringify(elementType)) {
        updateBlockConfig(activeFunctionId.value, newVal.id, { elementType });
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
