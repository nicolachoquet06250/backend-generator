<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';
import BlockRenderer from '~/components/blocks/BlockRenderer.vue';

defineProps<{
  minimal?: boolean;
  blockId?: string;
  condition?: any;
}>();
</script>

<template>
  <BaseBlock color="#FFAB19" :label="$t('blocks.elseif.label')" :minimal="minimal">
    <BlockDropZone 
      v-if="!minimal"
      slotName="condition" 
      :parentBlockId="blockId!" 
      :block="condition"
      :acceptedBlockTypes="['boolean']"
    >
      <BlockRenderer v-if="condition" :block="condition" isExpression />
    </BlockDropZone>
    <span>{{ $t('blocks.elseif.then') }}</span>
    <template #bottom>
      <slot />
    </template>
  </BaseBlock>
</template>

