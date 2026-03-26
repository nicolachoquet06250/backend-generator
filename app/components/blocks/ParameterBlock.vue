<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import TypeSelector from './TypeSelector.vue';

const props = defineProps<{
  minimal?: boolean;
  isExpression?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
}>();

const { functions, activeFunctionId, updateBlockConfig } = useFunctions();

const currentFunction = computed(() => {
  return functions.value.find(f => f.id === activeFunctionId.value);
});

// Récupérer tous les paramètres déclarés dans la fonction courante
const availableParameters = computed(() => {
  if (!currentFunction.value) return [];
  
  const params: string[] = [];
  const findParams = (blocks: any[]) => {
    blocks.forEach(block => {
      // Un bloc 'parameter' au niveau racine (ou dans children) est considéré comme une déclaration
      // si il a un nom défini dans sa config
      if (block.type === 'parameter' && block.config?.name) {
        params.push(block.config.name);
      }
      if (block.children) findParams(block.children);
      if (block.config?.slots) {
        Object.values(block.config.slots).forEach((slotBlock: any) => {
          if (slotBlock) findParams([slotBlock]);
        });
      }
    });
  };
  findParams(currentFunction.value.blocks);
  return [...new Set(params)]; // Unicité
});

const paramName = ref(props.config?.name || '');
const selectedParam = ref(props.config?.selectedParam || '');
const typeConfig = ref<any>(props.config?.type || 'any');

watch(paramName, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { name: val });
  }
});

watch(selectedParam, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { selectedParam: val });
  }
});

watch(typeConfig, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { type: val });
  }
}, { deep: true });
</script>

<template>
  <BaseBlock color="#FF8C1A" :label="isExpression ? $t('blocks.parameter.label_choice') : $t('blocks.parameter.label')" :minimal="minimal">
    <template v-if="isExpression && !minimal">
      <select v-model="selectedParam" class="block-select">
        <option value="" disabled>{{ $t('blocks.parameter.select_param') }}</option>
        <option v-for="p in availableParameters" :key="p" :value="p">{{ p }}</option>
      </select>
    </template>
    <template v-else-if="!minimal">
      <input 
        v-model="paramName" 
        class="block-input" 
        :placeholder="$t('blocks.parameter.placeholder_name')" 
      />
      <TypeSelector v-model="typeConfig" />
    </template>
  </BaseBlock>
</template>

<style scoped>
.block-input, .block-select {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 0.9em;
}
.block-input {
  width: 80px;
}
.block-select {
  cursor: pointer;
  min-width: 80px;
}
</style>
