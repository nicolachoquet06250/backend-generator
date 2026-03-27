export interface DataStructureField {
  id: string;
  name: string;
  type: any;
  nullable: boolean;
  defaultValue: any;
}

export interface DataStructure {
  id: string;
  name: string;
  fields: DataStructureField[];
}

export const useDataStructures = () => {
  const structures = useState<DataStructure[]>('data-structures', () => [
    { 
      id: 'req', 
      name: 'Request',
      fields: []
    },
    { 
      id: 'res', 
      name: 'Response',
      fields: []
    },
    { 
      id: '1', 
      name: 'User',
      fields: [
        { id: 'f1', name: 'id', type: 'number', nullable: false, defaultValue: 0 },
        { id: 'f2', name: 'email', type: 'string', nullable: false, defaultValue: '' }
      ]
    },
    { 
      id: '2', 
      name: 'Product',
      fields: [
        { id: 'f3', name: 'name', type: 'string', nullable: false, defaultValue: '' },
        { id: 'f4', name: 'price', type: 'number', nullable: false, defaultValue: 0 }
      ]
    }
  ]);

  // Initialize from localStorage only on client
  onMounted(() => {
    if (import.meta.client) {
      const saved = localStorage.getItem('data-structures');
      if (saved) {
        try {
          structures.value = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved structures', e);
        }
      }
    }
  });

  // Persist state when it changes
  watch(structures, (newStructures) => {
    if (import.meta.client) {
      localStorage.setItem('data-structures', JSON.stringify(newStructures));
    }
  }, { deep: true });

  const addStructure = (name: string) => {
    structures.value.push({
      id: Math.random().toString(36).substring(2, 9),
      name,
      fields: []
    });
  };

  const removeStructure = (id: string) => {
    structures.value = structures.value.filter(s => s.id !== id);
  };

  const updateStructure = (id: string, updates: Partial<DataStructure>) => {
    const struct = structures.value.find(s => s.id === id);
    if (struct) {
      Object.assign(struct, updates);
    }
  };

  const addField = (structId: string) => {
    const struct = structures.value.find(s => s.id === structId);
    if (struct) {
      struct.fields.push({
        id: Math.random().toString(36).substring(2, 9),
        name: 'field',
        type: 'string',
        nullable: false,
        defaultValue: ''
      });
    }
  };

  const removeField = (structId: string, fieldId: string) => {
    const struct = structures.value.find(s => s.id === structId);
    if (struct) {
      struct.fields = struct.fields.filter(f => f.id !== fieldId);
    }
  };

  const updateField = (structId: string, fieldId: string, updates: Partial<DataStructureField>) => {
    const struct = structures.value.find(s => s.id === structId);
    if (struct) {
      const field = struct.fields.find(f => f.id === fieldId);
      if (field) {
        Object.assign(field, updates);
      }
    }
  };

  const resetStructures = () => {
    structures.value = [
      { 
        id: 'req', 
        name: 'Request',
        fields: []
      },
      { 
        id: 'res', 
        name: 'Response',
        fields: []
      },
      { 
        id: '1', 
        name: 'User',
        fields: [
          { id: 'f1', name: 'id', type: 'number', nullable: false, defaultValue: 0 },
          { id: 'f2', name: 'email', type: 'string', nullable: false, defaultValue: '' }
        ]
      },
      { 
        id: '2', 
        name: 'Product',
        fields: [
          { id: 'f3', name: 'name', type: 'string', nullable: false, defaultValue: '' },
          { id: 'f4', name: 'price', type: 'number', nullable: false, defaultValue: 0 }
        ]
      }
    ];
  };

  return {
    structures,
    addStructure,
    removeStructure,
    updateStructure,
    addField,
    removeField,
    updateField,
    resetStructures
  };
};
