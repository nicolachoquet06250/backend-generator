<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import type { DataStructureField } from '~/composables/useDataStructures';
import TypeSelector from './TypeSelector.vue';

const props = defineProps<{
  id: string;
  name: string;
  fields: DataStructureField[];
}>();

const emit = defineEmits(['update:name', 'remove']);

const { updateStructure, addField, removeField, updateField } = useDataStructures();

const getFieldType = (type: any) => {
  if (typeof type === 'string') return type;
  return type.kind;
};

const onInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  emit('update:name', value);
  updateStructure(props.id, { name: value });
};
</script>

<template>
  <BaseBlock color="#FF4500" :label="$t('blocks.struct.label')" class="full-width">
    <div class="struct-header">
      <input 
        class="block-input" 
        :value="name" 
        @input="onInput"
        :placeholder="$t('blocks.struct.placeholder_name')" 
      />
    </div>

    <template #bottom>
      <div class="fields-container">
        <div v-for="field in fields" :key="field.id" class="field-row">
          <input 
            class="field-input name" 
            v-model="field.name" 
            @input="updateField(id, field.id, { name: field.name })"
            :placeholder="$t('blocks.struct.field_name')"
          />
          
          <TypeSelector
            v-model="field.type"
            @update:modelValue="updateField(id, field.id, { type: $event })"
          />

          <label class="field-checkbox">
            <span>{{ $t('blocks.struct.nullable') }}</span>
            <input 
              type="checkbox" 
              v-model="field.nullable"
              @change="updateField(id, field.id, { nullable: field.nullable })"
            />
          </label>

          <input 
            v-if="getFieldType(field.type) !== 'array' && getFieldType(field.type) !== 'object'"
            class="field-input default" 
            :type="getFieldType(field.type) === 'number' ? 'number' : 'text'"
            v-model="field.defaultValue"
            @input="updateField(id, field.id, { defaultValue: field.defaultValue })"
            :placeholder="$t('blocks.struct.field_default')"
          />

          <button class="field-remove" @click="removeField(id, field.id)">×</button>
        </div>
        
        <button class="add-field-btn" @click="addField(id)">
          + {{ $t('blocks.struct.add_field') }}
        </button>
      </div>
    </template>
  </BaseBlock>
</template>

<style scoped>
.struct-header {
  display: flex;
  align-items: center;
}
.block-input {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 0.9em;
  width: 120px;
  background: var(--input-bg);
  color: var(--input-text);
}

.fields-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
}

.fields-container::-webkit-scrollbar {
  height: 6px;
}

.fields-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px;
  border-radius: 4px;
  width: max-content;
  min-width: 100%;
  box-sizing: border-box;
}

.field-input, .field-select {
  border: none;
  border-radius: 2px;
  padding: 2px 4px;
  font-size: 0.8em;
  outline: none;
  background: var(--input-bg);
  color: var(--input-text);
}

.field-input.name { width: 80px; }
.field-input.default { width: 80px; }

.field-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7em;
  color: white;
  white-space: nowrap;
}

.field-remove {
  background: none;
  border: none;
  color: #ffcccc;
  cursor: pointer;
  font-weight: bold;
}

.add-field-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px dashed white;
  color: white;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  font-size: 0.8em;
}
.add-field-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
