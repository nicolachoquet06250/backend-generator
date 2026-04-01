export interface Project {
  id: string;
  name: string;
  description?: string;
  updatedAt: number;
}

export const useProjects = () => {
  const projects = useState<Project[]>('projects', () => []);
  const currentProjectId = useState<string | null>('current-project-id', () => null);

  onMounted(() => {
    if (import.meta.client) {
      const saved = localStorage.getItem('projects-list');
      if (saved) {
        try {
          projects.value = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse projects', e);
        }
      }
    }
  });

  watch(projects, (newProjects) => {
    if (import.meta.client) {
      localStorage.setItem('projects-list', JSON.stringify(newProjects));
    }
  }, { deep: true });

  const addProject = (name: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newProject: Project = {
      id,
      name,
      description,
      updatedAt: Date.now()
    };
    projects.value.push(newProject);
    return newProject;
  };

  const removeProject = (id: string) => {
    projects.value = projects.value.filter(p => p.id !== id);
    if (import.meta.client) {
      localStorage.removeItem(`project-structures-${id}`);
      localStorage.removeItem(`project-functions-${id}`);
      localStorage.removeItem(`project-active-function-${id}`);
    }
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const project = projects.value.find(p => p.id === id);
    if (project) {
      Object.assign(project, { ...updates, updatedAt: Date.now() });
    }
  };

  return {
    projects,
    currentProjectId,
    addProject,
    removeProject,
    updateProject
  };
};
