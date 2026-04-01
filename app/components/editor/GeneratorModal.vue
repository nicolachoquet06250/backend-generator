<script setup lang="ts">
import AppModal from '~/components/common/AppModal.vue';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['close']);

const { t } = useI18n();
const { generateCode } = useGenerator();

const selectedLanguage = ref('nodejs');
const generatedCode = ref('');

const languages = [
  { 
    id: 'nodejs', 
    name: 'Node.js', 
    icon: `/99371_javascript_512x512.png`
  },
  { 
    id: 'python', 
    name: 'Python', 
    icon: `/Python-logo-notext.svg.png`
  },
  { 
    id: 'php', 
    name: 'PHP', 
    icon: `/PHP-logo.svg.png`
  },
  { 
    id: 'go', 
    name: 'Go', 
    icon: `/lg-6619d74e0c9e1-GO-Golang.webp`
  },
  { 
    id: 'java', 
    name: 'Java', 
    icon: `/java-logo-png_seeklogo-158094.png`
  }
];

const generate = () => {
  generatedCode.value = generateCode(selectedLanguage.value);
  nextTick(() => {
    if (import.meta.client) {
      Prism.highlightAll();
    }
  });
};

onMounted(() => {
  generate();
});

const copyCode = () => {
  if (import.meta.client) {
    navigator.clipboard.writeText(generatedCode.value);
  }
};

const downloadCode = () => {
  if (import.meta.client) {
    const extensions: Record<string, string> = {
      nodejs: 'ts',
      python: 'py',
      php: 'php',
      go: 'go',
      java: 'java'
    };
    const blob = new Blob([generatedCode.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backend-script.${extensions[selectedLanguage.value] || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    generate();
  }
});

watch(selectedLanguage, () => {
  generate();
});
</script>

<template>
  <AppModal :show="show" :title="t('generator.title')" @close="emit('close')" has-padding>
    <div class="generator-container">
      <div class="language-selection">
        <label>{{ t('generator.select_language') }}</label>
        <div class="language-grid">
          <button 
            v-for="lang in languages" 
            :key="lang.id"
            :class="{ active: selectedLanguage === lang.id }"
            @click="selectedLanguage = lang.id"
            class="lang-btn"
          >
            <img class="lang-icon" :src="lang.icon" :alt="lang.name">
<!--            <span>{{ lang.name }}</span>-->
          </button>
        </div>
      </div>

      <div class="code-output">
        <div class="output-header">
          <span>{{ selectedLanguage }}</span>
          <div class="output-actions">
            <button class="btn-icon" @click="copyCode" :title="t('generator.copy_btn')">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="btn-icon" @click="downloadCode" :title="t('generator.download_btn')">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </div>
        <pre><code :class="'language-' + (selectedLanguage === 'nodejs' ? 'typescript' : selectedLanguage)">{{ generatedCode || t('generator.no_code') }}</code></pre>
      </div>
    </div>

    <template #actions>
      <button class="btn btn-copy" @click="copyCode">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        {{ t('generator.copy_btn') }}
      </button>
      <button class="btn btn-secondary btn-cancel" @click="emit('close')">{{ t('common.cancel') }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.generator-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.language-selection {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.language-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

@media (max-width: 640px) {
  .language-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 8px;
  }
  
  .lang-btn {
    padding: 8px;
  }
  
  .lang-icon {
    max-width: 20px;
    max-height: 20px;
  }
}

.lang-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--sidebar-section-border);
  background: var(--sidebar-section-bg);
  color: var(--sidebar-text);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
}

.lang-btn:hover {
  border-color: #4C97FF;
  background: var(--tab-hover-bg);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.lang-btn.active {
  background: rgba(76, 151, 255, 0.1);
  color: #4C97FF;
  border-color: #4C97FF;
  border-width: 2px;
  padding: 11px; /* Adjust for border-width (12px - 1px extra border) */
}

@media (max-width: 640px) {
  .lang-btn.active {
    padding: 7px; /* Adjust for border-width (8px - 1px extra border) */
  }
}

.lang-btn.active::after {
  content: '✓';
  position: absolute;
  top: 8px;
  right: 8px;
  background: #4C97FF;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.lang-icon {
  max-width: 28px;
  max-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lang-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

/* Fallback icons if Nuxt Icon is not available or for SVG approach */
.lang-btn :deep(svg) {
  width: 28px;
  height: 28px;
}

.code-output {
  flex: 1;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.output-header {
  padding: 8px 16px;
  background: #252526;
  color: #9cdcfe;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: monospace;
  font-size: 12px;
}

.output-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #3c3c3c;
  color: white;
}

.btn-copy {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #4C97FF 0%, #3a86f0 100%);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(76, 151, 255, 0.3);
}

.btn-copy:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(76, 151, 255, 0.4);
  filter: brightness(1.1);
}

.btn-copy:active {
  transform: translateY(0);
}

.btn-cancel {
  background: var(--sidebar-section-bg);
  color: var(--sidebar-text);
  border: 1px solid var(--sidebar-section-border);
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-cancel:hover {
  background: var(--tab-hover-bg);
  border-color: #ff4c4c;
  color: #ff4c4c;
}

pre {
  margin: 0;
  padding: 16px;
  background: transparent !important;
  color: #d4d4d4;
  overflow: auto;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  flex: 1;
}

code[class*="language-"],
pre[class*="language-"] {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace !important;
  font-size: 14px !important;
  text-shadow: none !important;
}
</style>
