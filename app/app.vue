<script setup lang="ts">
import BlockSidebar from './components/editor/BlockSidebar.vue';
import FunctionWorkspace from './components/editor/FunctionWorkspace.vue';
import StructBlock from './components/blocks/StructBlock.vue';
import PWAManager from './components/common/PWAManager.vue';
import AppModal from './components/common/AppModal.vue';
import GeneratorModal from './components/editor/GeneratorModal.vue';

const { locale, locales, setLocale, t } = useI18n();
const { structures, addStructure, removeStructure, resetStructures } = useDataStructures();
const { resetFunctions, removeStructureFromFunctions } = useFunctions();
const { isCompact, toggleCompact } = useSettings();

const handleRemoveStructure = (id: string) => {
  removeStructure(id);
  removeStructureFromFunctions(id);
};
const { isMobile } = useDevice();

useHead({
  title: t('title'),
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap'
    }
  ]
})

const showStructures = ref(false);
const showResetModal = ref(false);
const showGeneratorModal = ref(false);

const resetStorage = () => {
  resetStructures();
  resetFunctions();
  showResetModal.value = false;
};

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

function reloadPage() {
  if (import.meta.client) {
    window.location.reload();
  }
}
</script>

<template>
  <div class="editor-layout" :class="[{ 'mobile-mode': isMobile }, getPWADisplayMode(), { 'is-compact': isCompact }]">
    <header class="main-header">
      <div class="logo">
        <h1>{{ $t('welcome') }}</h1>
      </div>
      <div class="header-actions">
        <button class="reload-btn" :title="$t('common.reload')" @click="reloadPage">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
        <button class="compact-toggle" :class="{ active: isCompact }" :title="$t('common.compact')" @click="toggleCompact">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="9"></line>
            <line x1="9" y1="12" x2="15" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        </button>
        <button class="reset-btn" :title="$t('common.reset')" @click="showResetModal = true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        <button class="generate-btn" :title="$t('common.generate')" @click="showGeneratorModal = true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>
        <button class="struct-toggle" :title="$t('sections.structures')" @click="showStructures = !showStructures">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span class="struct-count" v-if="structures.length > 0">{{ structures.length }}</span>
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
                @remove="handleRemoveStructure(struct.id)"
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

      <GeneratorModal :show="showGeneratorModal" @close="showGeneratorModal = false" />

      <AppModal 
        :show="showResetModal" 
        :title="$t('common.reset')"
        has-padding
        @close="showResetModal = false"
        @confirm="resetStorage"
      >
        <p>{{ $t('common.reset') }} ?</p>
      </AppModal>
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

:root {
  --block-padding-v: 8px;
  --block-padding-h: 12px;
  --block-padding: var(--block-padding-v) var(--block-padding-h);
  --block-margin: 4px;
  --block-gap: 8px;
  --block-font-size: 14px;
  --block-bottom-padding: 8px;
  --header-height: 60px;
  --header-button-size: 34px;
  --header-action-gap: 4px;
  --sidebar-width: 300px;
}

.is-compact {
  --block-padding-v: 4px;
  --block-padding-h: 8px;
  --block-padding: var(--block-padding-v) var(--block-padding-h);
  --block-margin: 2px;
  --block-gap: 4px;
  --block-font-size: 12px;
  --block-bottom-padding: 4px;
  --header-height: 40px;
  --header-button-size: 28px;
  --header-action-gap: 4px;
  --sidebar-width: 240px;
}

.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: all 0.2s ease-in-out;

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
  height: var(--header-height);
  background: var(--header-bg);
  color: var(--header-text);
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  z-index: 10;
  transition: all 0.2s ease-in-out;
}

.is-compact .main-header {
  padding: 0 12px;
}

.main-header h1 {
  margin: 0;
  font-size: 1.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-compact .main-header h1 {
  font-size: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--header-action-gap);
}

.reset-btn {
  background: #ff4c4c;
  border: 1px solid #ff4c4c;
  color: white;
  width: var(--header-button-size);
  min-width: var(--header-button-size);
  height: var(--header-button-size);
  min-height: var(--header-button-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #e60000;
  border-color: #e60000;
}

.generate-btn {
  background: #ff9800;
  border: 1px solid #ff9800;
  color: white;
  width: var(--header-button-size);
  min-width: var(--header-button-size);
  height: var(--header-button-size);
  min-height: var(--header-button-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.generate-btn:hover {
  background: #e68a00;
  border-color: #e68a00;
}

.reload-btn {
  background: #4caf50;
  border: 1px solid #4caf50;
  color: white;
  width: var(--header-button-size);
  min-width: var(--header-button-size);
  height: var(--header-button-size);
  min-height: var(--header-button-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.reload-btn:hover {
  background: #45a049;
  border-color: #45a049;
}

.compact-toggle {
  background: #6c757d;
  border: 1px solid #6c757d;
  color: white;
  width: var(--header-button-size);
  min-width: var(--header-button-size);
  height: var(--header-button-size);
  min-height: var(--header-button-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.compact-toggle:hover {
  background: #5a6268;
  border-color: #545b62;
}

.compact-toggle.active {
  background: #007bff;
  border-color: #007bff;
}

.struct-toggle {
  background: var(--btn-struct);
  border: 1px solid var(--btn-struct);
  color: white;
  width: var(--header-button-size);
  min-width: var(--header-button-size);
  height: var(--header-button-size);
  min-height: var(--header-button-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
  position: relative;
}

.struct-toggle:hover {
  background: #ff5e1a;
  border-color: #ff5e1a;
}

.struct-count {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff4c4c;
  color: white;
  font-size: 0.65rem;
  font-weight: bold;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.editor-layout:not(.is-compact) {
  .main-header {
    gap: 20px;
    padding: 0 12px;
  }

  .lang-switcher {
    flex-direction: column;
    gap: 5px;
  }
}

.editor-layout.is-compact {
  .lang-switcher {
    flex-direction: row;
  }
}

.lang-switcher {
  display: flex;
  flex-direction: column;
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
  font-size: 13px;
  line-height: 1;
}

.is-compact .lang-switcher button {
  padding: 2px 4px;
  margin-left: 2px;
  font-size: 11px;
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
