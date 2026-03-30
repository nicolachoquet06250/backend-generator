<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
}>();

const { functions, activeFunctionId } = useFunctions();

const currentFunction = computed(() => {
  return functions.value.find(f => f.id === activeFunctionId.value);
});

const structureId = computed(() => currentFunction.value?.structureId);
</script>

<template>
  <BaseBlock
    color="#FF8C1A"
    :label="$t('blocks.var.this')"
    :minimal="minimal"
    :blockId="blockId"
    blockType="this"
  />
</template>
