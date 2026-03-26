<script setup lang="ts">
import BlockSidebar from './components/editor/BlockSidebar.vue';
import FunctionWorkspace from './components/editor/FunctionWorkspace.vue';
import StructBlock from './components/blocks/StructBlock.vue';
import PWAManager from './components/common/PWAManager.vue';

const { locale, locales, setLocale } = useI18n();
const { structures, addStructure, removeStructure } = useDataStructures();
const { isMobile } = useDevice();

const showStructures = ref(false);

function getPWADisplayMode() {
  if (document.referrer.startsWith('android-app://'))
    return 'twa';
  if (window.matchMedia('(display-mode: browser)').matches)
    return 'browser';
  if (window.matchMedia('(display-mode: standalone)').matches)
    return 'standalone';
  if (window.matchMedia('(display-mode: minimal-ui)').matches)
    return 'minimal-ui';
  if (window.matchMedia('(display-mode: fullscreen)').matches)
    return 'fullscreen';
  if (window.matchMedia('(display-mode: window-controls-overlay)').matches)
    return 'window-controls-overlay';

  return 'unknown';
}
</script>

<template>
  <div class="editor-layout" :class="[{ 'mobile-mode': isMobile }, getPWADisplayMode()]">
    <header class="main-header">
      <div class="logo">
        <h1>{{ $t('welcome') }}</h1>
      </div>
      <div class="header-actions">
        <button class="struct-toggle" @click="showStructures = !showStructures">
          {{ $t('sections.structures') }} <template v-if="!isMobile">({{ structures.length }})</template>
        </button>
        <div class="lang-switcher">
          <button 
            v-for="loc in locales" 
            :key="loc.code"
            @click="setLocale(loc.code)"
            :class="{ active: locale === loc.code }"
          >
            <template v-if="isMobile">
              {{ loc.name?.substring(0, 2) }}
            </template>
            <template v-else>
              {{ loc.name }}
            </template>
          </button>
        </div>
      </div>
    </header>

    <main class="editor-body">
      <BlockSidebar class="desktop-only" />
      <FunctionWorkspace />
      
      <!-- Overlay for Structures -->
      <Transition name="fade">
        <div v-if="showStructures" class="structures-overlay" @click.self="showStructures = false">
          <div class="structures-panel">
            <div class="panel-header">
              <h3>{{ $t('sections.structures') }}</h3>
              <button @click="showStructures = false">×</button>
            </div>
            <div class="structs-list">
              <StructBlock 
                v-for="struct in structures" 
                :key="struct.id" 
                v-model:name="struct.name"
                :fields="struct.fields"
                :id="struct.id"
                @remove="removeStructure(struct.id)"
              />
            </div>
            <div class="panel-footer">
              <button class="add-btn" @click="addStructure('NewStruct')">
                + {{ $t('blocks.struct.add') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <PWAManager />
    </main>
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
  }
}

body {
  margin: 0;
  font-family: sans-serif;
  overflow: hidden;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;

  &.mobile-mode {
    display: flex;
    flex-direction: column;

    &.browser {
      height: calc(100vh - 56px);
    }

    > .editor-body {
      flex: 1;
      overflow: auto;
    }
  }
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background: var(--header-bg);
  color: var(--header-text);
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  z-index: 10;
}

.main-header h1 {
  margin: 0;
  font-size: 1.2rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.struct-toggle {
  background: var(--btn-struct);
  border: 1px solid white;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.lang-switcher {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.lang-switcher button {
  padding: 4px 8px;
  margin-left: 4px;
  border: 1px solid var(--btn-lang-border);
  background: var(--btn-lang);
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.lang-switcher button.active {
  background: var(--btn-lang-active-bg);
  color: var(--btn-lang-active-text);
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* Structures Overlay */
.structures-overlay {
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

.structures-panel {
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

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--sidebar-border);
  background: var(--sidebar-bg);
  border-radius: 12px 12px 0 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color);
  letter-spacing: -0.01em;
}

.panel-header button {
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

.panel-header button:hover {
  background: #ff4c4c;
  color: white;
  border-color: #ff4c4c;
}

.structs-list {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  align-items: stretch;

  > .block-container {
    margin-bottom: 16px;
  }
}

.panel-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--sidebar-border);
  background: var(--sidebar-bg);
  display: flex;
  justify-content: flex-end;
}

.add-btn {
  align-self: flex-start;
  background: var(--add-btn-bg);
  color: var(--add-btn-text);
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

@media (max-width: 768px) {
  .structures-panel {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .panel-header {
    padding: 12px 16px;
    border-radius: 0;
  }

  .structs-list {
    padding: 16px;
  }

  .panel-footer {
    padding: 12px 16px;
  }

  .desktop-only {
    display: none !important;
  }
  
  .editor-body {
    flex-direction: column;
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
