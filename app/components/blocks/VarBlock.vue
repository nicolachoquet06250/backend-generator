<script setup lang="ts">
import BaseBlock from '~/components/blocks/BaseBlock.vue';
import TypeSelector from '~/components/blocks/TypeSelector.vue';
import BlockDropZone from '~/components/blocks/BlockDropZone.vue';

import BlockRenderer from './BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  isExpression?: boolean;
  blockId?: string;
  value?: any;
  config?: any;
  children?: any[];
  filterContext?: string;
}>();

const { structures } = useDataStructures();
const { functions, activeFunctionId, updateBlockConfig, updateFunctionMetadata, getBlockById, findReturnParent } = useFunctions();
const { formatType } = useTypeFormatter();

const currentFunction = computed(() => {
  return functions.value.find(f => f.id === activeFunctionId.value);
});

// Récupérer toutes les variables déclarées dans la fonction courante
const availableVariables = computed(() => {
  if (!currentFunction.value) return [];
  
  const vars: { name: string, type: any }[] = [];
  const findVars = (blocks: any[]) => {
    blocks.forEach(block => {
      // Un bloc 'var' au niveau racine (ou dans children) est considéré comme une déclaration
      // s'il a un nom défini dans sa config.
      if (block.type === 'var' && block.config?.name) {
        vars.push({ name: block.config.name, type: block.config.typeConfig });
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
  // Unicité par nom
  const uniqueVars = [];
  const names = new Set();
  for (const v of vars) {
    if (!names.has(v.name)) {
      if (props.filterContext === 'object_only') {
        const type = typeof v.type === 'string' ? v.type : (v.type?.kind || 'any');
        if (type !== 'object') continue;
      }
      names.add(v.name);
      uniqueVars.push(v);
    }
  }
  return uniqueVars;
});

const typeConfig = ref<any>(props.config?.typeConfig || 'any');
const varName = ref(props.config?.name || '');
const selectedVar = ref(props.config?.selectedVar || '');
const showProperties = ref(!!props.config?.showProperties);

const updateReturnTypeIfNeeded = (varNameValue: string) => {
  if (!props.blockId || !activeFunctionId.value || !props.isExpression) return;

  const parent = findReturnParent(activeFunctionId.value, props.blockId);
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
    const typeCfg = declaration?.config?.typeConfig || 'any';
    updateFunctionMetadata(activeFunctionId.value, { returnType: typeCfg });
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
    const declaration = availableVariables.value.find(v => v.name === val);
    if (declaration) {
      updateBlockConfig(activeFunctionId.value, props.blockId, { typeConfig: declaration.type });
    }
    updateReturnTypeIfNeeded(val);
  }
});

onMounted(() => {
  if (selectedVar.value) {
    updateReturnTypeIfNeeded(selectedVar.value);
  }
});

watch(showProperties, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { showProperties: val });
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
const structValues = ref<Record<string, any>>(props.config?.structValues || {});

watch(structValues, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { structValues: val });
  }
}, { deep: true });

const acceptedTypes = computed(() => {
  if (selectedType.value === 'number') return ['number', 'math-op', 'var', 'function', 'ternary'];
  if (selectedType.value === 'string') return ['string', 'var', 'function', 'ternary'];
  if (selectedType.value === 'boolean') return ['boolean', 'var', 'equal', 'compare-op', 'function', 'ternary'];
  if (selectedType.value === 'array') return ['array', 'var', 'function', 'ternary'];
  if (selectedType.value === 'object') return ['object', 'var', 'function', 'ternary'];
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
      <select 
        v-model="selectedVar" 
        class="block-select"
        @mouseenter="$emit('block-interaction-start')"
        @mouseleave="$emit('block-interaction-stop')"
      >
        <option value="" disabled>{{ $t('blocks.var.select_var') }}</option>
        <option v-for="v in availableVariables" :key="v.name" :value="v.name">
          {{ v.name }} : {{ formatType(v.type) }}
        </option>
      </select>
    </template>
    <template v-else>
      <input 
        v-model="varName" 
        class="block-input" 
        :placeholder="$t('blocks.var.placeholder_name')"
        @mouseenter="$emit('block-interaction-start')"
        @mouseleave="$emit('block-interaction-stop')"
      />
      <span class="type-sep">:</span>
      
      <TypeSelector 
        v-model="typeConfig" 
        @block-interaction-start="$emit('block-interaction-start')"
        @block-interaction-stop="$emit('block-interaction-stop')"
      />
      
      <label v-if="selectedType === 'object' && selectedStructure" class="struct-toggle">
        <input 
          type="checkbox" 
          v-model="showProperties" 
          @mouseenter="$emit('block-interaction-start')"
          @mouseleave="$emit('block-interaction-stop')"
        />
        <span class="checkmark"></span>
      </label>
      
      <template v-if="!(selectedType === 'object' && selectedStructure) || showProperties">
        <span class="assign-sep">=</span>
      </template>
      
      <BlockDropZone
        v-if="!minimal && selectedType !== 'object' && !showProperties"
        slotName="value"
        :parentBlockId="blockId!"
        :block="value"
        :acceptedBlockTypes="acceptedTypes"
      >
        <BlockRenderer v-if="value" :block="value" isExpression />
      </BlockDropZone>
    </template>
    
    <template #bottom v-if="selectedType === 'object' && selectedStructure && !minimal && showProperties">
      <div class="struct-defaults">
        <div v-for="field in selectedStructure.fields" :key="field.id" class="struct-field-row">
          <span class="field-name">{{ field.name }}</span>
          <span class="field-assign">:</span>
          <input 
            v-if="getFieldType(field) === 'string' || getFieldType(field) === 'number'"
            class="block-input small" 
            v-model="structValues[field.name]"
            :type="getFieldType(field) === 'number' ? 'number' : 'text'"
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          />
          <input 
            v-else-if="getFieldType(field) === 'boolean'"
            type="checkbox"
            v-model="structValues[field.name]"
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
          />
          <input 
            v-else-if="getFieldType(field) !== 'array' && getFieldType(field) !== 'object'"
            class="block-input small" 
            v-model="structValues[field.name]"
            placeholder="..."
            @mouseenter="$emit('block-interaction-start')"
            @mouseleave="$emit('block-interaction-stop')"
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

.struct-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  margin-left: 8px;
}

.struct-toggle input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  height: 18px;
  width: 18px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  position: relative;
  transition: all 0.2s;
}

.struct-toggle:hover input ~ .checkmark {
  background-color: rgba(255, 255, 255, 0.3);
}

.struct-toggle input:checked ~ .checkmark {
  background-color: #4CAF50;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.struct-toggle input:checked ~ .checkmark:after {
  display: block;
}

.field-name {
  min-width: 50px;
  opacity: 0.9;
}

.field-assign {
  font-weight: bold;
}
</style>
