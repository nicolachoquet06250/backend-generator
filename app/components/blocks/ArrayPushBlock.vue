<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';
import BlockRenderer from '~/components/blocks/BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  array?: any;
  value?: any;
  children?: any[];
}>();

const { structures } = useDataStructures();
const { activeFunctionId, updateBlockConfig, addBlockToFunction, functions } = useFunctions();
const { findVarType } = useExpressionType();

const acceptedArrayTypes = ['var', 'parameter', 'array', 'function'];
const acceptedValueTypes = computed(() => {
  if (props.array?.type === 'var') {
    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    if (currentFunction) {
      const varName = props.array.config?.selectedVar || props.array.config?.name;
      const typeConfig = findVarType(currentFunction.blocks, varName);
      if (typeConfig?.kind === 'array') {
        const elementType = typeConfig.elementType;
        const kind = typeof elementType === 'string' ? elementType : elementType.kind;
        if (kind === 'string') return ['string', 'var', 'function', 'ternary'];
        if (kind === 'number') return ['number', 'math-op', 'var', 'function', 'ternary'];
        if (kind === 'boolean') return ['boolean', 'var', 'equal', 'compare-op', 'function', 'ternary'];
        if (kind === 'array') return ['array', 'var', 'function', 'ternary'];
        if (kind === 'object') return ['object', 'var', 'function', 'ternary'];
      }
    }
  }
  return ['expression'];
});

// Lorsqu'un ArrayBlock est poussé dans un tableau, on lui passe son elementType
watch(() => props.value, (newVal) => {
  if (newVal?.type === 'array' && activeFunctionId.value && props.blockId) {
     const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
     if (!currentFunction) return;

     const varName = props.array?.config?.selectedVar || props.array?.config?.name;
     if (!varName) return;

      const typeConfig = findVarType(currentFunction.blocks, varName);
      if (typeConfig?.kind === 'array') {
        const elementType = typeConfig.elementType;
        if (elementType && elementType.kind === 'array' && JSON.stringify(newVal.config?.elementType) !== JSON.stringify(elementType.elementType)) {
          updateBlockConfig(activeFunctionId.value, newVal.id, { elementType: elementType.elementType });
        }
      }
  }
}, { immediate: true });

// surveiller l'emplacement 'array' pour ajouter un bloc par défaut dans 'value'
watch(() => props.array, (newArray, oldArray) => {
  if (newArray && !oldArray && !props.value && props.blockId && activeFunctionId.value) {
    if (newArray.type === 'var') {
      const varName = newArray.config?.selectedVar || newArray.config?.name;
      if (!varName) return;

      // Chercher la déclaration de la variable
      const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
      if (!currentFunction) return;

      const typeConfig = findVarType(currentFunction.blocks, varName);
      if (typeConfig) {
        let kind = typeof typeConfig === 'string' ? typeConfig : typeConfig.kind;

        // Si la variable est "any", ne rien faire
        if (kind === 'any' || !kind) return;

        // On drop un bloc litéral correspondant au type
        let defaultBlockType = 'string';
        if (kind === 'number') {
          defaultBlockType = 'number';
        } else if (kind === 'boolean') {
          defaultBlockType = 'true';
        } else if (kind === 'array') {
          defaultBlockType = 'array';
        } else if (kind === 'object') {
          defaultBlockType = 'object';
        }

        addBlockToFunction(activeFunctionId.value, defaultBlockType, props.blockId, 'value');
      }
    }
  }
});

</script>

<template>
  <BaseBlock color="#FF661A" :label="$t('blocks.array_push.label')" :minimal="minimal">
    <div class="array-push-block" v-if="!minimal">
      <BlockDropZone 
        slotName="array" 
        :parentBlockId="blockId!" 
        :block="array"
        :acceptedBlockTypes="acceptedArrayTypes"
      >
        <BlockRenderer v-if="array" :block="array" isExpression />
      </BlockDropZone>

      <span class="sep">{{ $t('blocks.array_push.value_label') }}</span>

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
.array-push-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sep {
  font-weight: bold;
}
</style>
