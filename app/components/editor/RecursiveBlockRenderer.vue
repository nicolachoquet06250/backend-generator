<script setup lang="ts">
import StartBlock from '../blocks/StartBlock.vue';
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
import PrintBlock from '../blocks/PrintBlock.vue';
import SetVarBlock from '../blocks/SetVarBlock.vue';
import EqualBlock from '../blocks/EqualBlock.vue';
import ComparisonBlock from '../blocks/ComparisonBlock.vue';
import ReturnBlock from '../blocks/ReturnBlock.vue';
import FunctionCallBlock from '../blocks/FunctionCallBlock.vue';
import ParameterBlock from '../blocks/ParameterBlock.vue';
import ArrayPushBlock from '../blocks/ArrayPushBlock.vue';
import ArrayRemoveBlock from '../blocks/ArrayRemoveBlock.vue';
import ArraySetKeyBlock from '../blocks/ArraySetKeyBlock.vue';
import BlockDropZone from '../blocks/BlockDropZone.vue';

const inLoop = inject('inLoop', ref(false));

const props = defineProps<{
  blocks: any[];
  isRoot?: boolean;
  parentBlockId?: string;
}>();

const { activeFunctionId, addBlockToFunction, getBlockById, removeBlockFromFunction } = useFunctions();

const getBlockComponent = (type: string) => {
  if (type === 'start') return StartBlock;
  if (type === 'var') return VarBlock;
  if (type.startsWith('math-')) return MathBlock;
  if (type === 'string') return StringBlock;
  if (type === 'number') return NumberBlock;
  if (type === 'array') return ArrayBlock;
  if (type === 'object') return ObjectBlock;
  if (type === 'object_property') return ObjectPropertyBlock;
  if (type === 'true' || type === 'false') return BooleanBlock;
  if (type === 'if') return IfBlock;
  if (type === 'elseif') return ElseIfBlock;
  if (type === 'else') return ElseBlock;
  if (type === 'for') return ForBlock;
  if (type === 'while') return WhileBlock;
  if (type === 'foreach') return ForEachBlock;
  if (type === 'break') return BreakBlock;
  if (type === 'continue') return ContinueBlock;
  if (type === 'print') return PrintBlock;
  if (type === 'set_var') return SetVarBlock;
  if (type === 'equal') return EqualBlock;
  if (type === 'return') return ReturnBlock;
  if (type === 'function') return FunctionCallBlock;
  if (type === 'parameter') return ParameterBlock;
  if (type === 'array_push') return ArrayPushBlock;
  if (type === 'array_remove') return ArrayRemoveBlock;
  if (type === 'array_set_key') return ArraySetKeyBlock;
  if (type.startsWith('compare-')) return ComparisonBlock;
  return null;
};

const onBlockDragStart = (e: DragEvent, block: any) => {
  if (e.dataTransfer && activeFunctionId.value) {
    console.log('Drag start', block.id, block.type);
    e.dataTransfer.setData('existingBlockId', block.id);
    e.dataTransfer.setData('blockType', block.type);
    e.dataTransfer.setData('sourceFunctionId', activeFunctionId.value);
    e.dataTransfer.effectAllowed = 'move';
  }
};
</script>

<template>
  <div class="blocks-stack" :class="{ 'is-root': isRoot }">
    <div v-if="isRoot" class="block-item">
      <StartBlock />
      <BlockDropZone 
        slotName="" 
        :parentBlockId="''"
        :afterBlockId="'start'"
        isStackZone
      />
    </div>
    <div v-if="!isRoot && blocks.length > 0" class="block-item">
      <BlockDropZone 
        slotName="" 
        :parentBlockId="parentBlockId || ''"
        isStackZone
      />
    </div>
    <div v-for="(block, index) in blocks" 
         :key="block.id" 
         class="block-item"
         draggable="true"
         @dragstart.stop="onBlockDragStart($event, block)"
    >
      <component 
        :is="getBlockComponent(block.type)" 
        v-bind="block.type.startsWith('math-') || block.type.startsWith('compare-') ? 
          { symbol: block.type.split('-')[1], blockId: block.id, config: block.config, ...block.config.slots } : 
          (block.type === 'true' || block.type === 'false' ? 
            { value: block.type === 'true', blockId: block.id, config: block.config, ...block.config.slots } :
            { blockId: block.id, config: block.config, ...block.config.slots }
          )"
      >
        <!-- For blocks that have children (loops, conditions) -->
        <RecursiveBlockRenderer 
          v-if="block.children" 
          :blocks="block.children" 
          :parentBlockId="block.id" 
        />
      </component>
      <BlockDropZone 
        v-if="block.type !== 'break' && block.type !== 'continue' && block.type !== 'return' && !((block.type === 'if' || block.type === 'elseif') && (blocks[index+1]?.type === 'elseif' || blocks[index+1]?.type === 'else'))"
        slotName="" 
        :parentBlockId="parentBlockId || ''"
        :afterBlockId="block.id"
        isStackZone
      />
    </div>

    <!-- Drop zone to add blocks at the end of this stack if empty -->
    <BlockDropZone 
      v-if="blocks.length === 0 && parentBlockId"
      slotName="" 
      :parentBlockId="parentBlockId"
      isStackZone
    />
  </div>
</template>

<style scoped>
.blocks-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px;
  width: max-content;
}

.blocks-stack:not(.is-root) {
  width: 100%;

  > .block-item {
    width: 100%;
  }
}

.blocks-stack.is-root {
  min-width: calc(100% - 42px);
  min-height: 200px;
  height: 100vh;
  background: var(--bg-color);
  background-image: 
    radial-gradient(var(--sidebar-border) 1px, transparent 1px);
  background-size: 20px 20px;
  padding: 20px;
  margin: 0;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.05);
  border: 1px solid var(--sidebar-border);
}

.block-item {
  margin-top: -2px;
  cursor: grab;
  position: relative;
}

.block-item:active {
  cursor: grabbing;
}
</style>
