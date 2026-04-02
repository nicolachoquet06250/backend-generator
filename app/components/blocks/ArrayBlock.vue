<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';

import BlockRenderer from '~/components/blocks/BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
}>();

const { activeFunctionId, addBlockToFunction, updateFunctionMetadata, findReturnParent } = useFunctions();

const onBlockDragStart = (e: DragEvent, block: any) => {
  if (e.dataTransfer && activeFunctionId.value) {
    e.dataTransfer.setData('existingBlockId', block.id);
    e.dataTransfer.setData('blockType', block.type);
    e.dataTransfer.setData('sourceFunctionId', activeFunctionId.value);
    e.dataTransfer.effectAllowed = 'move';
  }
};

const elementType = computed(() => {
  if (props.config?.itemType) return props.config.itemType;
  if (props.config?.elementType) return props.config.elementType;
  return null;
});

const { structures } = useDataStructures();

const structId = computed(() => {
  if (typeof elementType.value === 'object' && elementType.value?.structId) {
    return elementType.value.structId;
  }
  return null;
});

const selectedStructure = computed(() => {
  if (!structId.value) return null;
  return structures.value.find(s => s.id === structId.value);
});

const kind = computed(() => {
  if (!elementType.value) return null;
  return typeof elementType.value === 'string' ? elementType.value : elementType.value.kind;
});

// État local pour le nouvel élément en cours de saisie
const newItemValues = ref<any>({});

const resetNewItem = () => {
  newItemValues.value = {};
  if (selectedStructure.value) {
    selectedStructure.value.fields.forEach(f => {
      newItemValues.value[f.name] = f.defaultValue;
    });
  } else if (kind.value === 'string') {
    newItemValues.value = '';
  } else if (kind.value === 'number') {
    newItemValues.value = 0;
  } else if (kind.value === 'boolean') {
    newItemValues.value = false;
  }
};

// Initialiser
onMounted(() => {
  resetNewItem();

  if (props.blockId && activeFunctionId.value) {
    const returnBlock = findReturnParent(activeFunctionId.value, props.blockId);
    if (returnBlock) {
      updateFunctionMetadata(activeFunctionId.value, { 
        returnType: elementType.value ? { kind: 'array', itemType: elementType.value } : 'array' 
      });
    }
  }
});

const addNewItem = () => {
  if (!activeFunctionId.value || !props.blockId) return;

  let blockType = kind.value || 'string';
  let initialConfig: any = {};

  if (selectedStructure.value) {
    blockType = 'object';
    initialConfig = {
      structId: structId.value,
      values: { ...newItemValues.value }
    };
  } else if (kind.value === 'string' || kind.value === 'number' || kind.value === 'boolean') {
    initialConfig = { value: newItemValues.value };
  }

  addBlockToFunction(
    activeFunctionId.value,
    blockType,
    props.blockId,
    undefined, // Pas de slotName car on ajoute à children
    undefined,
    props.children?.length ? props.children[props.children.length - 1].id : undefined,
    initialConfig
  );

  resetNewItem();
};

const getFieldType = (field: any) => {
  if (typeof field.type === 'string') return field.type;
  return field.type.kind;
};

// On définit les types acceptés basés sur l'elementType
const acceptedBlockTypes = computed(() => {
  if (!elementType.value) return ['expression'];
  
  const kind = typeof elementType.value === 'string' ? elementType.value : elementType.value.kind;
  if (kind === 'string') return ['string', 'var', 'function'];
  if (kind === 'number') return ['number', 'var', 'math-op', 'function'];
  if (kind === 'boolean') return ['boolean', 'var', 'equal', 'compare-op', 'function'];
  if (kind === 'array') return ['array', 'var', 'function'];
  if (kind === 'object') return ['object', 'var', 'function'];
  
  return ['expression'];
});

</script>

<template>
  <BaseBlock color="#FF661A" :label="$t('blocks.literal.array')" :minimal="minimal" :blockId="blockId" blockType="array">
    <div v-if="!minimal" class="array-content">
      <div class="array-elements">
        <BlockRenderer 
          v-for="child in children" 
          :key="child.id" 
          :block="child" 
          isExpression
          class="array-element"
          draggable
          @dragstart.stop="onBlockDragStart($event, child)"
        />
      </div>
      <div v-if="selectedStructure" class="array-add-row object-row-vertical">
        <div v-for="field in selectedStructure.fields" :key="field.id" class="field-row">
          <span class="field-label">{{ field.name }}:</span>
          <input 
            v-if="getFieldType(field) === 'string'"
            type="text"
            class="field-input"
            v-model="newItemValues[field.name]"
            @keyup.enter="addNewItem"
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          />
          <input 
            v-else-if="getFieldType(field) === 'number'"
            type="number"
            class="field-input small"
            v-model="newItemValues[field.name]"
            @keyup.enter="addNewItem"
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          />
          <input 
            v-else-if="getFieldType(field) === 'boolean'"
            type="checkbox"
            v-model="newItemValues[field.name]"
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          />
        </div>
        <div class="add-actions">
          <button 
            class="add-button" 
            @click="addNewItem"
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          >+</button>
          <BlockDropZone 
            slotName="" 
            :parentBlockId="blockId!" 
            :acceptedBlockTypes="acceptedBlockTypes"
            class="inline-drop-zone"
          />
        </div>
      </div>
      <div v-else-if="kind === 'string' || kind === 'number' || kind === 'boolean'" class="array-add-row">
        <input 
          v-if="kind === 'string'"
          type="text"
          class="field-input"
          v-model="newItemValues"
          placeholder="..."
          @keyup.enter="addNewItem"
          @mouseenter="$emit('block-interaction-start')"
          @mouseleave="$emit('block-interaction-stop')"
        />
        <input 
          v-else-if="kind === 'number'"
          type="number"
          class="field-input small"
          v-model="newItemValues"
          @keyup.enter="addNewItem"
          @mouseenter="$emit('block-interaction-start')"
          @mouseleave="$emit('block-interaction-stop')"
        />
        <input 
          v-else-if="kind === 'boolean'"
          type="checkbox"
          v-model="newItemValues"
          @mouseenter="$emit('block-interaction-start')"
          @mouseleave="$emit('block-interaction-stop')"
        />
        <button 
          class="add-button" 
          @click="addNewItem"
          @mouseenter="$emit('block-interaction-start')"
          @mouseleave="$emit('block-interaction-stop')"
        >+</button>
        <BlockDropZone 
          slotName="" 
          :parentBlockId="blockId!" 
          :acceptedBlockTypes="acceptedBlockTypes"
          class="inline-drop-zone"
        />
      </div>
      <BlockDropZone 
        v-else
        slotName="" 
        :parentBlockId="blockId!" 
        :acceptedBlockTypes="acceptedBlockTypes"
        class="array-drop-zone"
      />
    </div>
  </BaseBlock>
</template>

<style scoped>
.array-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 60px;
  min-height: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 8px;
}
.array-elements {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-self: stretch;
}
.array-element {
  cursor: grab;
}
.array-element:active {
  cursor: grabbing;
}
.array-drop-zone {
  min-width: 60px;
  align-self: stretch;
  min-height: 24px;
  border-style: dotted;
}

.array-add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  align-self: stretch;
}

.object-row-vertical {
  flex-direction: column;
  align-items: stretch;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 0.9em;
  width: 100%;
}

.field-label {
  min-width: 80px;
  font-weight: 500;
  opacity: 0.9;
  flex-shrink: 0;
}

.add-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.field-input {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  padding: 2px 6px;
  outline: none;
  font-size: 0.9em;
  flex-grow: 1;
}

.field-input.small {
  width: 60px;
}

.add-button {
  background: #FF661A;
  border: none;
  border-radius: 4px;
  color: white;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.add-button:hover {
  filter: brightness(1.2);
}

.inline-drop-zone {
  min-width: 30px !important;
  min-height: 24px !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: 0 0 auto;
}

:deep(.inline-drop-zone .placeholder) {
  font-size: 0.9em;
}
</style>
