<script setup lang="ts">
const props = defineProps<{
  label?: string;
  color?: string;
  minimal?: boolean;
  blockId?: string;
  blockType?: string;
}>();

const { activeFunctionId } = useFunctions();

const onDragStart = (e: DragEvent) => {
  if (props.minimal) return; // Don't drag from sidebar via this handler
  if (e.dataTransfer && props.blockId && activeFunctionId.value) {
    e.stopPropagation();
    e.dataTransfer.setData('existingBlockId', props.blockId);
    if (props.blockType) {
      e.dataTransfer.setData('blockType', props.blockType);
    }
    e.dataTransfer.setData('sourceFunctionId', activeFunctionId.value);
    e.dataTransfer.effectAllowed = 'move';
  }
};
</script>

<template>
  <div 
    class="block-container" 
    :class="{ minimal }"
    :style="{ backgroundColor: color || '#4C97FF' }"
    draggable="true"
    @dragstart="onDragStart"
  >
    <div class="block-content">
      <span v-if="label" class="block-label">{{ label }}</span>
      <slot v-if="!minimal" />
    </div>
    <div v-if="$slots.bottom && !minimal" class="block-bottom-container">
      <div class="block-bottom">
        <slot name="bottom" />
      </div>
    </div>
  </div>
</template>

<style>
.block-bottom {
  .block-drop-zone.is-stack-zone {
    width: calc(100% - 15px);
    margin: 0 10px 0 0;

    &:hover,
    &.is-dragging-over {
      margin: 2px 10px 2px 0;
    }
  }
}
</style>

<style scoped>
.block-container {
  display: inline-flex;
  flex-direction: column;
  padding: 8px 12px;
  border-radius: 8px;
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-weight: 600;
  font-size: 14px;
  user-select: none;
  cursor: grab;
  margin: 4px;
  min-width: 60px;
  max-width: 100%;
  box-sizing: border-box;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.3);
  transition: transform 0.1s, box-shadow 0.1s;
}

.block-container:hover {
  filter: brightness(1.05);
  box-shadow: 0 4px 8px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.4);
}

.block-container:active {
  cursor: grabbing;
  transform: translateY(1px);
}

.block-container.minimal {
  padding: 6px 10px;
  margin: 2px;
  font-size: 12px;
  border-radius: 6px;
}

.block-content {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.block-content::-webkit-scrollbar {
  height: 4px;
}

.block-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.block-container.minimal .block-content {
  gap: 0;
}

.block-label {
  margin-right: 4px;
  text-shadow: 0 1px 1px rgba(0,0,0,0.2);
}

.block-bottom-container {
  display: flex;
  margin-top: 4px;
}

.block-bottom {
  margin-left: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--bg-color);
  opacity: 0.85;
  border-radius: 0 0 8px 8px;
  min-height: 24px;
  width: 100%;
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid rgba(255,255,255,0.2);
}

::v-deep(.block-input), ::v-deep(.block-select) {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-family: inherit;
  font-size: 0.9em;
  background: var(--input-bg);
  color: var(--input-text);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
}

::v-deep(.block-input:focus), ::v-deep(.block-select:focus) {
  box-shadow: 0 0 0 2px rgba(255,255,255,0.5), inset 0 1px 3px rgba(0,0,0,0.2);
}
</style>
