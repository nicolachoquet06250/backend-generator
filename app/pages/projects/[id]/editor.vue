<script setup lang="ts">
import { useDevice } from '#imports';
import LangSwitcher from "~/components/common/LangSwitcher.vue";

const route = useRoute();
const router = useRouter();
const { currentProjectId, projects } = useProjects();
const { t } = useI18n();

const projectId = route.params.id as string;

onBeforeMount(() => {
  if (!projects.value.find(p => p.id === projectId)) {
    router.push('/projects');
    return;
  }
  currentProjectId.value = projectId;
});

const project = computed(() => projects.value.find(p => p.id === projectId));

const { isMobile } = useDevice();
const { isCompact, toggleCompact } = useSettings();
const { resetStructures } = useDataStructures();
const { resetFunctions } = useFunctions();

useHead({
  title: computed(() => project.value ? `${project.value.name} - ${t('title')}` : t('title')),
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
  if (!import.meta.client) return 'unknown';
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

function goBack() {
  router.push('/projects');
}
</script>

<template>
  <div v-if="project" class="editor-layout" :class="[{ 'mobile-mode': isMobile }, getPWADisplayMode(), { 'is-compact': isCompact }]">
    <header class="main-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack" :title="t('common.back_to_projects')">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div class="logo">
          <h1 :title="project.name">{{ project.name }}</h1>
        </div>
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
        <button :title="$t('sections.structures')" :class="{ active: showStructures }" @click="showStructures = !showStructures">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <div class="divider"></div>
        <button class="generate-btn" @click="showGeneratorModal = true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span>{{ $t('common.generate') }}</span>
        </button>
        <LangSwitcher variant="header" />
      </div>
    </header>

    <main class="main-content">
      <EditorBlockSidebar class="sidebar" />
      <EditorFunctionWorkspace class="workspace" />
    </main>

    <div class="structures-panel" :class="{ show: showStructures }">
      <EditorStructuresSidebar @close="showStructures = false" />
    </div>

    <!-- Modals -->
    <CommonAppModal v-if="showResetModal" :show="showResetModal" :title="$t('common.reset')" @close="showResetModal = false">
      <p style="padding: 20px">{{ $t('common.reset_confirm') || 'Voulez-vous vraiment réinitialiser tout le stockage ?' }}</p>
      <template #actions>
        <button class="btn btn-secondary" @click="showResetModal = false">{{ $t('common.cancel') }}</button>
        <button class="btn btn-danger" style="background: var(--danger-color); color: white;" @click="resetStorage">{{ $t('common.confirm') }}</button>
      </template>
    </CommonAppModal>

    <EditorGeneratorModal v-if="showGeneratorModal" :show="showGeneratorModal" @close="showGeneratorModal = false" />
  </div>
</template>

<style scoped>
.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
  background-color: var(--bg-color);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--text-color);
}

.main-header {
  height: 60px;
  background: var(--header-bg);
  color: var(--header-text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0; /* Allow shrinking */
  flex: 1;
}

.back-btn,
.header-actions button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: var(--header-text);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-btn:hover,
.header-actions button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.header-actions button.active {
  background: var(--primary-color);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.header-actions button.generate-btn {
  width: auto;
  height: 32px;
  padding: 0 12px;
  background: #27ae60;
  color: white;
  font-weight: 600;
  gap: 6px;
  font-size: 0.9rem;
}

.header-actions button.generate-btn:hover {
  background: #2ecc71;
}

.logo {
  min-width: 0;
  flex: 1;
}

.logo h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.sidebar {
  width: 300px;
  border-right: 1px solid var(--sidebar-border);
  background: var(--sidebar-bg);
}

.workspace {
  flex: 1;
  background: var(--workspace-bg);
  background-image: radial-gradient(var(--sidebar-border) 1px, transparent 1px);
  background-size: 20px 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}


/* Structures Panel */
.structures-panel {
  position: absolute;
  top: 60px;
  right: -450px;
  bottom: 0;
  width: 450px;
  background: var(--panel-bg);
  z-index: 110;
  box-shadow: -4px 0 12px rgba(0,0,0,0.1);
  transition: right 0.3s ease;
  border-left: 1px solid var(--sidebar-border);
}

.structures-panel.show {
  right: 0;
}

/* Modal styles */
.btn-secondary {
  background: var(--sidebar-border);
  border: none;
  color: var(--text-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--tab-hover-bg);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger:hover {
  opacity: 0.9;
}

/* Compact Mode */
.is-compact .main-header {
  height: 48px;
}

.is-compact .logo h1 {
  font-size: 1rem;
}

.is-compact .back-btn,
.is-compact .header-actions button {
  width: 28px;
  height: 28px;
}

.is-compact .header-actions button.generate-btn {
  width: auto;
  height: 28px;
  font-size: 0.85rem;
  padding: 0 10px;
}

.is-compact .structures-panel {
  top: 48px;
}

.is-compact .variant-header button {
  height: 28px;
}

/* Mobile Mode */
@media (max-width: 768px) {
  .structures-panel {
    top: 0;
    width: 100%;
    right: -100%;
    border-left: none;
    z-index: 200;
  }

  .structures-panel.show {
    right: 0;
  }

  .header-actions button span {
    display: none;
  }
  
  .header-actions button.generate-btn {
    width: 32px;
    padding: 0;
    justify-content: center;
  }
  
  .main-header {
    padding: 0 10px;
  }
  
  .header-left {
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .logo {
    display: block;
    min-width: 0;
    flex: 1;
  }

  .logo h1 {
    display: block;
  }

  .header-actions {
    gap: 4px;
    flex-shrink: 0;
  }
}

.mobile-mode .sidebar {
  display: none;
}
</style>
