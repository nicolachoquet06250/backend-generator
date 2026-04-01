<script setup lang="ts">
import PWAManager from '~/components/common/PWAManager.vue';
import { useMigration } from '~/composables/useMigration';

const { migrateLegacyData } = useMigration();
const route = useRoute();

const isLandingPage = computed(() => route.path === '/');

onMounted(() => {
  migrateLegacyData();
});

useHead({
  bodyAttrs: {
    class: computed(() => isLandingPage.value ? 'has-landing-page' : '')
  }
});
</script>

<template>
  <div class="app-root" :class="{ 'landing-page-root': isLandingPage }">
    <NuxtPage />
    <PWAManager />
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

[draggable] {
  user-select: none;
  -webkit-user-drag: element;
}

:root {
  --bg-color: #ffffff;
  --text-color: #333333;
  --text-color-rgb: 51, 51, 51;
  --header-bg: #4C97FF;
  --header-text: white;
  --sidebar-bg: #f8f9fa;
  --sidebar-border: #dee2e6;
  --sidebar-section-bg: white;
  --sidebar-section-border: #e9ecef;
  --sidebar-text: #6c757d;
  --panel-bg: white;
  --overlay-bg: rgba(0, 0, 0, 0.5);
  --modal-bg: white;
  --btn-struct: rgba(255, 255, 255, 0.2);
  --btn-lang: transparent;
  --btn-lang-border: rgba(255, 255, 255, 0.5);
  --btn-lang-active-bg: white;
  --btn-lang-active-text: #4C97FF;
  --add-btn-bg: #FF4500;
  --add-btn-text: white;
  --workspace-bg: #f8f9fa;
  --tabs-bg: #e9ecef;
  --tab-bg: #dee2e6;
  --tab-text: #495057;
  --tab-active-bg: white;
  --tab-active-text: #4C97FF;
  --tab-hover-bg: #ced4da;
  --input-bg: white;
  --input-text: #333;
  --input-border: #ddd;

  --card-bg: #ffffff;
  --card-border: #e0e0e0;
  --card-hover-border: #3498db;
  --card-shadow: 0 2px 4px rgba(0,0,0,0.05);
  --card-hover-shadow: 0 4px 12px rgba(0,0,0,0.1);
  --secondary-text: #7f8c8d;
  --danger-color: #e74c3c;
  --danger-bg: #fdedec;
  --primary-color: #3498db;
  --primary-hover: #2980b9;
    
  --block-padding-v: 8px;
  --block-padding-h: 12px;
  --block-padding: var(--block-padding-v) var(--block-padding-h);
  --block-margin: 4px;
  --block-gap: 8px;
  --block-font-size: 14px;
  --block-bottom-padding: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1a1a1a;
    --text-color: #e0e0e0;
    --text-color-rgb: 224, 224, 224;
    --header-bg: #2b5797;
    --header-text: #ffffff;
    --sidebar-bg: #252525;
    --sidebar-border: #333333;
    --sidebar-section-bg: #2d2d2d;
    --sidebar-section-border: #404040;
    --sidebar-text: #a0a0a0;
    --panel-bg: #2d2d2d;
    --overlay-bg: rgba(0, 0, 0, 0.7);
    --modal-bg: #2d2d2d;
    --btn-struct: rgba(255, 255, 255, 0.1);
    --btn-lang: transparent;
    --btn-lang-border: rgba(255, 255, 255, 0.3);
    --btn-lang-active-bg: #4C97FF;
    --btn-lang-active-text: white;
    --add-btn-bg: #cc3700;
    --workspace-bg: #1e1e1e;
    --tabs-bg: #252525;
    --tab-bg: #333333;
    --tab-text: #b0b0b0;
    --tab-active-bg: #1e1e1e;
    --tab-active-text: #4C97FF;
    --tab-hover-bg: #404040;
    --input-bg: #333;
    --input-text: #eee;
    --input-border: #444;

    --card-bg: #2d2d2d;
    --card-border: #404040;
    --card-hover-border: #3498db;
    --card-shadow: 0 2px 8px rgba(0,0,0,0.2);
    --card-hover-shadow: 0 8px 24px rgba(0,0,0,0.3);
    --secondary-text: #a0a0a0;
    --danger-color: #ff6b6b;
    --danger-bg: rgba(231, 76, 60, 0.2);
    --primary-color: #3498db;
    --primary-hover: #5dade2;
  }
}

body {
  margin: 0;
  font-family: sans-serif;
  overflow: hidden;
  background-color: var(--bg-color);
  color: var(--text-color);
}

body.has-landing-page {
  overflow: auto;
}

.app-root {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.app-root.landing-page-root {
  position: relative;
  height: auto;
  min-height: 100vh;
  overflow: auto;
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
