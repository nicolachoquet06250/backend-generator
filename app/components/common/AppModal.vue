<script setup lang="ts">
defineProps<{
  title?: string;
  show?: boolean;
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
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="onClose">
      <div class="modal-panel">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="onClose">×</button>
        </div>
        <div class="modal-body">
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
  z-index: 1000;
}

.modal-panel {
  background: var(--modal-bg);
  min-width: 400px;
  max-width: 90%;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--sidebar-text);
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-color);
}

.modal-body {
  margin-bottom: 24px;
  color: var(--text-color);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
