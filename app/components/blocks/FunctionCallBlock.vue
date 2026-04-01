<script setup lang="ts">
import BaseBlock from "~/components/blocks/BaseBlock.vue";
import BlockDropZone from "~/components/blocks/BlockDropZone.vue";
import StringBlock from './StringBlock.vue';
import NumberBlock from './NumberBlock.vue';
import ArrayBlock from './ArrayBlock.vue';
import ObjectBlock from './ObjectBlock.vue';
import ObjectPropertyBlock from './ObjectPropertyBlock.vue';
import MathBlock from './MathBlock.vue';
import VarBlock from './VarBlock.vue';
import BooleanBlock from './BooleanBlock.vue';
import ComparisonBlock from './ComparisonBlock.vue';
import ParameterBlock from './ParameterBlock.vue';
import PrintBlock from './PrintBlock.vue';
import FunctionCallBlock from "~/components/blocks/FunctionCallBlock.vue";

const props = defineProps<{
  minimal?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
  filterContext?: string;
  parentBlockId?: string;
}>();

const { structures } = useDataStructures();
const { functions, activeFunctionId, getBlockById, updateBlockConfig, updateFunctionMetadata, findReturnParent } = useFunctions();

const { formatType } = useTypeFormatter();

// Déterminer le type de l'objet cible (si présent dans la dropzone)
const targetBlock = computed(() => props.config?.slots?.target);

const targetStructureId = computed(() => {
  if (!targetBlock.value) return null;
  
  const block = targetBlock.value;
  if (block.type === 'var') {
    // Si c'est une variable, on cherche son type (structId)
    const typeCfg = block.config?.typeConfig;
    if (typeCfg && typeof typeCfg === 'object') {
      return typeCfg.structId;
    }
    return null;
  } else if (block.type === 'function') {
    // Si c'est un appel de fonction, on cherche son type de retour
    const funcId = block.config?.functionId;
    const func = functions.value.find(f => f.id === funcId);
    const returnType = func?.metadata?.returnType;
    if (returnType && typeof returnType === 'object') {
      return (returnType as Record<string, any>).structId;
    }
    return null;
  } else if (block.type === 'object') {
    // Si c'est un bloc objet, on cherche son structureId
    return block.config?.structureId;
  }
  return null;
});

const parentBlock = props.parentBlockId ? getBlockById(activeFunctionId.value, props.parentBlockId) : null;
const isParentNewRoute = computed(() => parentBlock?.type === 'new_route');

const filterRouteFunction = (f: FunctionDefinition) => {
  const params: ParamInfo[] = [];
  findParamsInBlocks(f.blocks || [], params);
  
  const hasRequest = params.some(p => {
    const type = p.type;
    if (type && typeof type === 'object') {
      return (type.kind === 'object' || !type.kind) && structures.value.find(s => s.id === type.structId)?.name === 'Request';
    }
    return type === 'Request';
  });
  
  const hasResponse = params.some(p => {
    const type = p.type;
    if (type && typeof type === 'object') {
      return (type.kind === 'object' || !type.kind) && structures.value.find(s => s.id === type.structId)?.name === 'Response';
    }
    return type === 'Response';
  });
  
  return hasRequest && hasResponse;
};

const selectedFunctionId = ref(props.config?.functionId || '');

const updateReturnTypeIfNeeded = (selectedFuncId: string) => {
  if (!props.blockId || !activeFunctionId.value) return;

  const parent = findReturnParent(activeFunctionId.value, props.blockId);
  if (parent && parent.type === 'return') {
    const targetFunc = functions.value.find(f => f.id === selectedFuncId);
    if (targetFunc) {
      updateFunctionMetadata(activeFunctionId.value, { returnType: targetFunc.metadata?.returnType || 'any' });
    } else {
      updateFunctionMetadata(activeFunctionId.value, { returnType: 'any' });
    }
  }
};

watch(targetStructureId, (newId, oldId) => {
  if (newId !== oldId) {
    // Si la structure change, on réinitialise la fonction sélectionnée
    // pour éviter d'appeler une fonction qui n'appartient plus à cet objet
    selectedFunctionId.value = '';
  }
});

watch(selectedFunctionId, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { functionId: val });
    updateReturnTypeIfNeeded(val);
  }
});

onMounted(() => {
  if (selectedFunctionId.value) {
    updateReturnTypeIfNeeded(selectedFunctionId.value);
  }
});

const otherFunctions = computed(() => {
  const targetId = targetStructureId.value;

  if (props.filterContext === 'new_route' || isParentNewRoute.value) {
    return functions.value.filter(f => filterRouteFunction(f) && f.metadata?.structureId === (targetId || undefined));
  }
  
  // Si un objet est ciblé, on ne montre que les fonctions associées à cet objet (structureId)
  // Sinon on ne montre que les fonctions globales (structureId undefined ou null)
  return functions.value.filter(f => f.metadata?.structureId === (targetId || undefined));
});

// Trouver la fonction sélectionnée
const selectedFunction = computed(() => functions.value.find(f => f.id === selectedFunctionId.value));

// Extraire les paramètres (déclarés via des blocs Parameter au sein de la fonction cible)
interface ParamInfo { name: string; type: any; hasDefault: boolean }

const findParamsInBlocks = (blocks: any[], acc: ParamInfo[]) => {
  blocks.forEach((b) => {
    // Un bloc 'parameter' est une déclaration s'il a un nom et n'est pas une utilisation (selectedParam absent).
    if (b.type === 'parameter' && b.config?.name && !b.config?.selectedParam) {
      acc.push({ 
        name: b.config.name, 
        type: b.config?.type ?? 'any',
        hasDefault: !!b.config?.hasDefaultValue
      });
    }
    
    // Exploration récursive des enfants
    if (b.children && b.children.length > 0) {
      findParamsInBlocks(b.children, acc);
    }
    
    // Exploration récursive des slots (important pour les blocs imbriqués comme If, For, etc.)
    if (b.config?.slots) {
      Object.values(b.config.slots).forEach((slotBlock: any) => {
        if (slotBlock) {
          if (Array.isArray(slotBlock)) {
            findParamsInBlocks(slotBlock, acc);
          } else {
            findParamsInBlocks([slotBlock], acc);
          }
        }
      });
    }
  });
};

const parameters = computed<ParamInfo[]>(() => {
  const acc: ParamInfo[] = [];
  if (selectedFunctionId.value) {
    const targetFunc = functions.value.find(f => f.id === selectedFunctionId.value);
    if (targetFunc) {
      findParamsInBlocks(targetFunc.blocks || [], acc);
    }
  }
  // unicité par nom, garder le premier
  const seen = new Set<string>();
  const uniqueParams = acc.filter(p => seen.has(p.name) ? false : (() => {
    seen.add(p.name);
    return true;
  })());

  // Trier les paramètres : ceux sans valeur par défaut d'abord, ceux avec à la fin
  return uniqueParams.sort((a, b) => {
    if (a.hasDefault && !b.hasDefault) return 1;
    if (!a.hasDefault && b.hasDefault) return -1;
    return 0;
  });
});

// Mapping des types vers les types acceptés par la DropZone
const typeToAccepted = (t: any): string[] => {
  const kind = typeof t === 'object' ? (t.kind || 'object') : t;
  switch (kind) {
    case 'string':
      return ['string', 'var', 'parameter', 'function'];
    case 'number':
      return ['number', 'math-op', 'var', 'parameter', 'function'];
    case 'boolean':
      return ['boolean', 'true', 'false', 'equal', 'compare-op', 'var', 'parameter', 'function'];
    case 'array':
      return ['array', 'var', 'parameter', 'function'];
    case 'object':
      return ['object', 'object_property', 'var', 'parameter', 'function'];
    case 'any':
    default:
      return ['expression'];
  }
};

// Affichage lisible du type
const { t } = useI18n();
// Résolution de composant pour afficher l'argument déposé
const getValueComponent = (block: any) => {
  if (!block) return null;
  const type = block.type;
  if (type === 'string') return StringBlock;
  if (type === 'number') return NumberBlock;
  if (type === 'boolean' || type === 'true' || type === 'false' || type === 'equal') return BooleanBlock;
  if (type === 'array') return ArrayBlock;
  if (type === 'object') return ObjectBlock;
  if (type === 'object_property') return ObjectPropertyBlock;
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
  <BaseBlock color="#FF6680" :label="$t('blocks.function.call')" :minimal="minimal">
    <template #label v-if="selectedFunction">
      <span class="minimal-return-type" v-if="minimal">({{ selectedFunction.metadata?.returnType || 'any' }})</span>
    </template>
    <template v-if="!minimal">
      <div class="call-header">
        <BlockDropZone
          :parentBlockId="blockId!"
          slotName="target"
          :acceptedBlockTypes="['object', 'var', 'function']"
          :block="config?.slots?.target"
        >
          <component
            v-if="config?.slots?.target"
            :is="getValueComponent(config.slots.target)"
            v-bind="{ 
              blockId: config.slots.target.id, 
              config: config.slots.target.config, 
              ...config.slots.target.config.slots, 
              isExpression: true,
              filterContext: config.slots.target.type === 'var' ? 'object_only' : undefined
            }"
          />
          <span v-else class="dropzone-placeholder">{{ $t('blocks.function.drop_object') }}</span>
        </BlockDropZone>
        
        <span v-if="config?.slots?.target" class="dot-separator">.</span>

        <select 
          v-model="selectedFunctionId" 
          class="block-select"
          @mouseenter="$emit('block-interaction-start')"
          @mouseleave="$emit('block-interaction-stop')"
        >
          <option value="" disabled>{{ $t('blocks.function.select') }}</option>
          <option v-for="f in otherFunctions" :key="f.id" :value="f.id">
            {{ f.name }} ({{ formatType(f.metadata?.returnType) }})
          </option>
        </select>
        <span v-if="selectedFunction" class="return-type-display">
          : {{ formatType(selectedFunction.metadata?.returnType) }}
        </span>
      </div>
    </template>
    <template #bottom v-if="(parentBlock?.type !== 'new_route' || parameters.filter(p => !['res', 'req'].includes(p.type.structId)).length > 0) && !minimal && selectedFunction">
      <div class="params-container">
        <div class="param-row" v-for="p in parameters.filter(_p => !['res', 'req'].includes(_p.type.structId))" :key="p.name" :class="{ 'has-default': p.hasDefault }">
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
        <div v-if="parameters.length === 0" class="param-row">
          <span class="param-label">( )</span>
        </div>
      </div>
    </template>
  </BaseBlock>
</template>

<style scoped>
.params-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.call-header {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dot-separator {
  font-weight: bold;
  font-size: 1.2em;
}
.dropzone-placeholder {
  font-size: 0.8em;
  opacity: 0.6;
  font-style: italic;
  white-space: nowrap;
}
.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (prefers-color-scheme: light) {
  .param-row {
    color: #000000;
  }
}

@media (prefers-color-scheme: dark) {
  .param-row {
    color: #ffffff;
  }
}
.param-row.has-default {
  opacity: 0.8;
}
.param-row.has-default:hover {
  opacity: 1;
}
.param-label {
  font-weight: bold;
}
.param-name {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}
.param-type {
  opacity: 0.8;
  font-size: 0.85em;
}
.block-select {
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  outline: none;
  font-size: 0.9em;
  min-width: 120px;
}
.return-type-display {
  font-size: 0.85em;
  opacity: 0.8;
  font-style: italic;
  font-weight: 500;
  margin-left: 4px;
}
.minimal-return-type {
  font-size: 0.85em;
  opacity: 0.8;
  font-style: italic;
  margin-left: 4px;
  font-weight: normal;
}
</style>
