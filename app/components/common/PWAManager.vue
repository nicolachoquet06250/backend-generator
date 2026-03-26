<template>
  <Transition name="toast">
    <div v-if="$pwa?.offlineReady || $pwa?.needRefresh" class="pwa-toast" role="alert" aria-live="assertive">
      <div class="toast-content">
        <div class="icon">
          <svg v-if="$pwa?.offlineReady" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </div>
        <div class="message">
          <span v-if="$pwa?.offlineReady">
            {{ $t('pwa.offline_ready') }}
          </span>
          <span v-else>
            {{ $t('pwa.new_content') }}
          </span>
        </div>
      </div>
      <div class="actions">
        <button v-if="$pwa?.needRefresh" class="btn-primary" @click="$pwa?.updateServiceWorker()">
          {{ $t('pwa.reload') }}
        </button>
        <button class="btn-secondary" @click="$pwa?.cancelPrompt()">
          {{ $t('pwa.close') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { $pwa } = useNuxtApp()
</script>

<style scoped>
.pwa-toast {
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 30000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: calc(100% - 32px);
  max-width: 420px;
  padding: 20px;
  background: var(--modal-bg);
  color: var(--text-color);
  border: 2px solid var(--header-bg);
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(76, 151, 255, 0.1);
  border-radius: 10px;
  color: var(--header-bg);
}

.message {
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 600;
  flex: 1;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}

button {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  outline: none;
}

button:focus-visible {
  box-shadow: 0 0 0 3px rgba(76, 151, 255, 0.4);
}

.btn-primary {
  background: var(--header-bg);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 151, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(76, 151, 255, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: var(--sidebar-bg);
  color: var(--text-color);
  border: 1px solid var(--sidebar-border);
}

.btn-secondary:hover {
  background: var(--tab-hover-bg);
  border-color: var(--sidebar-text);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(40px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

@media (max-width: 768px) {
  .pwa-toast {
    left: 50%;
    transform: translateX(-50%);
    bottom: 32px;
    width: calc(100% - 32px);
    max-width: none;
    margin: 0;
  }

  .toast-enter-from {
    opacity: 0;
    transform: translate(-50%, 40px) scale(0.95);
  }

  .toast-leave-to {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
}
</style>
