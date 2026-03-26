<script setup lang="ts">
import BaseBlock from './BaseBlock.vue';
import TypeSelector from './TypeSelector.vue';
import BlockDropZone from './BlockDropZone.vue';
import BlockRenderer from './BlockRenderer.vue';

const props = defineProps<{
  minimal?: boolean;
  isExpression?: boolean;
  blockId?: string;
  config?: any;
  children?: any[];
}>();

const { functions, activeFunctionId, updateBlockConfig } = useFunctions();

const currentFunction = computed(() => {
  return functions.value.find(f => f.id === activeFunctionId.value);
});

// Récupérer tous les paramètres déclarés dans la fonction courante
const availableParameters = computed(() => {
  if (!currentFunction.value) return [];
  
  const params: string[] = [];
  const findParams = (blocks: any[]) => {
    blocks.forEach(block => {
      // Un bloc 'parameter' au niveau racine (ou dans children) est considéré comme une déclaration
      // si il a un nom défini dans sa config
      if (block.type === 'parameter' && block.config?.name) {
        params.push(block.config.name);
      }
      if (block.children) findParams(block.children);
      if (block.config?.slots) {
        Object.values(block.config.slots).forEach((slotBlock: any) => {
          if (slotBlock) findParams([slotBlock]);
        });
      }
    });
  };
  findParams(currentFunction.value.blocks);
  return [...new Set(params)]; // Unicité
});

const paramName = ref(props.config?.name || '');
const selectedParam = ref(props.config?.selectedParam || '');
const typeConfig = ref<any>(props.config?.type || 'any');
const hasDefaultValue = ref(!!props.config?.hasDefaultValue);

const currentType = computed(() => {
  if (typeof typeConfig.value === 'string') return typeConfig.value;
  return typeConfig.value.kind || 'any';
});

const acceptedValueTypes = computed(() => {
  const type = currentType.value;
  if (type === 'number') return ['number', 'math-op', 'var', 'function'];
  if (type === 'string') return ['string', 'var', 'function'];
  if (type === 'boolean') return ['boolean', 'var', 'equal', 'compare-op', 'function'];
  if (type === 'array') return ['array', 'var', 'function'];
  if (type === 'object') return ['object', 'var', 'function'];
  return ['expression'];
});

watch(paramName, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { name: val });
  }
});

watch(selectedParam, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { selectedParam: val });
  }
});

watch(typeConfig, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { type: val });
  }
}, { deep: true });

watch(hasDefaultValue, (val) => {
  if (props.blockId && activeFunctionId.value) {
    updateBlockConfig(activeFunctionId.value, props.blockId, { hasDefaultValue: val });
  }
});

// Lorsqu'un ArrayBlock ou ObjectBlock est affecté comme valeur par défaut, on lui passe son elementType ou structId
watch(() => props.config?.slots?.defaultValue, (newVal) => {
  if (activeFunctionId.value && props.blockId && newVal) {
    const targetTypeConfig = typeConfig.value;

    if (newVal.type === 'array' && targetTypeConfig?.kind === 'array') {
      const elementType = targetTypeConfig.elementType;
      if (elementType && JSON.stringify(newVal.config?.elementType) !== JSON.stringify(elementType)) {
        updateBlockConfig(activeFunctionId.value, newVal.id, { elementType });
      }
    } else if (newVal.type === 'object' && targetTypeConfig?.kind === 'object') {
      const structId = targetTypeConfig.structId;
      if (structId && newVal.config?.structId !== structId) {
        updateBlockConfig(activeFunctionId.value, newVal.id, { structId });
      }
    }
  }
}, { immediate: true, deep: true });
</script>

<template>
  <BaseBlock color="#FF8C1A" :label="isExpression ? $t('blocks.parameter.label_choice') : $t('blocks.parameter.label')" :minimal="minimal">
    <template v-if="isExpression && !minimal">
      <select v-model="selectedParam" class="block-select">
        <option value="" disabled>{{ $t('blocks.parameter.select_param') }}</option>
        <option v-for="p in availableParameters" :key="p" :value="p">{{ p }}</option>
      </select>
    </template>
    <template v-else-if="!minimal">
      <div class="parameter-config">
        <div class="parameter-main">
          <input 
            v-model="paramName" 
            class="block-input" 
            :placeholder="$t('blocks.parameter.placeholder_name')" 
          />
          <TypeSelector v-model="typeConfig" />
          
          <label class="default-toggle">
            <input type="checkbox" v-model="hasDefaultValue" />
            <span class="checkmark"></span>
          </label>
        </div>

        <div v-if="hasDefaultValue" class="default-value-container">
          <span>{{$t('blocks.parameter.placeholder_default')}}</span>
          <span class="equals-sign">=</span>
          <BlockDropZone
            slotName="defaultValue"
            :parentBlockId="blockId!"
            :block="config?.slots?.defaultValue"
            :acceptedBlockTypes="acceptedValueTypes"
          >
            <BlockRenderer v-if="config?.slots?.defaultValue" :block="config.slots.defaultValue" isExpression />
          </BlockDropZone>
        </div>
      </div>
    </template>
  </BaseBlock>
</template>

<style scoped>
.parameter-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.parameter-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.default-value-container {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 12px;
  border-left: 2px solid rgba(255, 255, 255, 0.2);
  font-size: 0.8em;
  opacity: 0.9;
}

.equals-sign {
  font-weight: bold;
  color: white;
}

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
.block-select {
  cursor: pointer;
  min-width: 80px;
}

.default-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  margin-left: 4px;
}

.default-toggle input {
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

.default-toggle:hover input ~ .checkmark {
  background-color: rgba(255, 255, 255, 0.3);
}

.default-toggle input:checked ~ .checkmark {
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

.default-toggle input:checked ~ .checkmark:after {
  display: block;
}
</style>
