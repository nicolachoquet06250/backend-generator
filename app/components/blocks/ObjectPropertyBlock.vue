<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';
import StringBlock from './StringBlock.vue';
import NumberBlock from './NumberBlock.vue';
import ArrayBlock from './ArrayBlock.vue';
import ObjectBlock from './ObjectBlock.vue';
import MathBlock from './MathBlock.vue';
import VarBlock from './VarBlock.vue';
import BooleanBlock from './BooleanBlock.vue';
import ComparisonBlock from './ComparisonBlock.vue';
import ParameterBlock from './ParameterBlock.vue';
import ThisBlock from './ThisBlock.vue';
import PrintBlock from './PrintBlock.vue';
import FunctionCallBlock from "~/components/blocks/FunctionCallBlock.vue";
import ObjectPropertyBlock from "~/components/blocks/ObjectPropertyBlock.vue";

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
  filterContext?: string;
}>();

const filterContext = computed(() => props.filterContext || 'object_only');

const { structures } = useDataStructures();
const { functions, activeFunctionId, updateBlockConfig, getBlockById, updateFunctionMetadata, findReturnParent } = useFunctions();
const { formatType } = useTypeFormatter();

const selectedProperty = ref(props.config?.property || '');

watch(() => props.config?.property, (newVal) => {
  if (newVal !== undefined && newVal !== selectedProperty.value) {
    selectedProperty.value = newVal;
  }
});

watch(selectedProperty, (val) => {
  if (props.blockId && activeFunctionId.value && val !== props.config?.property) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { property: val });
  }
});

const sourceBlock = computed(() => props.config?.slots?.source);

const sourceStructure = computed(() => {
  if (!sourceBlock.value) return null;
  
  let type: any = null;
  const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);

  if (sourceBlock.value.type === 'var') {
    if (sourceBlock.value.config?.selectedVar) {
      // Rechercher le type de la variable sélectionnée dans la fonction active
      const findVarType = (blocks: any[], name: string): any => {
        for (const block of blocks) {
          if (block.type === 'var' && block.config?.name === name) return block.config.typeConfig;
          if (block.children) {
            const found = findVarType(block.children, name);
            if (found) return found;
          }
          if (block.config?.slots) {
            for (const s of Object.values(block.config.slots)) {
              if (s) {
                const found = findVarType(Array.isArray(s) ? s : [s], name);
                if (found) return found;
              }
            }
          }
        }
        return null;
      };
      type = currentFunction ? findVarType(currentFunction.blocks, sourceBlock.value.config.selectedVar) : null;
    } else {
      type = sourceBlock.value.config?.typeConfig;
    }
  } else if (sourceBlock.value.type === 'parameter') {
    if (sourceBlock.value.config?.selectedParam) {
      // Rechercher le type du paramètre sélectionné dans la fonction active
      const findParamType = (blocks: any[], name: string): any => {
        for (const block of blocks) {
          if (block.type === 'parameter' && block.config?.name === name && !block.config?.selectedParam) return block.config.type;
          if (block.children) {
            const found = findParamType(block.children, name);
            if (found) return found;
          }
          if (block.config?.slots) {
            for (const s of Object.values(block.config.slots)) {
              if (s) {
                const found = findParamType(Array.isArray(s) ? s : [s], name);
                if (found) return found;
              }
            }
          }
        }
        return null;
      };
      type = currentFunction ? findParamType(currentFunction.blocks, sourceBlock.value.config.selectedParam) : null;
    } else {
      type = sourceBlock.value.config?.type;
    }
  } else if (sourceBlock.value.type === 'this') {
    if (currentFunction?.metadata?.structureId) {
      return structures.value.find(s => s.id === currentFunction.metadata?.structureId);
    }
  }
  
  if (type) {
    if (typeof type === 'object' && type.kind === 'object') {
      return structures.value.find(s => s.id === type.structId);
    }
    // Gérer les cas où structId est directement à la racine (Request/Response par exemple)
    if (typeof type === 'object' && type.structId) {
      return structures.value.find(s => s.id === type.structId);
    }
    // Gérer le cas où type est une chaîne qui correspond à une ID de structure
    if (typeof type === 'string') {
      return structures.value.find(s => s.id === type || s.name === type);
    }
  }
  return null;
});

const availableProperties = computed(() => {
  if (!sourceStructure.value) return [];
  
  const properties: Array<{ id: string, name: string, type: 'field' | 'function', metadata?: any }> = [];
  
  // Ajouter les champs de la structure
  sourceStructure.value.fields.forEach(field => {
    properties.push({
      id: `field_${field.name}`,
      name: field.name,
      type: 'field',
      metadata: field.type
    });
  });
  
  // Ajouter les fonctions associées à cette structure uniquement si le contexte ne force pas les propriétés
  if (filterContext.value !== 'object_only') {
    functions.value
      .filter(f => f.metadata?.structureId === sourceStructure.value?.id)
      .forEach(f => {
        properties.push({
          id: `func_${f.id}`,
          name: f.name,
          type: 'function',
          metadata: f
        });
      });
  }
    
  return properties;
});

const selectedPropInfo = computed(() => {
  return availableProperties.value.find(p => p.id === selectedProperty.value);
});

// Mise à jour du type de retour si dans un bloc return
watch([selectedPropInfo, () => props.blockId], ([info, blockId]) => {
  if (blockId && activeFunctionId.value) {
    const returnBlock = findReturnParent(activeFunctionId.value, blockId);
    if (returnBlock) {
      let type: any = 'any';
      if (info) {
        if (info.type === 'field') {
          type = info.metadata;
        } else if (info.type === 'function') {
          type = info.metadata?.metadata?.returnType || 'any';
        }
      }
      
      updateFunctionMetadata(activeFunctionId.value, { returnType: type });
    }
  }
}, { immediate: true });

// Gestion des paramètres pour les fonctions (copié de FunctionCallBlock)
interface ParamInfo { name: string; type: any; hasDefault: boolean }

const findParamsInBlocks = (blocks: any[], acc: ParamInfo[]) => {
  blocks.forEach((b) => {
    if (b.type === 'parameter' && b.config?.name && !b.config?.selectedParam) {
      acc.push({ 
        name: b.config.name, 
        type: b.config?.type ?? 'any',
        hasDefault: !!b.config?.hasDefaultValue
      });
    }
    if (b.children) findParamsInBlocks(b.children, acc);
    if (b.config?.slots) {
      Object.values(b.config.slots).forEach((slotBlock: any) => {
        if (slotBlock) {
          if (Array.isArray(slotBlock)) findParamsInBlocks(slotBlock, acc);
          else findParamsInBlocks([slotBlock], acc);
        }
      });
    }
  });
};

const parameters = computed<ParamInfo[]>(() => {
  const acc: ParamInfo[] = [];
  if (selectedPropInfo.value?.type === 'function') {
    const targetFunc = selectedPropInfo.value.metadata;
    findParamsInBlocks(targetFunc.blocks || [], acc);
  }
  const seen = new Set<string>();
  return acc.filter(p => seen.has(p.name) ? false : (() => {
    seen.add(p.name);
    return true;
  })()).sort((a, b) => {
    if (a.hasDefault && !b.hasDefault) return 1;
    if (!a.hasDefault && b.hasDefault) return -1;
    return 0;
  });
});

const typeToAccepted = (t: any): string[] => {
  const kind = typeof t === 'object' ? (t.kind || 'object') : t;
  switch (kind) {
    case 'string': return ['string', 'var', 'parameter', 'function'];
    case 'number': return ['number', 'math-op', 'var', 'parameter', 'function'];
    case 'boolean': return ['boolean', 'true', 'false', 'equal', 'compare-op', 'var', 'parameter', 'function'];
    case 'array': return ['array', 'var', 'parameter', 'function'];
    case 'object': return ['object', 'object_property', 'var', 'parameter', 'function'];
    default: return ['expression'];
  }
};

const getValueComponent = (block: any) => {
  if (!block) return null;
  const type = block.type;
  if (type === 'string') return StringBlock;
  if (type === 'number') return NumberBlock;
  if (type === 'boolean' || type === 'true' || type === 'false' || type === 'equal') return BooleanBlock;
  if (type === 'array') return ArrayBlock;
  if (type === 'object') return ObjectBlock;
  if (type === 'object_property') return ObjectPropertyBlock;
  if (type === 'this') return ThisBlock;
  if (type === 'var') return VarBlock;
  if (type === 'parameter') return ParameterBlock;
  if (type === 'function') return FunctionCallBlock;
  if (type === 'print') return PrintBlock;
  if (type.startsWith('compare-')) return ComparisonBlock;
  if (type.startsWith('math-')) return MathBlock;
  return null;
};
</script>

<template>
  <BaseBlock color="#FF8C1A" :label="$t('blocks.literal.object_property')" :minimal="minimal">
    <div class="property-header">
      <BlockDropZone
        v-if="!minimal"
        :parentBlockId="blockId!"
        slotName="source"
        :acceptedBlockTypes="['var', 'parameter', 'this']"
        :block="config?.slots?.source"
        :filterContext="filterContext"
      >
        <BlockRenderer v-if="config?.slots?.source" :block="config.slots.source" isExpression :filterContext="filterContext" />
      </BlockDropZone>
      
      <span class="dot" v-if="!minimal">.</span>

      <select v-if="!minimal" v-model="selectedProperty" class="block-select" :disabled="!sourceStructure">
        <option value="" disabled>{{ sourceStructure ? $t('blocks.literal.object_property') : $t('blocks.object.choose') }}</option>
        <option v-for="prop in availableProperties" :key="prop.id" :value="prop.id">
          {{ prop.name }} {{ prop.type === 'function' ? '()' : '' }}
        </option>
      </select>
    </div>

    <template #bottom v-if="!minimal && selectedPropInfo?.type === 'function' && parameters.length > 0">
      <div class="params-container">
        <div class="param-row" v-for="p in parameters" :key="p.name" :class="{ 'has-default': p.hasDefault }">
          <span class="param-name">{{ p.name }}</span>
          <span class="param-type">: {{ formatType(p.type) }}{{ p.hasDefault ? '?' : '' }}</span>
          <span class="param-label">=</span>
          <BlockDropZone
            :parentBlockId="blockId!"
            :slotName="`arg_${p.name}`"
            :acceptedBlockTypes="typeToAccepted(p.type)"
            :block="config?.slots?.[`arg_${p.name}`]"
          >
            <component
              v-if="config?.slots?.[`arg_${p.name}`]"
              :is="getValueComponent(config.slots[`arg_${p.name}`])"
              v-bind="config.slots[`arg_${p.name}`].type.startsWith('math-') || config.slots[`arg_${p.name}`].type.startsWith('compare-') ?
                { symbol: config.slots[`arg_${p.name}`].type.split('-')[1], blockId: config.slots[`arg_${p.name}`].id, config: config.slots[`arg_${p.name}`].config, ...config.slots[`arg_${p.name}`].config.slots, isExpression: true } :
                (config.slots[`arg_${p.name}`].type === 'boolean' || config.slots[`arg_${p.name}`].type === 'true' || config.slots[`arg_${p.name}`].type === 'false' || config.slots[`arg_${p.name}`].type === 'equal' ?
                  { value: config.slots[`arg_${p.name}`].type === 'true' || (config.slots[`arg_${p.name}`].config && (config.slots[`arg_${p.name}`].config.value === true || config.slots[`arg_${p.name}`].config.value === 'true')), blockId: config.slots[`arg_${p.name}`].id, config: config.slots[`arg_${p.name}`].config, ...config.slots[`arg_${p.name}`].config.slots, isExpression: true } :
                  { blockId: config.slots[`arg_${p.name}`].id, config: config.slots[`arg_${p.name}`].config, ...config.slots[`arg_${p.name}`].config.slots, isExpression: true }
                )"
            />
          </BlockDropZone>
        </div>
      </div>
    </template>
  </BaseBlock>
</template>

<style scoped>
.property-header {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dot {
  font-weight: bold;
  font-size: 1.2em;
  color: white;
}
.block-select {
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  outline: none;
  font-size: 0.9em;
  min-width: 100px;
}
.params-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.3);
}
.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
}
.param-name {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
.param-type {
  opacity: 0.8;
  font-size: 0.85em;
}
.param-label {
  font-weight: bold;
}
</style>
