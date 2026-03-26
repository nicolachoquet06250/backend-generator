<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';

defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  value?: any;
}>();
</script>

<template>
  <BaseBlock 
    :label="$t('blocks.new_route.label')" 
    color="#FF6600" 
    :minimal="minimal"
    :block-id="blockId"
    block-type="new_route"
  >
    <div class="new-route-content">
      <div class="route-header">
        <span class="method">GET</span>
        <input 
          type="text" 
          :value="config?.path || '/'" 
          @input="$emit('update:config', { ...config, path: ($event.target as HTMLInputElement).value })"
          placeholder="/path"
          class="path-input"
        />
      </div>
      <div class="route-body">
        <BlockDropZone 
          slotName="value" 
          :parentBlockId="blockId!" 
          :block="value"
          :acceptedBlockTypes="['function']"
          filterContext="new_route"
        >
          <BlockRenderer v-if="value" :block="value" :parent-block-id="blockId" isExpression />
        </BlockDropZone>
      </div>
    </div>
  </BaseBlock>
</template>

<style scoped>
.new-route-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.route-header {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

.method {
  font-weight: bold;
  color: #fff;
}

.path-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 2px;
  padding: 2px 6px;
  font-size: 12px;
  color: #333;
}

.route-body {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  min-height: 40px;
}
</style>
