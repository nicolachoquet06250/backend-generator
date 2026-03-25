<script setup lang="ts">
import VarBlock from './VarBlock.vue';
import MathBlock from './MathBlock.vue';
import IfBlock from './IfBlock.vue';
import ElseIfBlock from './ElseIfBlock.vue';
import ElseBlock from './ElseBlock.vue';
import ForBlock from './ForBlock.vue';
import WhileBlock from './WhileBlock.vue';
import ForEachBlock from './ForEachBlock.vue';
import BreakBlock from './BreakBlock.vue';
import ContinueBlock from './ContinueBlock.vue';
import StringBlock from './StringBlock.vue';
import NumberBlock from './NumberBlock.vue';
import ArrayBlock from './ArrayBlock.vue';
import ObjectBlock from './ObjectBlock.vue';
import ObjectPropertyBlock from './ObjectPropertyBlock.vue';
import BooleanBlock from './BooleanBlock.vue';
import PrintBlock from './PrintBlock.vue';
import SetVarBlock from './SetVarBlock.vue';
import EqualBlock from './EqualBlock.vue';
import ComparisonBlock from './ComparisonBlock.vue';
import ReturnBlock from './ReturnBlock.vue';
import FunctionCallBlock from './FunctionCallBlock.vue';
import ParameterBlock from './ParameterBlock.vue';
import ArrayPushBlock from './ArrayPushBlock.vue';
import ArrayRemoveBlock from './ArrayRemoveBlock.vue';
import ArraySetKeyBlock from './ArraySetKeyBlock.vue';

const props = defineProps<{
  block: any;
  isExpression?: boolean;
}>();

const getBlockComponent = (type: string) => {
  if (type === 'var') return VarBlock;
  if (type.startsWith('math-')) return MathBlock;
  if (type === 'string') return StringBlock;
  if (type === 'number') return NumberBlock;
  if (type === 'array') return ArrayBlock;
  if (type === 'object') return ObjectBlock;
  if (type === 'object_property') return ObjectPropertyBlock;
  if (type === 'true' || type === 'false' || type === 'boolean') return BooleanBlock;
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

const getBlockProps = (block: any) => {
  if (!block) return {};
  
  const baseProps = {
    blockId: block.id,
    config: block.config,
    ...block.config?.slots,
    isExpression: props.isExpression
  };

  if (block.type.startsWith('math-') || block.type.startsWith('compare-')) {
    return { ...baseProps, symbol: block.type.split('-')[1], children: block.children };
  }

  if (block.type === 'true' || block.type === 'false' || block.type === 'boolean') {
    const isTrue = block.type === 'true' || 
                   (block.config && (block.config.value === true || block.config.value === 'true'));
    return { ...baseProps, value: isTrue, children: block.children };
  }

  return { ...baseProps, children: block.children };
};
</script>

<template>
  <component 
    v-if="block" 
    :is="getBlockComponent(block.type)" 
    v-bind="getBlockProps(block)"
  >
    <slot />
  </component>
</template>
