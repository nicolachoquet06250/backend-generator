<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  array?: any;
  targetKey?: any;
  value?: any;
  children?: any[];
}>();

const { structures } = useDataStructures();
const { activeFunctionId, updateBlockConfig, functions } = useFunctions();

const acceptedArrayTypes = ['var', 'parameter', 'array', 'object', 'function'];
const acceptedValueTypes = ['expression'];

const availableKeys = computed(() => {
  if (!props.array) return [];

  // Cas 1 : C'est un bloc 'var'
  if (props.array.type === 'var') {
    const varName = props.array.config?.selectedVar || props.array.config?.name;
    if (!varName) return [];

    // Trouver la déclaration de la variable pour connaître son type/structure
    const findVarDeclaration = (blocks: any[]): any => {
      for (const b of blocks) {
        if (b.type === 'var' && b.config?.name === varName) return b;
        if (b.children) {
          const found = findVarDeclaration(b.children);
          if (found) return found;
        }
        if (b.config?.slots) {
          for (const slot in b.config.slots) {
            if (b.config.slots[slot]) {
              const found = findVarDeclaration([b.config.slots[slot]]);
              if (found) return found;
            }
          }
        }
      }
      return null;
    };

    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    if (!currentFunction) return [];

    const declaration = findVarDeclaration(currentFunction.blocks);
    if (declaration && declaration.config?.typeConfig) {
      const typeConfig = declaration.config.typeConfig;
      let structId = '';
      if (typeConfig.kind === 'object') {
        structId = typeConfig.structId;
      } else if (typeConfig.kind === 'array' && typeConfig.elementType?.kind === 'object') {
        structId = typeConfig.elementType.structId;
      }

      if (structId) {
        const struct = structures.value.find(s => s.id === structId);
        if (struct) {
          return struct.fields.map(f => f.name);
        }
      }
    }
  }

  // Cas 2 : C'est un bloc 'parameter'
  if (props.array.type === 'parameter') {
    // Les paramètres pourraient aussi avoir des types de structures à l'avenir
  }

  return [];
});

const selectedKey = ref(props.config?.selectedKey || '');

watch(selectedKey, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { selectedKey: val });
  }
});

</script>

<template>
  <BaseBlock color="#FF661A" :label="$t('blocks.array_set_key.label')" :minimal="minimal">
    <div class="array-set-key-block" v-if="!minimal">
      <span class="sep">{{ $t('blocks.array_set_key.from_label') }}</span>
      <BlockDropZone 
        slotName="array" 
        :parentBlockId="blockId!" 
        :block="array"
        :acceptedBlockTypes="acceptedArrayTypes"
      >
        <BlockRenderer v-if="array" :block="array" isExpression />
      </BlockDropZone>

      <span class="sep">{{ $t('blocks.array_set_key.key_label') }}</span>
      <template v-if="availableKeys.length > 0">
        <select v-model="selectedKey" class="key-select">
          <option value="" disabled>{{ $t('blocks.array_set_key.select_key') }}</option>
          <option v-for="k in availableKeys" :key="k" :value="k">{{ k }}</option>
        </select>
      </template>
      <template v-else>
        <BlockDropZone 
          slotName="key" 
          :parentBlockId="blockId!" 
          :block="targetKey"
          :acceptedBlockTypes="['string', 'number', 'var', 'parameter', 'function']"
        >
          <BlockRenderer v-if="targetKey" :block="targetKey" isExpression />
        </BlockDropZone>
      </template>

      <span class="sep">{{ $t('blocks.array_set_key.with_label') }}</span>
      <BlockDropZone 
        slotName="value" 
        :parentBlockId="blockId!" 
        :block="value"
        :acceptedBlockTypes="acceptedValueTypes"
      >
        <BlockRenderer v-if="value" :block="value" isExpression />
      </BlockDropZone>
    </div>
  </BaseBlock>
</template>

<style scoped>
.array-set-key-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sep {
  font-weight: bold;
}
.key-select {
  padding: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.key-select option {
  background: #2a2a2a;
  color: white;
}
</style>
