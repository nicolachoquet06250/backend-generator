<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import { useFunctions } from '~/composables/useFunctions';

const props = defineProps<{
  value: boolean;
  minimal?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
}>();

const { activeFunctionId, updateBlockConfig, updateFunctionMetadata, findReturnParent } = useFunctions();

// On s'assure que la config est initialisée avec la valeur du bloc
onMounted(() => {
  if (props.blockId && props.config && props.config.value === undefined && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { value: props.value });
  }

  if (props.blockId && activeFunctionId.value) {
    const returnBlock = findReturnParent(activeFunctionId.value, props.blockId);
    if (returnBlock) {
      updateFunctionMetadata(activeFunctionId.value, { returnType: 'boolean' });
    }
  }
});
</script>

<template>
  <BaseBlock :color="value ? '#4C97FF' : '#5C5C5C'" :label="minimal ? (value ? 'true' : 'false') : 'Boolean'" :minimal="minimal" :blockId="blockId" :blockType="value ? 'true' : 'false'">
    <span v-if="!minimal" class="boolean-label">{{ value ? 'true' : 'false' }}</span>
  </BaseBlock>
</template>

<style scoped>
.boolean-label {
  font-weight: bold;
  color: white;
  padding: 0 4px;
}
</style>
