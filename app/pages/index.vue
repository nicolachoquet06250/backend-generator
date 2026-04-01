<script setup lang="ts">
import LangSwitcher from "~/components/common/LangSwitcher.vue";
const { t } = useI18n();
</script>

<template>
  <div class="landing-page">
    <LangSwitcher variant="global" />
    
    <header class="hero">
      <div class="container">
        <h1>{{ t('landing.title') }}</h1>
        <p class="subtitle">{{ t('landing.subtitle') }}</p>
        <p class="description">{{ t('landing.description') }}</p>
        <div class="cta-container">
          <NuxtLink to="/projects" class="btn-get-started">
            {{ t('landing.get_started') }}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </NuxtLink>
        </div>
      </div>
    </header>

    <section class="features">
      <div class="container grid">
        <div class="feature-card">
          <div class="icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <h3>{{ t('landing.features.visual') }}</h3>
          <p>{{ t('landing.features.visual_desc') }}</p>
        </div>

        <div class="feature-card">
          <div class="icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <h3>{{ t('landing.features.multi_lang') }}</h3>
          <p>{{ t('landing.features.multi_lang_desc') }}</p>
        </div>

        <div class="feature-card">
          <div class="icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3>{{ t('landing.features.structures') }}</h3>
          <p>{{ t('landing.features.structures_desc') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  overflow-y: auto;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero {
  padding: 120px 0 80px;
  text-align: center;
}

.hero h1 {
  font-size: 4rem;
  font-weight: 900;
  margin-bottom: 16px;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--primary-color), #8e44ad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 24px;
  opacity: 0.9;
}

.description {
  font-size: 1.2rem;
  max-width: 700px;
  margin: 0 auto 48px;
  line-height: 1.6;
  color: var(--secondary-text);
}

.cta-container {
  display: flex;
  justify-content: center;
}

.btn-get-started {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--primary-color);
  color: white;
  padding: 16px 32px;
  border-radius: 50px;
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 15px -3px rgba(52, 152, 219, 0.3);
}

.btn-get-started:hover {
  background: var(--primary-hover);
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(52, 152, 219, 0.4);
}

.features {
  padding: 80px 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}

.feature-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  padding: 32px;
  text-align: left;
}

.icon {
  width: 48px;
  height: 48px;
  background: rgba(52, 152, 219, 0.1);
  color: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 12px;
  font-weight: 700;
}

.feature-card p {
  color: var(--secondary-text);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2.5rem;
  }
  
  .subtitle {
    font-size: 1.4rem;
  }
  
  .hero {
    padding-top: 80px;
  }
}
</style>
