<script setup lang="ts">
defineProps<{
  title?: string;
  show?: boolean;
  hasPadding?: boolean;
}>();

const emit = defineEmits(['close', 'confirm']);

const onClose = () => {
  emit('close');
};

const onConfirm = () => {
  emit('confirm');
};
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="modal-overlay" @click.self="onClose">
        <div class="modal-panel">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button class="close-btn" @click="onClose">×</button>
          </div>
          <div class="modal-body" :class="{ 'has-padding': hasPadding }">
            <slot></slot>
          </div>
          <div class="modal-actions">
            <slot name="actions">
              <button class="btn btn-secondary" @click="onClose">{{ $t('common.cancel') }}</button>
              <button class="btn btn-primary" @click="onConfirm">{{ $t('common.confirm') }}</button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20000;
}

.modal-panel {
  background: var(--modal-bg);
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 768px) {
  .modal-panel {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--sidebar-border);
  background: var(--sidebar-bg);
  border-radius: 12px 12px 0 0;
}

@media (max-width: 768px) {
  .modal-header {
    padding: 12px 16px;
    border-radius: 0;
  }
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color);
  letter-spacing: -0.01em;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--sidebar-section-bg);
  border: 1px solid var(--sidebar-section-border);
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  color: var(--sidebar-text);
  line-height: 1;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #ff4c4c;
  color: white;
  border-color: #ff4c4c;
}

.modal-body {
  color: var(--text-color);
  overflow-y: auto;
  flex: 1;
}

.modal-body.has-padding {
  padding: 24px;
}

@media (max-width: 768px) {
  .modal-body {
    padding: 0;
  }
  .modal-body.has-padding {
    padding: 16px;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--sidebar-border);
  background: var(--sidebar-bg);
}

@media (max-width: 768px) {
  .modal-actions {
    padding: 12px 16px;
  }
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #4C97FF;
  color: white;
}

.btn-primary:hover {
  background: #3a86f0;
}

.btn-secondary {
  background: var(--tab-bg);
  color: var(--tab-text);
}

.btn-secondary:hover {
  background: var(--tab-hover-bg);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
