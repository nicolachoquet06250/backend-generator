<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import type { DataStructureField } from '~/composables/useDataStructures';
import TypeSelector from '~/components/blocks/TypeSelector.vue';
import { useFunctions } from '~/composables/useFunctions';
import { useTypeFormatter } from '~/composables/useTypeFormatter';

const props = defineProps<{
  id: string;
  fields: DataStructureField[];
}>();

const emit = defineEmits(['remove', 'block-interaction-start', 'block-interaction-stop']);

const name = defineModel<string>('name')

const { updateStructure, addField, removeField, updateField } = useDataStructures();
const { functions } = useFunctions();
const { formatType } = useTypeFormatter();

const associatedFunctions = computed(() => {
  return functions.value.filter(f => f.metadata?.structureId === props.id);
});

const getFunctionSignature = (func: any) => {
  const params: { name: string, type: any }[] = [];
  const findParams = (blocks: any[]) => {
    blocks.forEach(block => {
      if (block.type === 'parameter' && block.config?.name) {
        params.push({ name: block.config.name, type: block.config.type });
      }
      if (block.children) findParams(block.children);
      if (block.config?.slots) {
        Object.values(block.config.slots).forEach((slotBlock: any) => {
          if (slotBlock) findParams(Array.isArray(slotBlock) ? slotBlock : [slotBlock]);
        });
      }
    });
  };
  findParams(func.blocks);
  
  // Unicité par nom
  const uniqueParams = [];
  const names = new Set();
  for (const p of params) {
    if (!names.has(p.name)) {
      names.add(p.name);
      uniqueParams.push(p);
    }
  }

  const paramsStr = uniqueParams
    .map(p => `${p.name}: ${formatType(p.type)}`)
    .join(', ');
    
  return `${func.name}(${paramsStr}): ${formatType(func.metadata?.returnType)}`;
};

const getFieldType = (type: any) => {
  if (typeof type === 'string') return type;
  return type.kind;
};

const onInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  name.value = value;
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
        @mouseenter="$emit('block-interaction-start')"
        @mouseleave="$emit('block-interaction-stop')"
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
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          />
          
          <TypeSelector
            v-model="field.type"
            @update:modelValue="updateField(id, field.id, { type: $event })"
            @block-interaction-start="$emit('block-interaction-start')"
            @block-interaction-stop="$emit('block-interaction-stop')"
          />

          <label class="field-checkbox">
            <span>{{ $t('blocks.struct.nullable') }}</span>
            <input 
              type="checkbox" 
              v-model="field.nullable"
              @change="updateField(id, field.id, { nullable: field.nullable })"
              @mouseenter="$emit('block-interaction-start')"
              @mouseleave="$emit('block-interaction-stop')"
            />
          </label>

          <input 
            v-if="getFieldType(field.type) !== 'array' && getFieldType(field.type) !== 'object'"
            class="field-input default" 
            :type="getFieldType(field.type) === 'number' ? 'number' : 'text'"
            v-model="field.defaultValue"
            @input="updateField(id, field.id, { defaultValue: field.defaultValue })"
            :placeholder="$t('blocks.struct.field_default')"
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          />

          <button 
            class="field-remove" 
            @click="removeField(id, field.id)"
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          >×</button>
        </div>
        
        <button 
          class="add-field-btn" 
          @click="addField(id)"
          @mouseenter="$emit('block-interaction-start')"
          @mouseleave="$emit('block-interaction-stop')"
        >
          + {{ $t('blocks.struct.add_field') }}
        </button>

        <div v-if="associatedFunctions.length > 0" class="associated-functions">
          <div class="functions-label">{{ $t('blocks.struct.associated_functions') }}</div>
          <div v-for="func in associatedFunctions" :key="func.id" class="function-signature">
            {{ getFunctionSignature(func) }}
          </div>
        </div>
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

.field-input {
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

.associated-functions {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.functions-label {
  font-size: 0.7em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  font-weight: bold;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.function-signature {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8em;
  color: white;
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
