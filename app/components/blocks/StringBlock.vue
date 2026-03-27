<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import { useFunctions } from '~/composables/useFunctions';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
}>();

const { activeFunctionId, updateBlockConfig, updateFunctionMetadata, findReturnParent } = useFunctions();

// Initialiser la valeur depuis la config si disponible
const localValue = ref<string>('');

onMounted(() => {
  if (props.config && props.config.value !== undefined) {
    localValue.value = String(props.config.value ?? '');
  }

  if (props.blockId && activeFunctionId.value) {
    const returnBlock = findReturnParent(activeFunctionId.value, props.blockId);
    if (returnBlock) {
      updateFunctionMetadata(activeFunctionId.value, { returnType: 'string' });
    }
  }
});

watch(localValue, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { value: val });
  }
});
</script>

<template>
  <BaseBlock color="#9966FF" :label="$t('blocks.literal.string')" :minimal="minimal" :blockId="blockId" blockType="string">
    <input 
      v-if="!minimal" 
      class="block-input" 
      :placeholder="$t('blocks.var.placeholder_value')" 
      v-model="localValue"
      type="text"
    />
  </BaseBlock>
</template>

<style scoped>
.block-input {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 0.9em;
  width: 100px;
}
</style>
