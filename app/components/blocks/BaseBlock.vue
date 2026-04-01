<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string;
  color?: string;
  minimal?: boolean;
  blockId?: string;
  blockType?: string;
  draggable?: boolean;
  noHover?: boolean;
  children?: any[];
  isRoot?: boolean;
}>(), {
  draggable: true,
  noHover: false,
  isRoot: false,
});

const { activeFunctionId, isDragging } = useFunctions();
const { onTouchStart, onTouchMove, onTouchEnd } = useMobileDragDrop();
const isOverInteractiveElement = ref(false);
const isInputFocused = ref(false);

const handleInteractionStart = () => {
  isOverInteractiveElement.value = true;
};

const handleInteractionStop = () => {
  isOverInteractiveElement.value = false;
};

const onDragStart = (e: DragEvent) => {
  const target = e.target as HTMLElement;
  const interactiveTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];
  if (target && (interactiveTags.includes(target.tagName) || target.closest('.block-input, .block-select, input, select, textarea, button'))) {
    e.preventDefault();
    return;
  }

  if (props.minimal) {
    return;
  }
  
  if (e.dataTransfer && props.blockId && activeFunctionId.value) {
    isDragging.value = true;
    e.stopPropagation();
    e.dataTransfer.setData('existingBlockId', props.blockId);
    if (props.blockType) {
      e.dataTransfer.setData('blockType', props.blockType);
    }
    e.dataTransfer.setData('sourceFunctionId', activeFunctionId.value);
    e.dataTransfer.effectAllowed = 'move';
  }
};

const onDragEnd = () => {
  isDragging.value = false;
};

const handleTouchStart = (e: TouchEvent) => {
  const target = e.target as HTMLElement;
  const interactiveTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];
  if (target && (interactiveTags.includes(target.tagName) || target.closest('.block-input, .block-select, input, select, textarea, button'))) {
    return;
  }

  if (props.minimal || isInputFocused.value) return;
  
  if (props.blockId && activeFunctionId.value) {
    isDragging.value = true;
    const data: Record<string, string> = {
      existingBlockId: props.blockId,
      sourceFunctionId: activeFunctionId.value
    };
    if (props.blockType) {
      data.blockType = props.blockType;
    }
    onTouchStart(e, data);
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  isDragging.value = false;
  onTouchEnd(e);
};

const onStopPropagation = (e: MouseEvent | TouchEvent) => {
  const target = e.target as HTMLElement;
  const interactiveTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];
  if (target && (interactiveTags.includes(target.tagName) || target.closest('.block-input, .block-select, input, select, textarea, button'))) {
    e.stopPropagation();
  }
};

const handleFocus = (e: FocusEvent) => {
  const target = e.target as HTMLElement;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
    isInputFocused.value = true;
  }
};

const handleBlur = (e: FocusEvent) => {
  const target = e.target as HTMLElement;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
    isInputFocused.value = false;
  }
};

const handleHoverInteraction = (e: MouseEvent) => {
  // Garder la détection automatique en complément pour les éléments qui n'enverraient pas l'événement
  const target = e.target as HTMLElement;
  const interactiveTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];
  if (target && (interactiveTags.includes(target.tagName) || target.closest('.block-input, .block-select, input, select, textarea, button'))) {
    isOverInteractiveElement.value = true;
  }
};

const handleMouseLeaveContent = () => {
  isOverInteractiveElement.value = false;
};
</script>

<template>
  <div
    class="block-container" 
    :class="{ 
      minimal, 
      'is-full-width': $attrs.class && ($attrs.class as string).includes('full-width'), 
      'is-root': isRoot, 
      'no-hover': noHover || isOverInteractiveElement || isInputFocused,
      'is-interacting': isOverInteractiveElement || isInputFocused
    }"
    :style="{ backgroundColor: color || '#4C97FF' }"
    v-bind="(draggable && !isOverInteractiveElement && !isInputFocused) ? { draggable: true } : { draggable: false }"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @mousedown="onStopPropagation"
    @touchstart="(e) => { onStopPropagation(e); handleTouchStart(e); }"
    @touchmove="onTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
    @focusin="handleFocus"
    @focusout="handleBlur"
    @block-interaction-start="handleInteractionStart"
    @block-interaction-stop="handleInteractionStop"
  >
    <div 
      class="block-content"
      @mouseover.capture="handleHoverInteraction"
      @mouseleave="handleMouseLeaveContent"
    >
      <span v-if="label" class="block-label">{{ label }}</span>
      <slot name="label" />
      <slot v-if="!minimal" />
    </div>
    <div v-if="$slots.bottom && !minimal" class="block-bottom-container">
      <div 
        class="block-bottom"
        @mouseover.capture="handleHoverInteraction"
        @mouseleave="handleMouseLeaveContent"
      >
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
  display: flex;
  flex-direction: column;
  padding: var(--block-padding);
  border-radius: 8px;
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-weight: 600;
  font-size: var(--block-font-size);
  user-select: none;
  cursor: grab;
  margin: var(--block-margin);
  min-width: 60px;
  width: auto;
  max-width: 100%;
  box-sizing: border-box;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.3);
  transition: all 0.2s ease-in-out;
  overflow: visible;
  height: max-content;
}

.block-container.is-root, .block-container.no-hover {
  cursor: default;
}

.block-container.is-interacting {
  cursor: default;
}

.block-container.is-full-width {
  width: calc(100% - 8px);
}

.block-container:not(.is-root):not(.no-hover):hover {
  filter: brightness(1.05);
  box-shadow: 0 4px 8px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.4);
}

.block-container:not(.is-root):not(.no-hover):active {
  cursor: grabbing;
  transform: translateY(1px);
}

.block-container.minimal {
  padding: 4px 8px;
  margin: 0;
  font-size: 11px;
  border-radius: 4px;
  min-width: auto;
}

.block-content {
  display: flex;
  align-items: center;
  gap: var(--block-gap);
  overflow: visible;
  padding-bottom: 2px;
  min-height: 24px;
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
  padding: var(--block-bottom-padding);
  display: flex;
  flex-direction: column;
  gap: var(--block-gap);
  background: var(--bg-color);
  opacity: 0.85;
  border-radius: 0 0 8px 8px;
  min-height: 24px;
  width: 100%;
  max-width: calc(100% - 12px);
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid rgba(255,255,255,0.2);
}

::v-deep(.block-input), ::v-deep(.block-select) {
  border: none;
  border-radius: 4px;
  padding: calc(var(--block-padding) / 4) 8px;
  outline: none;
  font-family: inherit;
  font-size: 0.9em;
  background: var(--input-bg);
  color: var(--input-text);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
  user-select: text;
  cursor: text;
}

::v-deep(.block-input:focus), ::v-deep(.block-select:focus) {
  box-shadow: 0 0 0 2px rgba(255,255,255,0.5), inset 0 1px 3px rgba(0,0,0,0.2);
}
</style>
