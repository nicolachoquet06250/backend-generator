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

  const expressionTypes = ['string', 'number', 'boolean', 'true', 'false', 'var', 'parameter', 'math-op', 'compare-op', 'equal', 'array', 'object', 'object_property', 'function', 'print', 'expression'];
  
  if (type.startsWith('math-')) normalizedType = 'math-op';
  if (type.startsWith('compare-')) normalizedType = 'compare-op';

  const expandedAccepted = props.acceptedTypes.flatMap(t => t === 'expression' ? expressionTypes : [t]);

  return expandedAccepted.includes(normalizedType);
};
</script>

<template>
  <div class="block-picker-grid">
    <!-- Variables -->
    <div class="picker-section" v-if="isAccepted('var') || isAccepted('set_var')">
      <h3>{{ $t('sections.variables') }}</h3>
      <div class="blocks-list">
        <div v-if="isAccepted('var')" class="clickable-block" @click="onSelect('var')">
          <VarBlock minimal />
        </div>
        <div v-if="isAccepted('set_var')" class="clickable-block" @click="onSelect('set_var')">
          <SetVarBlock minimal />
        </div>
      </div>
    </div>

    <!-- Mathématiques -->
    <div class="picker-section" v-if="['math-op', 'function'].map(isAccepted).includes(true)">
      <h3>{{ $t('sections.math') }}</h3>
      <div class="blocks-list">
        <div v-for="op in ['+', '-', '*', '/', '%']" :key="op" 
             class="clickable-block" @click="onSelect('math-' + op)">
          <MathBlock :symbol="op" minimal />
        </div>
      </div>
    </div>

    <!-- Logique & Comparaison -->
    <div class="picker-section" v-if="['equal', 'compare-op', 'function'].map(isAccepted).includes(true)">
      <h3>{{ $t('sections.logic') }}</h3>
      <div class="blocks-list">
        <div v-if="isAccepted('equal')" class="clickable-block" @click="onSelect('equal')">
          <EqualBlock minimal />
        </div>
        <div v-for="op in ['<', '>', '<=', '>=', '!=']" :key="op"
             class="clickable-block" @click="onSelect('compare-' + op)">
          <ComparisonBlock :symbol="op" minimal />
        </div>
      </div>
    </div>

    <!-- Littéraux & Objets -->
    <div class="picker-section" v-if="['expression', 'function'].map(isAccepted).includes(true)">
      <h3>{{ $t('sections.literals') }}</h3>
      <div class="blocks-list literals">
        <div v-for="val in [true, false]" :key="String(val)"
             class="clickable-block" @click="onSelect(val ? 'true' : 'false')">
          <BooleanBlock :value="val" minimal />
        </div>
        <div v-for="type in ['string', 'number', 'array', 'object', 'object_property']" 
             :key="type"
             class="clickable-block" @click="onSelect(type)">
          <component :is="type === 'string' ? StringBlock : 
                         type === 'number' ? NumberBlock :
                         type === 'array' ? ArrayBlock :
                         type === 'object' ? ObjectBlock :
                         ObjectPropertyBlock" 
                     minimal
          />
        </div>
      </div>
    </div>

    <!-- Contrôle de flux -->
    <div class="picker-section" v-if="['if', 'elseif', 'else', 'while', 'for', 'foreach', 'break', 'continue'].map(type => isAccepted(type)).filter(t => t).length > 0">
      <h3>{{ $t('sections.control') }}</h3>
      <div class="blocks-list">
        <template v-for="type in ['if', 'elseif', 'else', 'while', 'for', 'foreach', 'break', 'continue']" :key="type">
          <div v-if="isAccepted(type)" class="clickable-block" @click="onSelect(type)">
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
          </div>
        </template>
      </div>
    </div>

    <!-- Actions -->
    <div class="picker-section" v-if="['print', 'array_push', 'array_remove', 'array_set_key'].map(type => isAccepted(type)).filter(t => t).length > 0">
      <h3>{{ $t('sections.actions') }}</h3>
      <div class="blocks-list">
        <div v-if="isAccepted('print')" class="clickable-block" @click="onSelect('print')">
          <PrintBlock minimal />
        </div>
        <div v-if="isAccepted('array_push')" class="clickable-block" @click="onSelect('array_push')">
          <ArrayPushBlock minimal />
        </div>
        <div v-if="isAccepted('array_remove')" class="clickable-block" @click="onSelect('array_remove')">
          <ArrayRemoveBlock minimal />
        </div>
        <div v-if="isAccepted('array_set_key')" class="clickable-block" @click="onSelect('array_set_key')">
          <ArraySetKeyBlock minimal />
        </div>
      </div>
    </div>

    <!-- Fonctions -->
    <div class="picker-section">
      <h3>{{ $t('sections.functions') }}</h3>
      <div class="blocks-list">
        <div v-if="isAccepted('function')" class="clickable-block" @click="onSelect('parameter')">
          <ParameterBlock minimal />
        </div>
        <div v-if="isAccepted('function')" class="clickable-block" @click="onSelect('function')">
          <FunctionCallBlock minimal />
        </div>
        <div v-if="isAccepted('return')" class="clickable-block" @click="onSelect('return')">
          <ReturnBlock minimal />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 10px;
}

.picker-section {
  background: var(--sidebar-section-bg);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--sidebar-section-border);
}

.picker-section h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--sidebar-text);
  margin-top: 0;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--sidebar-section-border);
  padding-bottom: 6px;
  letter-spacing: 0.05em;
}

.blocks-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.clickable-block {
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  pointer-events: auto;
}

.clickable-block:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.clickable-block:active {
  transform: translateY(0) scale(0.98);
}

.blocks-list.literals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
