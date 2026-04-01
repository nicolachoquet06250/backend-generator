<script setup lang="ts">
const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits(['update:modelValue', 'block-interaction-start', 'block-interaction-stop']);

const types = ['any', 'string', 'number', 'boolean', 'array', 'object'];
const { structures } = useDataStructures();

const type = computed({
  get: () => (typeof props.modelValue === 'string' ? props.modelValue : props.modelValue.kind),
  set: (val) => {
    if (val === 'array') {
      emit('update:modelValue', { kind: 'array', itemType: 'any' });
    } else if (val === 'object') {
      emit('update:modelValue', { kind: 'object', structId: '' });
    } else {
      emit('update:modelValue', val);
    }
  }
});

const subType = computed({
  get: () => (typeof props.modelValue === 'object' ? (props.modelValue.itemType || props.modelValue.elementType) : 'any'),
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, itemType: val });
  }
});

const structId = computed({
  get: () => (typeof props.modelValue === 'object' ? props.modelValue.structId : ''),
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, structId: val });
  }
});
</script>

<template>
  <div class="type-selector">
    <select 
      v-model="type" 
      class="block-select"
      @mouseenter="$emit('block-interaction-start')"
      @mouseleave="$emit('block-interaction-stop')"
    >
      <option v-for="t in types" :key="t" :value="t">
        {{ $t(`blocks.var.types.${t}`) }}
      </option>
    </select>

    <template v-if="type === 'array'">
      <span class="struct-sep">&lt;</span>
      <TypeSelector 
        v-model="subType" 
        @block-interaction-start="$emit('block-interaction-start')"
        @block-interaction-stop="$emit('block-interaction-stop')"
      />
      <span class="struct-sep">&gt;</span>
    </template>

    <template v-if="type === 'object'">
      <span class="struct-sep">&lt;</span>
      <select 
        v-model="structId" 
        class="block-select"
        @mouseenter="$emit('block-interaction-start')"
        @mouseleave="$emit('block-interaction-stop')"
      >
        <option value="" disabled>{{ $t('blocks.var.select_struct') }}</option>
        <option v-for="s in structures" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
      <span class="struct-sep">&gt;</span>
    </template>
  </div>
</template>

<style scoped>
.type-selector {
  display: inline-flex;
  align-items: center;
}
.block-select {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 0.9em;
  background: var(--input-bg);
  color: var(--input-text);
  cursor: pointer;
  min-width: 80px;
}
.struct-sep {
  margin: 0 2px;
  font-weight: bold;
  opacity: 0.8;
}
</style>
