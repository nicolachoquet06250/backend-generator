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
import { useMobileDragDrop } from '~/composables/useMobileDragDrop';

const { onTouchStart, onTouchMove, onTouchEnd } = useMobileDragDrop();

const onDragStart = (e: DragEvent, type: string) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('application/x-block-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  }
};

const handleTouchStart = (e: TouchEvent, type: string) => {
  onTouchStart(e, { blockType: type, 'text/plain': type, 'application/x-block-type': type });
};
</script>

<template>
  <div class="block-sidebar" 
       @touchmove="onTouchMove" 
       @touchend="onTouchEnd"
       @touchcancel="onTouchEnd"
  >
    <!-- Variables -->
    <div class="sidebar-section">
      <h3>{{ $t('sections.variables') }}</h3>
      <div class="draggable-wrapper" draggable="true" 
           @dragstart="onDragStart($event, 'var')"
           @touchstart.passive="handleTouchStart($event, 'var')">
        <VarBlock minimal />
      </div>
      <div class="draggable-wrapper" draggable="true" 
           @dragstart="onDragStart($event, 'set_var')"
           @touchstart.passive="handleTouchStart($event, 'set_var')">
        <SetVarBlock minimal />
      </div>
    </div>

    <!-- Mathématiques -->
    <div class="sidebar-section">
      <h3>{{ $t('sections.math') }}</h3>
      <div v-for="op in ['+', '-', '*', '/', '%']" :key="op" 
           class="draggable-wrapper" draggable="true" 
           @dragstart="onDragStart($event, 'math-' + op)"
           @touchstart.passive="handleTouchStart($event, 'math-' + op)">
        <MathBlock :symbol="op" minimal />
      </div>
    </div>

    <!-- Logique & Comparaison -->
    <div class="sidebar-section">
      <h3>{{ $t('sections.logic') }}</h3>
      <div class="draggable-wrapper" draggable="true" 
           @dragstart="onDragStart($event, 'equal')"
           @touchstart.passive="handleTouchStart($event, 'equal')">
        <EqualBlock minimal />
      </div>
      <div v-for="op in ['<', '>', '<=', '>=', '!=']" :key="op"
           class="draggable-wrapper" draggable="true" 
           @dragstart="onDragStart($event, 'compare-' + op)"
           @touchstart.passive="handleTouchStart($event, 'compare-' + op)">
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
             @touchstart.passive="handleTouchStart($event, val ? 'true' : 'false')">
          <BooleanBlock :value="val" minimal />
        </div>
        <div v-for="type in ['string', 'number', 'array', 'object', 'object_property']" 
             :key="type"
             class="draggable-wrapper" draggable="true" 
             @dragstart="onDragStart($event, type)"
             @touchstart.passive="handleTouchStart($event, type)">
          <component :is="type === 'string' ? StringBlock : 
                         type === 'number' ? NumberBlock :
                         type === 'array' ? ArrayBlock :
                         type === 'object' ? ObjectBlock :
                         ObjectPropertyBlock" 
                     minimal
          />
        </div>
        <!-- Multi-drop helpers -->
        <div class="multi-drop-helpers">
           <div class="draggable-wrapper multi" draggable="true" 
                @dragstart="onDragStart($event, 'literal*3')"
                @touchstart.passive="handleTouchStart($event, 'literal*3')">
             <div class="multi-icon">
               <div class="mini-block"></div>
               <div class="mini-block"></div>
               <div class="mini-block"></div>
             </div>
             <span>x3</span>
           </div>
        </div>
      </div>
    </div>

    <!-- Contrôle de flux -->
    <div class="sidebar-section">
      <h3>{{ $t('sections.control') }}</h3>
      <div v-for="type in ['if', 'elseif', 'else', 'while', 'for', 'foreach', 'break', 'continue']" 
           :key="type"
           class="draggable-wrapper" draggable="true" 
           @dragstart="onDragStart($event, type)"
           @touchstart.passive="handleTouchStart($event, type)">
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
    </div>

    <!-- Actions -->
    <div class="sidebar-section">
      <h3>{{ $t('sections.actions') }}</h3>
      <div class="draggable-wrapper" draggable="true" @dragstart="onDragStart($event, 'print')">
        <PrintBlock minimal />
      </div>
      <div class="draggable-wrapper" draggable="true" @dragstart="onDragStart($event, 'array_push')">
        <ArrayPushBlock minimal />
      </div>
      <div class="draggable-wrapper" draggable="true" @dragstart="onDragStart($event, 'array_remove')">
        <ArrayRemoveBlock minimal />
      </div>
      <div class="draggable-wrapper" draggable="true" @dragstart="onDragStart($event, 'array_set_key')">
        <ArraySetKeyBlock minimal />
      </div>
    </div>

    <!-- Fonctions -->
    <div class="sidebar-section">
      <h3>{{ $t('sections.functions') }}</h3>
      <div class="draggable-wrapper" draggable="true" @dragstart="onDragStart($event, 'parameter')">
        <ParameterBlock minimal />
      </div>
      <div class="draggable-wrapper" draggable="true" @dragstart="onDragStart($event, 'function')">
        <FunctionCallBlock minimal />
      </div>
      <div class="draggable-wrapper" draggable="true" @dragstart="onDragStart($event, 'return')">
        <ReturnBlock minimal />
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-sidebar {
  width: 320px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  overflow-y: auto;
  padding: 20px;
  height: 100%;
  box-shadow: 2px 0 5px rgba(0,0,0,0.05);
}

.sidebar-section {
  margin-bottom: 24px;
  background: var(--sidebar-section-bg);
  padding: 12px;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: grab;
  width: 60px;
  height: 60px;
}
.multi:hover {
  background: rgba(255, 255, 255, 0.1);
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
