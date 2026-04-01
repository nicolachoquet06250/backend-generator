<script setup lang="ts">
import VarBlock from '~/components/blocks/VarBlock.vue';
import MathBlock from '~/components/blocks/MathBlock.vue';
import IfBlock from '~/components/blocks/IfBlock.vue';
import ElseIfBlock from '~/components/blocks/ElseIfBlock.vue';
import ElseBlock from '~/components/blocks/ElseBlock.vue';
import ForBlock from '~/components/blocks/ForBlock.vue';
import WhileBlock from '~/components/blocks/WhileBlock.vue';
import ForEachBlock from '~/components/blocks/ForEachBlock.vue';
import BreakBlock from '~/components/blocks/BreakBlock.vue';
import ContinueBlock from '~/components/blocks/ContinueBlock.vue';
import StringBlock from '~/components/blocks/StringBlock.vue';
import NumberBlock from '~/components/blocks/NumberBlock.vue';
import ArrayBlock from '~/components/blocks/ArrayBlock.vue';
import ObjectBlock from '~/components/blocks/ObjectBlock.vue';
import ObjectPropertyBlock from '~/components/blocks/ObjectPropertyBlock.vue';
import BooleanBlock from '~/components/blocks/BooleanBlock.vue';
import PrintBlock from '~/components/blocks/PrintBlock.vue';
import SetVarBlock from '~/components/blocks/SetVarBlock.vue';
import EqualBlock from '~/components/blocks/EqualBlock.vue';
import ComparisonBlock from '~/components/blocks/ComparisonBlock.vue';
import TernaryBlock from '~/components/blocks/TernaryBlock.vue';
import ReturnBlock from '~/components/blocks/ReturnBlock.vue';
import FunctionCallBlock from '~/components/blocks/FunctionCallBlock.vue';
import ParameterBlock from '~/components/blocks/ParameterBlock.vue';
import ArrayPushBlock from '~/components/blocks/ArrayPushBlock.vue';
import ArrayRemoveBlock from '~/components/blocks/ArrayRemoveBlock.vue';
import ArraySetKeyBlock from '~/components/blocks/ArraySetKeyBlock.vue';
import JsonBlock from '~/components/blocks/JsonBlock.vue';
import HtmlBlock from '~/components/blocks/HtmlBlock.vue';
import NewRouteBlock from '~/components/blocks/NewRouteBlock.vue';
import ThisBlock from '~/components/blocks/ThisBlock.vue';

const props = defineProps<{
  parentBlockId?: any;
  block: any;
  isExpression?: boolean;
  filterContext?: string;
}>();

const getBlockComponent = (type: string) => {
  if (type === 'var') return VarBlock;
  if (type === 'this') return ThisBlock;
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
  if (type === 'ternary') return TernaryBlock;
  if (type === 'return') return ReturnBlock;
  if (type === 'function') return FunctionCallBlock;
  if (type === 'parameter') return ParameterBlock;
  if (type === 'array_push') return ArrayPushBlock;
  if (type === 'array_remove') return ArrayRemoveBlock;
  if (type === 'array_set_key') return ArraySetKeyBlock;
  if (type === 'json') return JsonBlock;
  if (type === 'html') return HtmlBlock;
  if (type === 'new_route') return NewRouteBlock;
  if (type.startsWith('compare-')) return ComparisonBlock;
  return null;
};

const getBlockProps = (block: any) => {
  if (!block) return {};
  
  const { key, ...slotsWithoutKey } = block.config?.slots || {};
  
  const baseProps = {
    blockId: block.id,
    config: block.config,
    ...slotsWithoutKey,
    isExpression: props.isExpression,
    filterContext: props.filterContext
  };

  if (block.type.startsWith('math-') || block.type.startsWith('compare-')) {
    return { ...baseProps, symbol: block.type.split('-')[1], children: block.children, parentBlockId: props.parentBlockId };
  }

  if (block.type === 'true' || block.type === 'false' || block.type === 'boolean') {
    const isTrue = block.type === 'true' || 
                   (block.config && (block.config.value === true || block.config.value === 'true'));
    return { ...baseProps, value: isTrue, children: block.children, parentBlockId: props.parentBlockId };
  }

  if (block.type === 'array_set_key') {
    return { 
      ...baseProps, 
      array: block.config?.slots?.array,
      targetKey: block.config?.slots?.targetKey || block.config?.slots?.key, 
      value: block.config?.slots?.value,
      children: block.children, 
      parentBlockId: props.parentBlockId 
    };
  }

  if (block.type === 'ternary') {
    return { 
      ...baseProps, 
      condition: block.config?.slots?.condition,
      isTrue: block.config?.slots?.isTrue,
      isFalse: block.config?.slots?.isFalse,
      children: block.children, 
      parentBlockId: props.parentBlockId 
    };
  }

  if (block.type === 'new_route' || block.type === 'json' || block.type === 'html') {
    return { ...baseProps, value: block.config?.slots?.value, children: block.children, parentBlockId: props.parentBlockId };
  }

  return { ...baseProps, children: block.children, parentBlockId: props.parentBlockId };
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
