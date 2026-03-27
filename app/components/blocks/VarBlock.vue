<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import TypeSelector from './TypeSelector.vue';
import BlockDropZone from './BlockDropZone.vue';
import MathBlock from './MathBlock.vue';
import StringBlock from './StringBlock.vue';
import NumberBlock from './NumberBlock.vue';
import ArrayBlock from './ArrayBlock.vue';
import ObjectBlock from './ObjectBlock.vue';
import ObjectPropertyBlock from './ObjectPropertyBlock.vue';
import PrintBlock from './PrintBlock.vue';
import BooleanBlock from './BooleanBlock.vue';
import ComparisonBlock from './ComparisonBlock.vue';
import FunctionCallBlock from './FunctionCallBlock.vue';
import ParameterBlock from './ParameterBlock.vue';
import VarBlock from "~/components/blocks/VarBlock.vue";

import BlockRenderer from './BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  isExpression?: boolean;
  blockId?: string;
  value?: any;
  config?: any;
  children?: any[];
}>();

const { structures } = useDataStructures();
const { functions, activeFunctionId, updateBlockConfig } = useFunctions();

const currentFunction = computed(() => {
  return functions.value.find(f => f.id === activeFunctionId.value);
});

// Récupérer toutes les variables déclarées dans la fonction courante
const availableVariables = computed(() => {
  if (!currentFunction.value) return [];
  
  const vars: string[] = [];
  const findVars = (blocks: any[]) => {
    blocks.forEach(block => {
      // Un bloc 'var' au niveau racine (ou dans children) est considéré comme une déclaration
      // si il a un nom défini dans sa config
      if (block.type === 'var' && block.config?.name) {
        vars.push(block.config.name);
      }
      if (block.children) findVars(block.children);
      if (block.config?.slots) {
        Object.values(block.config.slots).forEach((slotBlock: any) => {
          if (slotBlock) findVars([slotBlock]);
        });
      }
    });
  };
  findVars(currentFunction.value.blocks);
  return [...new Set(vars)]; // Unicité
});

const typeConfig = ref<any>(props.config?.typeConfig || 'any');
const varName = ref(props.config?.name || '');
const selectedVar = ref(props.config?.selectedVar || '');

const { updateFunctionMetadata, getBlockById } = useFunctions();

const findReturnParent = (blockId: string): any => {
  const currentFunc = functions.value.find(f => f.id === activeFunctionId.value);
  if (!currentFunc) return null;

  const findInBlocks = (blocks: any[], targetId: string): any => {
    for (const b of blocks) {
      if (b.config?.slots) {
        for (const slotName in b.config.slots) {
          const slotBlock = b.config.slots[slotName];
          if (slotBlock && slotBlock.id === targetId) return b;
          const found = findInBlocks([slotBlock], targetId);
          if (found) return found;
        }
      }
      if (b.children) {
        const found = findInBlocks(b.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  return findInBlocks(currentFunc.blocks, blockId);
};

const updateReturnTypeIfNeeded = (varNameValue: string) => {
  if (!props.blockId || !activeFunctionId.value || !props.isExpression) return;

  const parent = findReturnParent(props.blockId);
  if (parent && parent.type === 'return') {
    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    const findVarDeclaration = (blocks: any[], name: string): any => {
      for (const block of blocks) {
        if (block.type === 'var' && block.config?.name === name) return block;
        if (block.children) {
          const found = findVarDeclaration(block.children, name);
          if (found) return found;
        }
        if (block.config?.slots) {
          for (const s of Object.values(block.config.slots)) {
            if (s) {
              const found = findVarDeclaration([s], name);
              if (found) return found;
            }
          }
        }
      }
      return null;
    };

    const declaration = currentFunction ? findVarDeclaration(currentFunction.blocks, varNameValue) : null;
    if (declaration) {
      const typeCfg = declaration.config?.typeConfig;
      const returnType = typeof typeCfg === 'string' ? typeCfg : (typeCfg?.kind || 'any');
      updateFunctionMetadata(activeFunctionId.value, { returnType });
    } else {
      updateFunctionMetadata(activeFunctionId.value, { returnType: 'any' });
    }
  }
};

// Persistance des changements dans le state global
watch(typeConfig, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { typeConfig: val });
  }
}, { deep: true });

watch(varName, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { name: val });
  }
});

watch(selectedVar, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { selectedVar: val });
    updateReturnTypeIfNeeded(val);
  }
});

const selectedType = computed(() => {
  if (typeof typeConfig.value === 'string') return typeConfig.value;
  return typeConfig.value.kind;
});

const selectedStructureId = computed(() => {
  // Parcourir récursivement pour trouver le structId si applicable
  const findStructId = (config: any): string => {
    if (typeof config === 'string') return '';
    if (config.kind === 'object') return config.structId;
    if (config.kind === 'array') return findStructId(config.elementType);
    return '';
  };
  return findStructId(typeConfig.value);
});

const selectedStructure = computed(() => {
  return structures.value.find(s => s.id === selectedStructureId.value);
});

const getFieldType = (field: any) => {
  if (typeof field.type === 'string') return field.type;
  return field.type.kind;
};

// État local pour les valeurs par défaut des champs de la structure
const structValues = ref<Record<string, any>>({});

const acceptedTypes = computed(() => {
  if (selectedType.value === 'number') return ['number', 'math-op', 'var', 'function'];
  if (selectedType.value === 'string') return ['string', 'var', 'function'];
  if (selectedType.value === 'boolean') return ['boolean', 'var', 'equal', 'compare-op', 'function'];
  if (selectedType.value === 'array') return ['array', 'var', 'function'];
  if (selectedType.value === 'object') return ['object', 'var', 'function'];
  return ['expression'];
});

// Lorsqu'un ArrayBlock ou ObjectBlock est créé comme valeur par défaut, on lui passe son elementType ou structId
watch(() => props.value, (newVal) => {
  if (activeFunctionId.value && props.blockId) {
    if (newVal?.type === 'array' && selectedType.value === 'array') {
      const currentElementType = typeConfig.value.elementType;
      if (currentElementType && JSON.stringify(newVal.config?.elementType) !== JSON.stringify(currentElementType)) {
        updateBlockConfig(activeFunctionId.value, newVal.id, { elementType: currentElementType });
      }
    } else if (newVal?.type === 'object' && selectedType.value === 'object') {
      const currentStructId = typeConfig.value.structId;
      if (currentStructId && newVal.config?.structId !== currentStructId) {
        updateBlockConfig(activeFunctionId.value, newVal.id, { structId: currentStructId });
      }
    }
  }
}, { immediate: true, deep: true });
</script>

<template>
  <BaseBlock color="#FF8C1A" :label="minimal ? $t('blocks.var.label_sidebar') : (isExpression ? $t('blocks.var.label_choice') : $t('blocks.var.label'))" :minimal="minimal" :blockId="blockId" blockType="var">
    <template v-if="isExpression && !minimal">
      <select v-model="selectedVar" class="block-select">
        <option value="" disabled>{{ $t('blocks.var.select_var') }}</option>
        <option v-for="v in availableVariables" :key="v" :value="v">{{ v }}</option>
      </select>
    </template>
    <template v-else>
      <input v-model="varName" class="block-input" :placeholder="$t('blocks.var.placeholder_name')" />
      <span class="type-sep">:</span>
      
      <TypeSelector v-model="typeConfig" />

      <span class="assign-sep">=</span>
      <BlockDropZone 
        v-if="!minimal"
        slotName="value" 
        :parentBlockId="blockId!" 
        :block="value"
        :acceptedBlockTypes="acceptedTypes"
      >
        <BlockRenderer v-if="value" :block="value" isExpression />
      </BlockDropZone>
    </template>

    <template #bottom v-if="selectedType === 'object' && selectedStructure && !minimal">
      <div class="struct-defaults">
        <div v-for="field in selectedStructure.fields" :key="field.id" class="struct-field-row">
          <span class="field-name">{{ field.name }}</span>
          <span class="field-assign">:</span>
          <input 
            v-if="getFieldType(field) === 'string' || getFieldType(field) === 'number'"
            class="block-input small" 
            v-model="structValues[field.name]"
            :type="getFieldType(field) === 'number' ? 'number' : 'text'"
          />
          <input 
            v-else-if="getFieldType(field) === 'boolean'"
            type="checkbox"
            v-model="structValues[field.name]"
          />
          <input 
            v-else-if="getFieldType(field) !== 'array' && getFieldType(field) !== 'object'"
            class="block-input small" 
            v-model="structValues[field.name]"
            placeholder="..."
          />
        </div>
      </div>
    </template>
  </BaseBlock>
</template>

<style scoped>
.block-input, .block-select {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 0.9em;
}
.block-input {
  width: 80px;
}
.block-input.small {
  width: 60px;
}
.block-select {
  cursor: pointer;
  min-width: 80px;
}
.type-sep {
  margin: 0 4px;
  font-weight: bold;
}
.assign-sep {
  margin: 0 8px;
  font-weight: bold;
}
.struct-defaults {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.struct-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8em;
  color: white;
}

.field-name {
  min-width: 50px;
  opacity: 0.9;
}

.field-assign {
  font-weight: bold;
}
</style>
