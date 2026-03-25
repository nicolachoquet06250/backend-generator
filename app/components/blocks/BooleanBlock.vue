<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import { useFunctions } from '~/composables/useFunctions';

const props = defineProps<{
  value: boolean;
  minimal?: boolean;
  blockId?: string;
  config?: any;
}>();

const { activeFunctionId, updateBlockConfig } = useFunctions();

// On s'assure que la config est initialisée avec la valeur du bloc
onMounted(() => {
  if (props.blockId && props.config && props.config.value === undefined && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { value: props.value });
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
