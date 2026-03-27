<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';

defineProps<{
  minimal?: boolean;
}>();
</script>

<template>
  <BaseBlock 
    :label="$t('blocks.end.label')"
    color="#FF4C4C" 
    :minimal="minimal" 
    :draggable="false"
    no-hover
  />
</template>
