<script setup lang="ts">
import LangSwitcher from "~/components/common/LangSwitcher.vue";

const { projects, addProject, removeProject, updateProject } = useProjects();
const { currentProjectId } = useProjects();
const { t } = useI18n();
const router = useRouter();

const showAddModal = ref(false);
const showEditModal = ref(false);
const editingProjectId = ref<string | null>(null);
const newProjectName = ref('');
const newProjectDescription = ref('');

onBeforeMount(() => {
  currentProjectId.value = null;
});

const handleAddProject = () => {
  if (!newProjectName.value.trim()) return;
  
  const project = addProject(newProjectName.value, newProjectDescription.value);
  newProjectName.value = '';
  newProjectDescription.value = '';
  showAddModal.value = false;
  
  router.push(`/editor/${project.id}`);
};

const handleUpdateProject = () => {
  if (!editingProjectId.value || !newProjectName.value.trim()) return;
  
  updateProject(editingProjectId.value, {
    name: newProjectName.value,
    description: newProjectDescription.value
  });
  
  newProjectName.value = '';
  newProjectDescription.value = '';
  editingProjectId.value = null;
  showEditModal.value = false;
};

const openAddModal = () => {
  newProjectName.value = '';
  newProjectDescription.value = '';
  showAddModal.value = true;
};

const openEditModal = (project: any) => {
  editingProjectId.value = project.id;
  newProjectName.value = project.name;
  newProjectDescription.value = project.description || '';
  showEditModal.value = true;
};

const openProject = (id: string) => {
  router.push(`/editor/${id}`);
};

const confirmDelete = (id: string) => {
  if (confirm(t('projects.delete_confirm'))) {
    removeProject(id);
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString();
};
</script>

<template>
  <div class="projects-container">
    <LangSwitcher variant="global" />
    <header class="projects-header">
      <h1>{{ t('projects.title') }}</h1>
      <button class="add-btn" @click="openAddModal">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        {{ t('projects.new_project') }}
      </button>
    </header>

    <div v-if="projects.length === 0" class="empty-state">
      <p>{{ t('projects.no_projects') }}</p>
    </div>

    <div v-else class="projects-grid">
      <div 
        v-for="project in projects" 
        :key="project.id" 
        class="project-card"
        @click="openProject(project.id)"
      >
        <div class="project-info">
          <h3 :title="project.name">{{ project.name }}</h3>
          <p v-if="project.description" class="description">{{ project.description }}</p>
          <p class="updated-at">{{ t('projects.last_updated') }} {{ formatDate(project.updatedAt) }}</p>
        </div>
        <div class="project-actions">
          <button class="edit-btn" @click.stop="openEditModal(project)" :title="t('projects.edit_project')">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="delete-btn" @click.stop="confirmDelete(project.id)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Ajout Projet -->
    <CommonAppModal
      v-if="showAddModal"
      :show="showAddModal"
      :title="t('projects.new_project')"
      has-padding
      @close="showAddModal = false"
    >
      <div class="project-form">
        <div class="form-group">
          <label>{{ t('projects.project_name') }}</label>
          <input 
            v-model="newProjectName" 
            type="text" 
            :placeholder="t('projects.project_name')"
            @keyup.enter="handleAddProject"
            autofocus
          >
        </div>
        <div class="form-group">
          <label>{{ t('projects.project_description') }}</label>
          <textarea 
            v-model="newProjectDescription" 
            :placeholder="t('projects.project_description')"
          ></textarea>
        </div>
      </div>
      <template #actions>
        <button class="btn btn-secondary" @click="showAddModal = false">{{ t('common.cancel') }}</button>
        <button 
          class="btn btn-primary" 
          :disabled="!newProjectName.trim()"
          @click="handleAddProject"
        >
          {{ t('projects.add_project') }}
        </button>
      </template>
    </CommonAppModal>

    <!-- Modal Edition Projet -->
    <CommonAppModal
      v-if="showEditModal"
      :show="showEditModal"
      :title="t('projects.edit_project')"
      has-padding
      @close="showEditModal = false"
    >
      <div class="project-form">
        <div class="form-group">
          <label>{{ t('projects.project_name') }}</label>
          <input 
            v-model="newProjectName" 
            type="text" 
            :placeholder="t('projects.project_name')"
            @keyup.enter="handleUpdateProject"
            autofocus
          >
        </div>
        <div class="form-group">
          <label>{{ t('projects.project_description') }}</label>
          <textarea 
            v-model="newProjectDescription" 
            :placeholder="t('projects.project_description')"
          ></textarea>
        </div>
      </div>
      <template #actions>
        <button class="btn btn-secondary" @click="showEditModal = false">{{ t('common.cancel') }}</button>
        <button 
          class="btn btn-primary" 
          :disabled="!newProjectName.trim()"
          @click="handleUpdateProject"
        >
          {{ t('projects.update_project') }}
        </button>
      </template>
    </CommonAppModal>
  </div>
</template>

<style scoped>
.projects-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 60px 20px;
  min-height: 100vh;
  background-color: var(--bg-color);
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48px;
}

.projects-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-color);
  margin: 0;
  letter-spacing: -0.02em;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.add-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.add-btn:active {
  transform: translateY(0);
}

.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: var(--card-bg);
  border-radius: 16px;
  border: 2px dashed var(--card-border);
  color: var(--secondary-text);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-state p {
  font-size: 1.1rem;
  margin: 0;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.project-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.project-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--primary-color);
  opacity: 0;
  transition: opacity 0.2s;
}

.project-card:hover {
  border-color: var(--card-hover-border);
  transform: translateY(-4px);
  box-shadow: var(--card-hover-shadow);
}

.project-card:hover::before {
  opacity: 1;
}

.project-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.project-card:hover .project-actions {
  opacity: 1;
}

.edit-btn, .delete-btn {
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  z-index: 10;
}

.edit-btn {
  color: var(--primary-color);
}

.delete-btn {
  color: var(--danger-color);
}

.edit-btn:hover {
  background: rgba(52, 152, 219, 0.1);
  transform: scale(1.1);
}

.delete-btn:hover {
  background: var(--danger-bg);
  transform: scale(1.1);
}

/* Modal and Forms */
.project-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color);
  opacity: 0.9;
}

.form-group input, .form-group textarea {
  padding: 12px 16px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--input-text);
  border-radius: 10px;
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
}

.form-group textarea {
  height: 120px;
  resize: vertical;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  background: var(--secondary-text);
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--card-border);
  color: var(--text-color);
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--card-bg);
  border-color: var(--secondary-text);
}

@media (max-width: 640px) {
  .projects-container {
    padding-top: 80px;
  }

  .projects-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 32px;
  }
  
  .add-btn {
    width: 100%;
    justify-content: center;
  }
  
  .projects-header h1 {
    font-size: 2rem;
  }
}
</style>
