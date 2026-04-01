import { useProjects } from './useProjects';

export const useMigration = () => {
  const { projects, addProject } = useProjects();

  const migrateLegacyData = () => {
    if (!import.meta.client) return;

    // On ne migre que si projects-list est vide (ou n'existe pas)
    // et que les anciennes clés sont présentes.
    const projectsList = localStorage.getItem('projects-list');
    const hasLegacyData = 
      localStorage.getItem('active-function-id') || 
      localStorage.getItem('editor-functions') || 
      localStorage.getItem('data-structures');

    if ((!projectsList || JSON.parse(projectsList).length === 0) && hasLegacyData) {
      console.log('Migrating legacy data to new project system...');

      // 1. Créer le projet "Legacy project"
      const legacyProject = addProject('Legacy project', 'projet avec l\'ancien code');

      // 2. Récupérer les anciennes données
      const oldActiveFunctionId = localStorage.getItem('active-function-id');
      const oldFunctions = localStorage.getItem('editor-functions');
      const oldStructures = localStorage.getItem('data-structures');

      // 3. Associer le code avec ce projet
      if (oldActiveFunctionId) {
        localStorage.setItem(`project-active-function-${legacyProject.id}`, oldActiveFunctionId);
      }
      if (oldFunctions) {
        localStorage.setItem(`project-functions-${legacyProject.id}`, oldFunctions);
      }
      if (oldStructures) {
        localStorage.setItem(`project-structures-${legacyProject.id}`, oldStructures);
      }

      // 4. Mettre à jour la liste des projets dans localStorage immédiatement
      // pour éviter que d'autres composables écrasent nos changements
      localStorage.setItem('projects-list', JSON.stringify(projects.value));

      // 5. Supprimer les anciennes clés
      localStorage.removeItem('active-function-id');
      localStorage.removeItem('editor-functions');
      localStorage.removeItem('data-structures');
      
      console.log('Legacy data migrated successfully to project:', legacyProject.id);
    }
  };

  return {
    migrateLegacyData
  };
};
