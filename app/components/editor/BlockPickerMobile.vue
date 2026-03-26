<script setup lang="ts">
import VarBlock from '../blocks/VarBlock.vue';
import MathBlock from '../blocks/MathBlock.vue';
import IfBlock from '../blocks/IfBlock.vue';
import ElseIfBlock from '../blocks/ElseIfBlock.vue';
import ElseBlock from '../blocks/ElseBlock.vue';
import ForBlock from '../blocks/ForBlock.vue';
import WhileBlock from '../blocks/WhileBlock.vue';
import ForEachBlock from '../blocks/ForEachBlock.vue';
import BreakBlock from '../blocks/BreakBlock.vue';
import ContinueBlock from '../blocks/ContinueBlock.vue';
import StringBlock from '../blocks/StringBlock.vue';
import NumberBlock from '../blocks/NumberBlock.vue';
import ArrayBlock from '../blocks/ArrayBlock.vue';
import ObjectBlock from '../blocks/ObjectBlock.vue';
import ObjectPropertyBlock from '../blocks/ObjectPropertyBlock.vue';
import BooleanBlock from '../blocks/BooleanBlock.vue';
import FunctionCallBlock from '../blocks/FunctionCallBlock.vue';
import ParameterBlock from '../blocks/ParameterBlock.vue';
import ArrayPushBlock from '../blocks/ArrayPushBlock.vue';
import ArrayRemoveBlock from '../blocks/ArrayRemoveBlock.vue';
import ArraySetKeyBlock from '../blocks/ArraySetKeyBlock.vue';
import ReturnBlock from '../blocks/ReturnBlock.vue';
import PrintBlock from '../blocks/PrintBlock.vue';
import SetVarBlock from '../blocks/SetVarBlock.vue';
import EqualBlock from '../blocks/EqualBlock.vue';
import ComparisonBlock from '../blocks/ComparisonBlock.vue';

const props = defineProps<{
  show: boolean;
  acceptedTypes?: string[];
}>();

const emit = defineEmits(['close', 'select']);

const onSelect = (type: string) => {
  emit('select', type);
};

const inLoop = inject('inLoop', ref(false));

const isAccepted = (type: string) => {
  if (type === 'break' || type === 'continue') {
    if (!inLoop.value) return false;
  }
  
  if (!props.acceptedTypes || props.acceptedTypes.length === 0) return true;
  
  let normalizedType = type;
  if (type === 'true' || type === 'false') {
    normalizedType = 'boolean';
  }

  const expressionTypes = ['string', 'number', 'boolean', 'true', 'false', 'var', 'parameter', 'math-op', 'compare-op', 'equal', 'array', 'object', 'object_property', 'function', 'print'];
  
  if (type.startsWith('math-')) normalizedType = 'math-op';
  if (type.startsWith('compare-')) normalizedType = 'compare-op';

  const expandedAccepted = props.acceptedTypes.flatMap(t => t === 'expression' ? expressionTypes : [t]);

  return expandedAccepted.includes(normalizedType);
};

const categories = [
  { id: 'variables', label: 'sections.variables', types: ['var', 'set_var'] },
  { id: 'math', label: 'sections.math', types: ['math-+'] }, // Just to trigger section if math-op accepted
  { id: 'logic', label: 'sections.logic', types: ['equal', 'compare-<'] },
  { id: 'literals', label: 'sections.literals', types: ['true', 'string', 'number', 'array', 'object', 'object_property'] },
  { id: 'control', label: 'sections.control', types: ['if', 'elseif', 'else', 'while', 'for', 'foreach', 'break', 'continue'] },
  { id: 'actions', label: 'sections.actions', types: ['print', 'array_push', 'array_remove', 'array_set_key'] },
  { id: 'functions', label: 'sections.functions', types: ['parameter', 'function', 'return'] }
];

const activeCategory = ref(categories[0]!.id);

const filteredCategories = computed(() => {
  return categories.filter(cat => {
    if (cat.id === 'math') return isAccepted('math-op');
    if (cat.id === 'logic') return isAccepted('equal') || isAccepted('compare-op');
    if (cat.id === 'literals') return isAccepted('expression');
    return cat.types.some(type => isAccepted(type));
  });
});

watchEffect(() => {
  if (!filteredCategories.value.find(c => c.id === activeCategory.value) && filteredCategories.value.length > 0) {
    activeCategory.value = filteredCategories.value[0]!.id;
  }
});
</script>

<template>
  <div class="block-picker-mobile">
    <div class="category-tabs">
      <button 
        v-for="cat in filteredCategories" 
        :key="cat.id"
        class="tab-btn"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        {{ $t(cat.label) }}
      </button>
    </div>

    <div class="category-content">
      <!-- Variables -->
      <div v-if="activeCategory === 'variables'" class="mobile-section">
        <div v-if="isAccepted('var')" class="mobile-clickable-block" @click="onSelect('var')">
          <VarBlock minimal />
<!--          <span>{{ $t('blocks.var.label_sidebar') }}</span>-->
        </div>
        <div v-if="isAccepted('set_var')" class="mobile-clickable-block" @click="onSelect('set_var')">
          <SetVarBlock minimal />
<!--          <span>{{ $t('blocks.assign.label') }}</span>-->
        </div>
      </div>

      <!-- Mathématiques -->
      <div v-if="activeCategory === 'math'" class="mobile-section">
        <div v-for="op in ['+', '-', '*', '/', '%']" :key="op" 
             class="mobile-clickable-block" @click="onSelect('math-' + op)">
          <MathBlock :symbol="op" minimal />
<!--          <span>{{ $t(`blocks.math.${op === '+' ? 'add' : op === '-' ? 'sub' : op === '*' ? 'mul' : op === '/' ? 'div' : 'mod'}`) }}</span>-->
        </div>
      </div>

      <!-- Logique & Comparaison -->
      <div v-if="activeCategory === 'logic'" class="mobile-section">
        <div v-if="isAccepted('equal')" class="mobile-clickable-block" @click="onSelect('equal')">
          <EqualBlock minimal />
<!--          <span>{{ $t('blocks.equal.label') }}</span>-->
        </div>
        <div v-for="op in ['<', '>', '<=', '>=', '!=']" :key="op"
             class="mobile-clickable-block" @click="onSelect('compare-' + op)">
          <ComparisonBlock :symbol="op" minimal />
<!--          <span>{{ $t(`blocks.compare.${op === '<' ? 'lt' : op === '>' ? 'gt' : op === '<=' ? 'lte' : op === '>=' ? 'gte' : 'neq'}`) }}</span>-->
        </div>
      </div>

      <!-- Littéraux & Objets -->
      <div v-if="activeCategory === 'literals'" class="mobile-section">
        <div v-for="val in [true, false]" :key="String(val)"
             class="mobile-clickable-block" @click="onSelect(val ? 'true' : 'false')">
          <BooleanBlock :value="val" minimal />
<!--          <span>{{ val ? $t('blocks.true') : $t('blocks.false') }}</span>-->
        </div>
        <div v-for="type in ['string', 'number', 'array', 'object', 'object_property']" 
             :key="type"
             class="mobile-clickable-block" @click="onSelect(type)">
          <component :is="type === 'string' ? StringBlock : 
                         type === 'number' ? NumberBlock :
                         type === 'array' ? ArrayBlock :
                         type === 'object' ? ObjectBlock :
                         ObjectPropertyBlock" 
                     minimal
          />
<!--          <span>{{ $t(`blocks.literal.${type}`) }}</span>-->
        </div>
      </div>

      <!-- Contrôle de flux -->
      <div v-if="activeCategory === 'control'" class="mobile-section">
        <template v-for="type in ['if', 'elseif', 'else', 'while', 'for', 'foreach', 'break', 'continue']" :key="type">
          <div v-if="isAccepted(type)" class="mobile-clickable-block" @click="onSelect(type)">
            <component :is="type === 'if' ? IfBlock : 
                           type === 'elseif' ? ElseIfBlock :
                           type === 'else' ? ElseBlock :
                           type === 'while' ? WhileBlock :
                           type === 'for' ? ForBlock :
                           type === 'foreach' ? ForEachBlock :
                           type === 'break' ? BreakBlock :
                           ContinueBlock" 
                       minimal
            />
<!--            <span>{{ $t(`blocks.${type}.label`) }}</span>-->
          </div>
        </template>
      </div>

      <!-- Actions -->
      <div v-if="activeCategory === 'actions'" class="mobile-section">
        <div v-if="isAccepted('print')" class="mobile-clickable-block" @click="onSelect('print')">
          <PrintBlock minimal />
<!--          <span>{{ $t('blocks.print.label') }}</span>-->
        </div>
        <div v-if="isAccepted('array_push')" class="mobile-clickable-block" @click="onSelect('array_push')">
          <ArrayPushBlock minimal />
<!--          <span>{{ $t('blocks.array_push.label') }}</span>-->
        </div>
        <div v-if="isAccepted('array_remove')" class="mobile-clickable-block" @click="onSelect('array_remove')">
          <ArrayRemoveBlock minimal />
<!--          <span>{{ $t('blocks.array_remove.label') }}</span>-->
        </div>
        <div v-if="isAccepted('array_set_key')" class="mobile-clickable-block" @click="onSelect('array_set_key')">
          <ArraySetKeyBlock minimal />
<!--          <span>{{ $t('blocks.array_set_key.label') }}</span>-->
        </div>
      </div>

      <!-- Fonctions -->
      <div v-if="activeCategory === 'functions'" class="mobile-section">
        <div v-if="isAccepted('parameter')" class="mobile-clickable-block" @click="onSelect('parameter')">
          <ParameterBlock minimal />
<!--          <span>{{ $t('blocks.parameter.label_sidebar') }}</span>-->
        </div>
        <div v-if="isAccepted('function')" class="mobile-clickable-block" @click="onSelect('function')">
          <FunctionCallBlock minimal />
<!--          <span>{{ $t('blocks.function.call') }}</span>-->
        </div>
        <div v-if="isAccepted('return')" class="mobile-clickable-block" @click="onSelect('return')">
          <ReturnBlock minimal />
<!--          <span>{{ $t('blocks.return.label') }}</span>-->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-picker-mobile {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.category-tabs {
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--sidebar-border);
  background: var(--sidebar-bg);
  position: sticky;
  top: 0;
  z-index: 5;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--sidebar-border);
  background: var(--sidebar-section-bg);
  color: var(--sidebar-text);
  white-space: nowrap;
  font-size: 0.9rem;
  cursor: pointer;
  pointer-events: auto;
}

.tab-btn.active {
  background: var(--header-bg);
  color: white;
  border-color: var(--header-bg);
}

.category-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.mobile-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-clickable-block {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--sidebar-section-bg);
  border: 1px solid var(--sidebar-section-border);
  border-radius: 8px;
  cursor: pointer;
  pointer-events: auto;
}

.mobile-clickable-block:active {
  background: var(--tab-hover-bg);
}

.mobile-clickable-block span {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-color);
}
</style>
