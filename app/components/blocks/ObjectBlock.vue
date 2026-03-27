<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockRenderer from './BlockRenderer.vue';
import {useDataStructures} from '~/composables/useDataStructures';
import {useFunctions} from '~/composables/useFunctions';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
}>();

const { structures } = useDataStructures();
const { activeFunctionId, updateBlockConfig, updateFunctionMetadata, findReturnParent } = useFunctions();

const structId = computed(() => props.config?.structId);
const selectedStructure = computed(() => {
  if (!structId.value) return null;
  return structures.value.find(s => s.id === structId.value);
});

const values = computed({
  get: () => props.config?.values || {},
  set: (val) => {
    if (props.blockId && activeFunctionId.value) {
      updateBlockConfig(activeFunctionId.value, props.blockId, { values: val });
    }
  }
});

const updateValue = (fieldName: string, value: any) => {
  values.value = {...values.value, [fieldName]: value};
};

const selectStructure = (id: string) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { structId: id, values: {} });
  }
};

const getFieldType = (field: any) => {
  if (typeof field.type === 'string') return field.type;
  return field.type.kind;
};

onMounted(() => {
  if (props.blockId && activeFunctionId.value) {
    const returnBlock = findReturnParent(activeFunctionId.value, props.blockId);
    if (returnBlock) {
      updateFunctionMetadata(activeFunctionId.value, { 
        returnType: structId.value ? { kind: 'object', structId: structId.value } : 'object' 
      });
    }
  }
});
</script>

<template>
  <BaseBlock color="#FF8C1A" :label="selectedStructure ? selectedStructure.name : $t('blocks.literal.object')" :minimal="minimal" :blockId="blockId" blockType="object">
    <div v-if="!minimal" class="object-content">
      <template v-if="selectedStructure">
        <div class="object-fields">
          <div v-for="field in selectedStructure.fields" :key="field.id" class="field-row">
            <span class="field-label">{{ field.name }}:</span>
            
            <input 
              v-if="getFieldType(field) === 'string'"
              type="text"
              class="field-input"
              :value="values[field.name] ?? field.defaultValue"
              @input="e => updateValue(field.name, (e.target as HTMLInputElement).value)"
            />
            
            <input 
              v-else-if="getFieldType(field) === 'number'"
              type="number"
              class="field-input small"
              :value="values[field.name] ?? field.defaultValue"
              @input="e => updateValue(field.name, Number((e.target as HTMLInputElement).value))"
            />
            
            <input 
              v-else-if="getFieldType(field) === 'boolean'"
              type="checkbox"
              class="field-checkbox"
              :checked="values[field.name] ?? field.defaultValue"
              @change="e => updateValue(field.name, (e.target as HTMLInputElement).checked)"
            />
            
            <span v-else class="field-placeholder">...</span>
          </div>
        </div>
      </template>
      <template v-else-if="!children?.length">
        <div class="empty-object select-struct">
          <span class="instruction">{{ $t('blocks.object.select_structure') }}</span>
          <select class="struct-select" @change="e => selectStructure((e.target as HTMLSelectElement).value)">
            <option value="" disabled selected>{{ $t('blocks.object.choose') }}</option>
            <option v-for="struct in structures" :key="struct.id" :value="struct.id">
              {{ struct.name }}
            </option>
          </select>
        </div>
      </template>
      <template v-else>
        <div class="empty-object">
          <BlockRenderer 
            v-for="child in children" 
            :key="child.id" 
            :block="child" 
            isExpression 
          />
        </div>
      </template>
    </div>
  </BaseBlock>
</template>

<style scoped>
.object-content {
  min-width: 60px;
  min-height: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 4px;
}

.object-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 0.9em;
}

.field-label {
  min-width: 80px;
  font-weight: 500;
  opacity: 0.9;
  flex-shrink: 0;
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
  width: 100%;
}

.field-input.small {
  width: 60px;
}

.field-input:focus {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.3);
}

.field-placeholder {
  font-style: italic;
  opacity: 0.5;
}

.empty-object {
  min-height: 22px;
  display: flex;
  align-items: center;
}

.select-struct {
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  min-width: 200px;
}

.instruction {
  font-size: 0.85em;
  opacity: 0.8;
  color: white;
  text-align: center;
}

.struct-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  padding: 4px 8px;
  outline: none;
  cursor: pointer;
}

.struct-select option {
  background: #2a2a2a;
  color: white;
}
</style>
