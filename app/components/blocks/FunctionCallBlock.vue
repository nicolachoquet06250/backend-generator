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
}>();

const { functions, activeFunctionId, updateBlockConfig } = useFunctions();

const selectedFunctionId = ref(props.config?.functionId || '');

watch(selectedFunctionId, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { functionId: val });
  }
});

const otherFunctions = computed(() => {
  return functions.value;
});

// Trouver la fonction sélectionnée
const selectedFunction = computed(() => otherFunctions.value.find(f => f.id === selectedFunctionId.value));

// Extraire les paramètres (déclarés via des blocs Parameter au sein de la fonction cible)
interface ParamInfo { name: string; type: any }

const findParamsInBlocks = (blocks: any[], acc: ParamInfo[]) => {
  blocks.forEach((b) => {
    if (b.type === 'parameter' && b.config?.name) {
      acc.push({ name: b.config.name, type: b.config?.type ?? 'any' });
    }
    if (b.children) findParamsInBlocks(b.children, acc);
    if (b.config?.slots) {
      Object.values(b.config.slots).forEach((slotBlock: any) => {
        if (slotBlock) findParamsInBlocks([slotBlock], acc);
      });
    }
  });
};

const parameters = computed<ParamInfo[]>(() => {
  const acc: ParamInfo[] = [];
  if (selectedFunction.value) {
    findParamsInBlocks(selectedFunction.value.blocks || [], acc);
  }
  // unicité par nom, garder le premier
  const seen = new Set<string>();
  return acc.filter(p => (seen.has(p.name) ? false : (seen.add(p.name), true)));
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
const formatType = (tpe: any): string => {
  const kind = typeof tpe === 'object' ? (tpe.kind || 'object') : tpe;
  if (kind === 'array') {
    const el = typeof tpe === 'object' ? tpe.elementType : 'any';
    return `${t('blocks.var.types.array')}<${formatType(el)}>`;
  }
  if (kind === 'object') {
    return t('blocks.var.types.object');
  }
  return t(`blocks.var.types.${kind || 'any'}`);
};

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
    <template v-if="!minimal">
      <select v-model="selectedFunctionId" class="block-select">
        <option value="" disabled>{{ $t('blocks.function.select') }}</option>
        <option v-for="f in otherFunctions" :key="f.id" :value="f.id">
          {{ f.name }}
        </option>
      </select>
    </template>

    <template #bottom v-if="!minimal && selectedFunction">
              <div class="params-container">
                <div class="param-row" v-for="p in parameters" :key="p.name">
                  <span class="param-name">{{ p.name }}</span>
                  <span class="param-type">: {{ formatType(p.type) }}</span>
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
.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
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
</style>
