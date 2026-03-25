<script setup lang="ts">
import RecursiveBlockRenderer from './RecursiveBlockRenderer.vue';
import AppModal from '../common/AppModal.vue';

const { t } = useI18n();
const { functions, activeFunctionId, addFunction, removeFunction, addBlockToFunction, removeBlockFromFunction, getBlockById } = useFunctions();

const showCreateModal = ref(false);
const newFunctionName = ref('');
const funcNameInput = ref<HTMLInputElement | null>(null);

const hasSpaces = computed(() => /\s/.test(newFunctionName.value));
const isValid = computed(() => newFunctionName.value.trim().length > 0 && !hasSpaces.value);

const createFunction = () => {
  newFunctionName.value = t('workspace.add_function').replace(/\s+/g, '_');
  showCreateModal.value = true;
  nextTick(() => {
    funcNameInput.value?.focus();
    funcNameInput.value?.select();
  });
};

const confirmCreateFunction = () => {
  if (isValid.value) {
    addFunction(newFunctionName.value.trim());
    showCreateModal.value = false;
  }
};

const activeFunction = computed(() => functions.value.find(f => f.id === activeFunctionId.value));

const isDraggingOverTrash = ref(false);

const onDrop = (e: DragEvent) => {
  const type = e.dataTransfer?.getData('blockType');
  const existingBlockId = e.dataTransfer?.getData('existingBlockId');
  const sourceFunctionId = e.dataTransfer?.getData('sourceFunctionId') || activeFunctionId.value;
  
  // Restriction for break/continue: they cannot be dropped at the root because root is never a loop
  if ((type === 'break' || type === 'continue') || 
      (existingBlockId && (getBlockById(sourceFunctionId, existingBlockId)?.type === 'break' || getBlockById(sourceFunctionId, existingBlockId)?.type === 'continue'))) {
    // Root is never in a loop
    return;
  }

  // If it's a new block from sidebar
  if (type && !existingBlockId && activeFunctionId.value) {
    addBlockToFunction(activeFunctionId.value, type, undefined, undefined, undefined, undefined);
  } 
  // If it's an existing block being moved to the root
  else if (existingBlockId && sourceFunctionId && activeFunctionId.value) {
    const block = getBlockById(sourceFunctionId, existingBlockId);
    if (block) {
      removeBlockFromFunction(sourceFunctionId, existingBlockId);
      addBlockToFunction(activeFunctionId.value, block.type, undefined, undefined, block, undefined);
    }
  }
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (e.dataTransfer) {
    const isExisting = e.dataTransfer.types.includes('existingblockid');
    e.dataTransfer.dropEffect = isExisting ? 'move' : 'copy';
  }
};

const onBlockDragStart = (e: DragEvent, blockId: string) => {
  if (e.dataTransfer && activeFunctionId.value) {
    e.dataTransfer.setData('existingBlockId', blockId);
    e.dataTransfer.setData('sourceFunctionId', activeFunctionId.value);
    e.dataTransfer.effectAllowed = 'move';
  }
};

const onTrashDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDraggingOverTrash.value = true;
};

const onTrashDragLeave = () => {
  isDraggingOverTrash.value = false;
};

const onTrashDrop = (e: DragEvent) => {
  const blockId = e.dataTransfer?.getData('existingBlockId');
  if (blockId && activeFunctionId.value) {
    removeBlockFromFunction(activeFunctionId.value, blockId);
  }
  isDraggingOverTrash.value = false;
};
</script>

<template>
  <div class="workspace">
    <div class="tabs">
      <div v-for="func in functions" 
           :key="func.id" 
           class="tab" 
           :class="{ active: activeFunctionId === func.id }"
           @click="activeFunctionId = func.id"
      >
        {{ func.name }}
        <span class="close-tab" @click.stop="removeFunction(func.id)">×</span>
      </div>
      <button class="add-tab" @click="createFunction">+</button>
    </div>

    <div class="workspace-body">
      <div class="drop-zone" 
           @dragover="onDragOver" 
           @drop="onDrop"
      >
        <RecursiveBlockRenderer v-if="activeFunction" :blocks="activeFunction.blocks" is-root />
      </div>

      <div 
        class="trash-bin" 
        :class="{ active: isDraggingOverTrash }"
        @dragover="onTrashDragOver"
        @dragleave="onTrashDragLeave"
        @drop="onTrashDrop"
      >
        <div class="trash-icon">🗑️</div>
      </div>
    </div>

    <AppModal
      :show="showCreateModal"
      :title="$t('workspace.add_function')"
      @close="showCreateModal = false"
      @confirm="confirmCreateFunction"
    >
      <div class="prompt-content">
        <label for="func-name">{{ $t('workspace.function_name_prompt') }}</label>
        <input 
          id="func-name"
          ref="funcNameInput"
          v-model="newFunctionName" 
          class="modal-input" 
          :class="{ 'input-error': hasSpaces }"
          @keyup.enter="confirmCreateFunction"
        />
        <span v-if="hasSpaces" class="error-text">{{ $t('workspace.error_no_spaces') }}</span>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  max-width: calc(100vw - 361px);
  background: var(--workspace-bg);
}

.tabs {
  display: flex;
  background: var(--tabs-bg);
  padding: 8px 8px 0 8px;
  gap: 4px;
}

.tab {
  padding: 10px 20px;
  background: var(--tab-bg);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--tab-text);
  transition: all 0.2s ease;
  border: 1px solid transparent;
  border-bottom: none;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 14px;
}

.tab:hover {
  background: var(--tab-hover-bg);
}

.tab.active {
  background: var(--tab-active-bg);
  color: var(--tab-active-text);
  border-color: var(--sidebar-border);
  box-shadow: 0 -2px 5px rgba(0,0,0,0.05);
}

.close-tab {
  font-size: 1.2em;
  opacity: 0.5;
  transition: opacity 0.2s;
  color: inherit;
}

.close-tab:hover {
  opacity: 1;
  color: #dc3545;
}

.add-tab {
  border: none;
  background: var(--header-bg);
  color: white;
  font-size: 18px;
  padding: 0 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.add-tab:hover {
  opacity: 0.9;
}

.workspace-body {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.drop-zone {
  flex: 1;
  padding: 20px;
  overflow: auto;
  display: flex;
  flex-direction: column;

  &:has(.is-root) {
    padding: 0;
  }
}

.trash-bin {
  position: absolute;
  bottom: -20px;
  right: 40px;
  width: 100px;
  height: 100px;
  background: var(--modal-bg);
  border: 2px dashed #ff4c4c;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  color: #ff4c4c;
  pointer-events: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.trash-bin:hover, .trash-bin.active {
  transform: scale(1.1);
  box-shadow: 0 8px 20px rgba(220, 53, 69, 0.2);
}

.trash-bin.active {
  background: rgba(220, 53, 69, 0.1);
  border-style: solid;
  border-color: #dc3545;
}

.trash-icon {
  font-size: 2em;
  user-select: none;
}

.trash-text {
  font-size: 0.8em;
  font-weight: 600;
  margin-top: 4px;
}

.prompt-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-content label {
  font-size: 14px;
  color: var(--sidebar-text);
}

.modal-input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: #4C97FF;
}

.input-error {
  border-color: #dc3545 !important;
}

.error-text {
  color: #dc3545;
  font-size: 12px;
  margin-top: -8px;
}
</style>
