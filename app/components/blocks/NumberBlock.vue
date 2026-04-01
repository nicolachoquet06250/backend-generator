<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import { useFunctions } from '~/composables/useFunctions';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
}>();

const { activeFunctionId, updateBlockConfig, updateFunctionMetadata, findReturnParent } = useFunctions();

const localValue = ref<number | null>(null);

onMounted(() => {
  if (props.config && props.config.value !== undefined) {
    const n = Number(props.config.value);
    localValue.value = isNaN(n) ? null : n;
  }

  if (props.blockId && activeFunctionId.value) {
    const returnBlock = findReturnParent(activeFunctionId.value, props.blockId);
    if (returnBlock) {
      updateFunctionMetadata(activeFunctionId.value, { returnType: 'number' });
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
  <BaseBlock color="#5C5C5C" :label="$t('blocks.literal.number')" :minimal="minimal" :blockId="blockId" blockType="number">
    <input 
      v-if="!minimal" 
      class="block-input" 
      type="number" 
      placeholder="0" 
      v-model.number="localValue"
      @mouseenter="$emit('block-interaction-start')"
      @mouseleave="$emit('block-interaction-stop')"
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
  width: 60px;
}
</style>
