<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
defineProps<{
  minimal?: boolean;
  blockId?: string;
  children?: any[];
}>();
</script>

<template>
  <BaseBlock color="#FFAB19" :label="$t('blocks.else.label')" :minimal="minimal">
    <template #bottom>
      <slot />
    </template>
  </BaseBlock>
</template>
