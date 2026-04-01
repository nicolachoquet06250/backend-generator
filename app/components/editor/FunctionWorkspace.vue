<script setup lang="ts">
import RecursiveBlockRenderer from './RecursiveBlockRenderer.vue';
import AppModal from '../common/AppModal.vue';
import { useMobileDragDrop } from '~/composables/useMobileDragDrop';

const { isCompact } = useSettings();
const { t } = useI18n();
const { functions, activeFunctionId, isDragging, addFunction, removeFunction, addBlockToFunction, removeBlockFromFunction, getBlockById } = useFunctions();
const { structures } = useDataStructures();
const { onTouchMove, onTouchEnd } = useMobileDragDrop();
const { formatType } = useTypeFormatter();

const showCreateModal = ref(false);
const newFunctionName = ref('');
const selectedStructureId = ref<string | undefined>(undefined);
const funcNameInput = ref<HTMLInputElement | null>(null);

const hasSpaces = computed(() => /\s/.test(newFunctionName.value));
const isValid = computed(() => newFunctionName.value.trim().length > 0 && !hasSpaces.value);

const createFunction = () => {
  newFunctionName.value = t('workspace.add_function').replace(/\s+/g, '_');
  selectedStructureId.value = undefined;
  showCreateModal.value = true;
  nextTick(() => {
    funcNameInput.value?.focus();
    funcNameInput.value?.select();
  });
};

const confirmCreateFunction = () => {
  if (isValid.value) {
    addFunction(newFunctionName.value.trim(), selectedStructureId.value);
    showCreateModal.value = false;
  }
};

const activeFunction = computed(() => functions.value.find(f => f.id === activeFunctionId.value));

const groupedFunctions = computed(() => {
  const groups: Record<string, typeof functions.value> = {};
  
  // Groupe pour les fonctions sans structure
  groups['none'] = [];
  
  // Créer des groupes pour chaque structure existante
  structures.value.forEach(s => {
    groups[s.id] = [];
  });
  
  // Répartir les fonctions dans les groupes
  functions.value.forEach(f => {
    const structId = f.metadata?.structureId;
    if (structId && groups[structId]) {
      groups[structId].push(f);
    } else {
      groups['none']?.push(f);
    }
  });
  
  // Filtrer les groupes vides (sauf le groupe 'none' s'il contient des fonctions)
  const result: Array<{ id: string, name: string, functions: typeof functions.value }> = [];
  
  if (groups['none'].length > 0) {
    result.push({ id: 'none', name: t('workspace.none'), functions: groups['none'] });
  }
  
  structures.value.forEach(s => {
    if (groups[s.id]?.length! > 0) {
      result.push({ id: s.id, name: s.name, functions: groups[s.id]! });
    }
  });
  
  return result;
});

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
    const types = Array.from(e.dataTransfer.types);
    const isExisting = types.some(t => t.toLowerCase() === 'existingblockid');
    e.dataTransfer.dropEffect = isExisting ? 'move' : 'copy';
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

const onMobileDrop = (e: any) => {
  const dataTransfer = e.detail.dataTransfer;
  const existingBlockId = dataTransfer.getData('existingBlockId');
  
  if (existingBlockId) {
    // Si c'est un bloc existant qu'on déplace dans le vide du workspace, 
    // on ne fait rien pour l'instant (ou on pourrait le déplacer à la racine)
    // Le comportement actuel du desktop semble ne rien faire si on drop un bloc existant 
    // en dehors d'une zone de drop.
    return;
  }

  onDrop({ 
    dataTransfer,
    preventDefault: () => {},
    stopPropagation: () => {}
  } as any);
};

const onMobileTrashDragOver = () => {
  isDraggingOverTrash.value = true;
};

const onMobileTrashDrop = (e: any) => {
  const dataTransfer = e.detail.dataTransfer;
  const blockId = dataTransfer.getData('existingBlockId');
  if (blockId && activeFunctionId.value) {
    removeBlockFromFunction(activeFunctionId.value, blockId);
  }
  isDraggingOverTrash.value = false;
};

const onMobileTrashDragLeave = () => {
  isDraggingOverTrash.value = false;
};
</script>

<template>
  <div class="workspace" :class="{ 'is-compact': isCompact }">
    <div class="tabs-container">
      <div v-for="group in groupedFunctions" :key="group.id" class="tab-group">
        <div class="tab-group-label" v-if="groupedFunctions.length > 1">
          {{ group.name }}
        </div>
        <div class="tabs">
          <div v-for="func in group.functions" 
               :key="func.id" 
               class="tab" 
               :class="{ active: activeFunctionId === func.id }"
               @click="activeFunctionId = func.id"
          >
            <span class="tab-name">{{ func.name }}</span>
            <span class="tab-return-type">({{ formatType(func.metadata?.returnType) }})</span>
            <span v-if="func.name !== 'main'" class="close-tab" @click.stop="removeFunction(func.id)">×</span>
          </div>
        </div>
      </div>
    </div>

    <div class="workspace-body">
      <div class="drop-zone" 
           @dragover="onDragOver" 
           @drop="onDrop"
           @mobile-dragover="onDragOver({ preventDefault: () => {} } as any)"
           @mobile-drop="onMobileDrop"
           @touchmove="onTouchMove"
           @touchend="onTouchEnd"
           @touchcancel="onTouchEnd"
      >
        <RecursiveBlockRenderer v-if="activeFunction" :blocks="activeFunction.blocks" is-root />
      </div>

      <div 
        class="trash-bin" 
        :class="{ active: isDraggingOverTrash, 'enable-hover': isDragging }"
        @dragover="onTrashDragOver"
        @dragleave="onTrashDragLeave"
        @drop="onTrashDrop"
        @mobile-dragover="onMobileTrashDragOver"
        @mobile-dragleave="onMobileTrashDragLeave"
        @mobile-drop="onMobileTrashDrop"
        @dragleave.passive="onTrashDragLeave"
      >
        <div class="trash-icon">🗑️</div>
      </div>

      <button class="add-tab-floating" @click="createFunction">
        <span>+</span>
      </button>
    </div>

    <AppModal
      :show="showCreateModal"
      :title="$t('workspace.add_function')"
      has-padding
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

        <label for="func-struct">{{ $t('workspace.function_structure_prompt') }}</label>
        <select id="func-struct" v-model="selectedStructureId" class="modal-input">
          <option :value="undefined">{{ $t('workspace.none') }}</option>
          <option v-for="struct in structures" :key="struct.id" :value="struct.id">
            {{ struct.name }}
          </option>
        </select>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--workspace-bg);
  overflow: auto;
  transition: all 0.2s ease-in-out;
}

@media (max-width: 768px) {
  .workspace {
    width: 100%;
  }
}

.tabs-container {
  display: flex;
  background: var(--tabs-bg);
  padding: calc(var(--block-padding-v) / 2) var(--block-padding-h);
  padding-bottom: 0;
  gap: var(--block-gap);
  overflow-x: auto;
  scrollbar-width: thin;
  border-bottom: 1px solid var(--sidebar-border);
}

.tab-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tab-group-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--tab-text);
  opacity: 0.6;
  font-weight: bold;
  padding-top: 5px;
  padding-left: 4px;
  letter-spacing: 0.5px;
}

.tabs {
  display: flex;
  gap: 4px;
}

.tab {
  padding: 10px 16px;
  background: var(--tab-bg);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-weight: 600;
  color: var(--tab-text);
  transition: all 0.2s ease;
  border: 1px solid transparent;
  border-bottom: none;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: var(--block-font-size);
  white-space: nowrap;
}

.is-compact .tab {
  padding: 6px 12px;
}

.tab-return-type {
  font-size: 0.85em;
  opacity: 0.7;
  font-weight: normal;
  font-style: italic;
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

.add-tab-floating {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: calc(var(--header-height) * 0.9);
  height: calc(var(--header-height) * 0.9);
  background: var(--header-bg);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: calc(var(--block-font-size) * 1.5);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  z-index: 10001;
  transition: all 0.2s ease;
}

.add-tab-floating:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 15px rgba(0,0,0,0.4);
}

.add-tab-floating:active {
  transform: scale(0.95);
}

@media (min-width: 769px) {
  .add-tab-floating {
    position: absolute;
    bottom: 32px;
    right: 140px;
  }
}

.workspace-body {
  flex: 1;
  display: flex;
  position: relative;
  overflow: auto;
}

.drop-zone {
  flex: 1;
  padding: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.drop-zone:has(.is-root) {
  padding-bottom: 0;
}

.trash-bin {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 80px;
  background: var(--modal-bg);
  border: 3px dashed #ff4c4c;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  color: #ff4c4c;
  pointer-events: auto;
  z-index: 10000;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

@media (max-width: 768px) {
  .trash-bin {
    left: 20px;
    transform: none;
    width: 60px;
    height: 60px;
  }
}

.trash-bin.enable-hover:hover, .trash-bin.active {
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .trash-bin.enable-hover:hover, .trash-bin.active {
    transform: scale(1.1);
  }
}

@media (min-width: 769px) {
  .trash-bin.enable-hover:hover, .trash-bin.active {
    transform: scale(1.1);
  }
}

.trash-bin.active {
  background: rgba(220, 53, 69, 0.15);
  border-style: solid;
  border-color: #dc3545;
}

@media (min-width: 769px) {
  .trash-bin {
    position: absolute;
    bottom: 20px;
    right: 40px;
    left: auto;
    transform: none;
    width: 80px;
    height: 80px;
  }
}

.trash-icon {
  font-size: 24px;
  user-select: none;
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
