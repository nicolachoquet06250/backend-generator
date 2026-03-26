<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  children?: any[];
  value?: any;
}>();

const { activeFunctionId } = useFunctions();

const onBlockDragStart = (e: DragEvent, block: any) => {
  if (e.dataTransfer && activeFunctionId.value) {
    e.dataTransfer.setData('existingBlockId', block.id);
    e.dataTransfer.setData('blockType', block.type);
    e.dataTransfer.setData('sourceFunctionId', activeFunctionId.value);
    e.dataTransfer.effectAllowed = 'move';
  }
};

const acceptedBlockTypes = ['array', 'object', 'object_property', 'var', 'parameter'];
</script>

<template>
  <BaseBlock color="#FF5722" :label="$t('blocks.json.label')" :minimal="minimal" :blockId="blockId" blockType="json">
    <div v-if="!minimal" class="json-content">
      <div class="json-elements" v-if="children && children.length > 0">
        <BlockRenderer 
          v-for="child in children" 
          :key="child.id" 
          :block="child" 
          isExpression
          class="json-element"
          draggable="true"
          @dragstart.stop="onBlockDragStart($event, child)"
        />
      </div>
      <BlockDropZone
        slotName="value"
        :parentBlockId="blockId!"
        :block="value"
        :acceptedBlockTypes="acceptedBlockTypes"
        class="json-drop-zone"
      >
        <div class="json-slot-content" v-if="value">
          <BlockRenderer 
            :block="value" 
            isExpression
            class="json-element"
            draggable="true"
            @dragstart.stop="onBlockDragStart($event, value)"
          />
        </div>
      </BlockDropZone>
    </div>
  </BaseBlock>
</template>

<style scoped>
.json-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 150px;
  min-height: 50px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 8px;
}

.json-elements {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-self: stretch;
}

.json-element {
  cursor: grab;
}

.json-element:active {
  cursor: grabbing;
}

.json-drop-zone {
  min-width: 60px;
  align-self: stretch;
  min-height: 40px;
  border-style: dotted;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
