<script setup lang="ts">
import VarBlock from '../blocks/VarBlock.vue';
import ThisBlock from '../blocks/ThisBlock.vue';
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
import JsonBlock from '../blocks/JsonBlock.vue';
import HtmlBlock from '../blocks/HtmlBlock.vue';
import NewRouteBlock from '../blocks/NewRouteBlock.vue';
import PrintBlock from '../blocks/PrintBlock.vue';
import SetVarBlock from '../blocks/SetVarBlock.vue';
import EqualBlock from '../blocks/EqualBlock.vue';
import ComparisonBlock from '../blocks/ComparisonBlock.vue';
import TernaryBlock from '../blocks/TernaryBlock.vue';
import { useFunctions } from '~/composables/useFunctions';
import { useMobileDragDrop } from '~/composables/useMobileDragDrop';

const { isDragging, functions, activeFunctionId } = useFunctions();
const { onTouchStart, onTouchMove, onTouchEnd } = useMobileDragDrop();

const currentFunction = computed(() => {
  return functions.value.find(f => f.id === activeFunctionId.value);
});

const activeDomain = ref('base');
const domains = [
  { id: 'base', label: 'domains.base' },
  { id: 'web', label: 'domains.web' }
];

const onDragStart = (e: DragEvent, type: string) => {
  if (e.dataTransfer) {
    isDragging.value = true;
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('application/x-block-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  }
};

const onDragEnd = () => {
  isDragging.value = false;
};

const handleTouchStart = (e: TouchEvent, type: string) => {
  const target = e.target as HTMLElement;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) {
    return;
  }
  isDragging.value = true;
  onTouchStart(e, { blockType: type, 'text/plain': type, 'application/x-block-type': type });
};

const handleTouchEnd = (e: TouchEvent) => {
  isDragging.value = false;
  onTouchEnd(e);
};

const onStopPropagation = (e: MouseEvent | TouchEvent) => {
  const target = e.target as HTMLElement;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) {
    e.stopPropagation();
  }
};
</script>

<template>
  <div class="block-sidebar"
       @touchmove="onTouchMove"
       @touchend="handleTouchEnd"
       @touchcancel="handleTouchEnd"
  >
    <div class="domain-tabs">
      <button
          v-for="domain in domains"
          :key="domain.id"
          class="domain-tab"
          :class="{ active: activeDomain === domain.id }"
          @click="activeDomain = domain.id"
      >
        {{ $t(domain.label) }}
      </button>
    </div>

    <div v-if="activeDomain === 'base'" class="domain-content">
      <!-- Variables -->
      <div class="sidebar-section">
        <h3>{{ $t('sections.variables') }}</h3>
        <div class="draggable-wrapper" draggable
             @dragstart="onDragStart($event, 'var')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'var')"
             @mousedown="onStopPropagation">
          <VarBlock minimal />
        </div>
        <div v-if="currentFunction?.metadata?.structureId" class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'this')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'this')"
             @mousedown="onStopPropagation">
          <ThisBlock minimal />
        </div>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'set_var')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'set_var')"
             @mousedown="onStopPropagation">
          <SetVarBlock minimal />
        </div>
      </div>

      <!-- Mathématiques -->
      <div class="sidebar-section">
        <h3>{{ $t('sections.math') }}</h3>
        <div v-for="op in ['+', '-', '*', '/', '%']" :key="op"
             class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'math-' + op)"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'math-' + op)"
             @mousedown="onStopPropagation">
          <MathBlock :symbol="op" minimal />
        </div>
      </div>

      <!-- Logique & Comparaison -->
      <div class="sidebar-section">
        <h3>{{ $t('sections.logic') }}</h3>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'equal')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'equal')"
             @mousedown="onStopPropagation">
          <EqualBlock minimal />
        </div>
        <div v-for="op in ['<', '>', '<=', '>=', '!=']" :key="op"
             class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'compare-' + op)"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'compare-' + op)"
             @mousedown="onStopPropagation">
          <ComparisonBlock :symbol="op" minimal />
        </div>
      </div>

      <!-- Littéraux & Objets -->
      <div class="sidebar-section">
        <h3>{{ $t('sections.literals') }}</h3>
        <div class="literals-grid">
          <div v-for="val in [true, false]" :key="String(val)"
               class="draggable-wrapper" draggable="true"
               @dragstart="onDragStart($event, val ? 'true' : 'false')"
               @touchstart="handleTouchStart($event, val ? 'true' : 'false')"
               @mousedown="onStopPropagation">
            <BooleanBlock :value="val" minimal />
          </div>
          <div v-for="type in ['string', 'number', 'array', 'object', 'object_property']"
               :key="type"
               class="draggable-wrapper" draggable="true"
               @dragstart="onDragStart($event, type)"
               @dragend="onDragEnd"
               @touchstart="handleTouchStart($event, type)"
               @mousedown="onStopPropagation">
            <component :is="type === 'string' ? StringBlock :
                         type === 'number' ? NumberBlock :
                         type === 'array' ? ArrayBlock :
                         type === 'object' ? ObjectBlock :
                         ObjectPropertyBlock"
                       minimal
                       v-bind="type === 'array_set_key' ? { targetKey: null } : {}"
            />
          </div>
          <!-- Multi-drop helpers -->
          <div class="multi-drop-helpers">
            <div class="draggable-wrapper multi" draggable="true"
                 @dragstart="onDragStart($event, 'literal*3')"
                 @touchstart="handleTouchStart($event, 'literal*3')"
                 @mousedown="onStopPropagation">
              <div class="multi-icon">
                <div class="mini-block" v-for="i in 3" :key="i"/>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contrôle de flux -->
      <div class="sidebar-section">
        <h3>{{ $t('sections.control') }}</h3>
        <div v-for="type in ['if', 'elseif', 'else', 'ternary', 'while', 'for', 'foreach', 'break', 'continue']"
             :key="type"
             class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, type)"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, type)"
             @mousedown="onStopPropagation">
          <component :is="type === 'if' ? IfBlock :
                       type === 'elseif' ? ElseIfBlock :
                       type === 'ternary' ? TernaryBlock :
                       type === 'else' ? ElseBlock :
                       type === 'while' ? WhileBlock :
                       type === 'for' ? ForBlock :
                       type === 'foreach' ? ForEachBlock :
                       type === 'break' ? BreakBlock :
                       ContinueBlock"
                     minimal
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="sidebar-section">
        <h3>{{ $t('sections.actions') }}</h3>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'print')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'print')"
             @mousedown="onStopPropagation">
          <PrintBlock minimal />
        </div>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'array_push')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'array_push')"
             @mousedown="onStopPropagation">
          <ArrayPushBlock minimal />
        </div>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'array_remove')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'array_remove')"
             @mousedown="onStopPropagation">
          <ArrayRemoveBlock minimal />
        </div>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'array_set_key')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'array_set_key')"
             @mousedown="onStopPropagation">
          <ArraySetKeyBlock minimal :targetKey="null" />
        </div>
      </div>

      <!-- Fonctions -->
      <div class="sidebar-section">
        <h3>{{ $t('sections.functions') }}</h3>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'parameter')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'parameter')"
             @mousedown="onStopPropagation">
          <ParameterBlock minimal />
        </div>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'function')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'function')"
             @mousedown="onStopPropagation">
          <FunctionCallBlock minimal />
        </div>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'return')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'return')"
             @mousedown="onStopPropagation">
          <ReturnBlock minimal />
        </div>
      </div>

      <!-- Formats de données -->
      <div class="sidebar-section">
        <h3>{{ $t('sections.data_formats') }}</h3>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'json')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'json')"
             @mousedown="onStopPropagation">
          <JsonBlock minimal />
        </div>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'html')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'html')"
             @mousedown="onStopPropagation">
          <HtmlBlock minimal />
        </div>
      </div>
    </div>

    <div v-else-if="activeDomain === 'web'" class="domain-content">
      <div class="sidebar-section">
        <h3>{{ $t('sections.web') }}</h3>
        <div class="draggable-wrapper" draggable="true"
             @dragstart="onDragStart($event, 'new_route')"
             @dragend="onDragEnd"
             @touchstart="handleTouchStart($event, 'new_route')"
             @mousedown="onStopPropagation">
          <NewRouteBlock minimal />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  overflow-y: auto;
  padding: calc(var(--block-padding) * 2);
  height: 100%;
  box-shadow: 2px 0 5px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease-in-out;
}

.domain-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--sidebar-border);
  padding: 5px;
  padding-bottom: 8px;
}

.domain-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--sidebar-text);
  font-weight: 600;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0.7;
}

.domain-tab:hover {
  background: var(--sidebar-section-border);
  opacity: 1;
}

.domain-tab.active {
  background: var(--primary-color);
  color: white;
  opacity: 1;
}

.domain-content {
  flex: 1;
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: var(--block-gap);
  background: var(--sidebar-section-bg);
  padding: var(--block-padding);
  border-radius: 8px;
  border: 1px solid var(--sidebar-section-border);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.sidebar-section h3 {
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  color: var(--sidebar-text);
  border-bottom: 2px solid var(--sidebar-section-border);
  padding-bottom: 4px;
}

/* Specific section colors for visual grouping */
.sidebar-section:nth-of-type(1) h3 { border-bottom-color: #FF8C1A; } /* Variables */
.sidebar-section:nth-of-type(2) h3 { border-bottom-color: #5CB1D6; } /* Math */
.sidebar-section:nth-of-type(3) h3 { border-bottom-color: #5C62D6; } /* Logic */
.sidebar-section:nth-of-type(4) h3 { border-bottom-color: #9966FF; } /* Literals */
.sidebar-section:nth-of-type(5) h3 { border-bottom-color: #FFAB19; } /* Control */
.sidebar-section:nth-of-type(6) h3 { border-bottom-color: #4C97FF; } /* Actions */
.sidebar-section:nth-of-type(7) h3 { border-bottom-color: #FF6680; } /* Functions */

.literals-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 10px;
}

.draggable-wrapper {
  cursor: grab;
  margin-bottom: 8px;
  display: inline-block;
  width: 100%;
}

.literals-grid .draggable-wrapper {
  width: auto;
}

.draggable-wrapper:active {
  cursor: grabbing;
}

.draggable-wrapper :deep(.block-container) {
  margin: 0;
}
.literals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}
.multi-drop-helpers {
  display: flex;
  align-items: center;
}
.multi {
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  justify-content: center;
  padding: 9px 4px;
  background: var(--sidebar-section-bg);
  border: 1px dashed var(--sidebar-section-border);
  border-radius: 4px;
  cursor: grab;
  min-width: 60px;
  flex: 1;
}
.multi:hover {
  background: var(--sidebar-section-border);
}
.multi-icon {
  display: flex;
  gap: 2px;
  margin-bottom: 2px;
}
.mini-block {
  width: 10px;
  height: 10px;
  background: #FF661A;
  border-radius: 2px;
}
</style>
