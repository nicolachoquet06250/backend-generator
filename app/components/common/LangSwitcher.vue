<script setup lang="ts">
const { locale, locales, setLocale } = useI18n();

interface Props {
  variant?: 'global' | 'header';
}

defineProps<Props>();
</script>

<template>
  <div class="lang-switcher" :class="[`variant-${variant || 'global'}`]">
    <button 
      v-for="loc in locales" 
      :key="loc.code"
      @click="setLocale(loc.code)"
      :class="{ active: locale === loc.code }"
      :title="loc.name"
    >
      {{ loc.code.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  gap: 5px;
}

.lang-switcher button {
  padding: 0 8px;
  border: 1px solid var(--sidebar-border);
  background: var(--sidebar-bg);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
}

.lang-switcher button:hover {
  border-color: var(--primary-color);
}

.lang-switcher button.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Variantes */
.variant-global {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 10000;
}

.variant-header {
  margin-left: 4px;
}

.variant-header button {
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: var(--header-text);
  min-width: 30px;
  padding: 0 6px;
}

.variant-header button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.variant-header button.active {
  background: rgba(255, 255, 255, 0.3);
  color: var(--header-text);
}

/* Mode sombre spécifique si besoin (déjà géré par les variables CSS globales) */

@media (max-width: 600px) {
  .lang-switcher button {
    padding: 4px 6px;
    font-size: 11px;
  }
}
</style>
