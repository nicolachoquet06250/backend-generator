<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
defineProps<{
  minimal?: boolean;
  blockId?: string;
  children?: any[];
}>();

const inLoop = inject('inLoop', ref(false));
</script>

<template>
  <BaseBlock 
    :color="inLoop ? '#FF6680' : '#FF0000'" 
    :label="$t('blocks.break.label')" 
    :minimal="minimal" 
    :style="{ 
      opacity: inLoop ? 1 : 0.6,
      border: inLoop ? 'none' : '2px solid red'
    }"
    :title="!inLoop ? 'Ce bloc doit être à l\'intérieur d\'une boucle' : ''"
  />
</template>
