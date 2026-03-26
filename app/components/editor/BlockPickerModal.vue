<script setup lang="ts">
import AppModal from '../common/AppModal.vue';
import BlockPickerDesktop from './BlockPickerDesktop.vue';
import BlockPickerMobile from './BlockPickerMobile.vue';
import { useDevice } from '~/composables/useDevice';

const props = defineProps<{
  show: boolean;
  acceptedTypes?: string[];
}>();

const emit = defineEmits(['close', 'select']);

const { isMobile } = useDevice();

const onSelect = (type: string) => {
  emit('select', type);
  emit('close');
};
</script>

<template>
  <AppModal :show="show" :title="$t('sections.blocks')" @close="emit('close')">
    <div class="block-picker-container" @click.stop>
      <BlockPickerMobile 
        v-if="isMobile" 
        :show="show" 
        :acceptedTypes="acceptedTypes" 
        @select="onSelect" 
        @close="emit('close')"
      />
      <BlockPickerDesktop 
        v-else 
        :show="show" 
        :acceptedTypes="acceptedTypes" 
        @select="onSelect" 
        @close="emit('close')"
      />
    </div>

    <template #actions>
      <span/>
    </template>
  </AppModal>
</template>

<style scoped>
.block-picker-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
