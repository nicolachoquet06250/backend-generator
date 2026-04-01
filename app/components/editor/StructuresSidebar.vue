<script setup lang="ts">
import StructBlock from '../blocks/StructBlock.vue';
const { structures, addStructure, removeStructure } = useDataStructures();
const { t } = useI18n();

defineEmits(['close']);

const newStructName = ref('');

const addNewStructure = () => {
  if (newStructName.value.trim()) {
    addStructure(newStructName.value.trim());
    newStructName.value = '';
  }
};
</script>

<template>
  <div class="structures-sidebar">
    <div class="sidebar-header">
      <h2>{{ $t('sections.structures') }}</h2>
      <button class="close-btn" @click="$emit('close')" :title="t('common.close')">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="add-structure">
      <input 
        v-model="newStructName" 
        :placeholder="$t('blocks.struct.placeholder_name')"
        @keyup.enter="addNewStructure"
      />
      <button @click="addNewStructure" :disabled="!newStructName.trim()">+</button>
    </div>

    <div class="structures-list">
      <div v-for="struct in structures" :key="struct.id" class="struct-item">
        <div class="struct-actions">
          <button class="delete-btn" @click="removeStructure(struct.id)" v-if="struct.id !== 'req' && struct.id !== 'res'">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
        <StructBlock 
          :id="struct.id"
          v-model:name="struct.name"
          :fields="struct.fields"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.structures-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--panel-bg);
  color: var(--text-color);
}

.sidebar-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--sidebar-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-color);
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: var(--sidebar-border);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.add-structure {
  padding: 15px 20px;
  display: flex;
  gap: 8px;
}

.add-structure input {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--sidebar-border);
  color: var(--text-color);
  padding: 6px 12px;
  border-radius: 4px;
  outline: none;
}

.add-structure button {
  background: var(--primary-color);
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.add-structure button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.structures-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.struct-item {
  position: relative;
}

.struct-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.delete-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.delete-btn:hover {
  opacity: 1;
  background: var(--danger-color);
}
</style>
