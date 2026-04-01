export interface BlockInstance {
  id: string;
  type: string; // 'var', 'math', 'if', etc.
  config: any;
  children: BlockInstance[];
  metadata?: {
    returnType?: string;
    structureId?: string;
    varName?: string;
    isVarAssign?: boolean;
    isVarInit?: boolean;
    isReturn?: boolean;
  };
}

export interface FunctionDefinition {
  id: string;
  name: string;
  blocks: BlockInstance[];
  metadata?: {
    returnType: string;
    structureId?: string;
  };
}

export const useFunctions = () => {
  const functions = useState<FunctionDefinition[]>('editor-functions', () => [
    { 
      id: 'f1', 
      name: 'main', 
      blocks: [],
      metadata: {
        returnType: 'any'
      }
    }
  ]);
  
  const activeFunctionId = useState<string>('active-function-id', () => 'f1');

  const isDragging = useState<boolean>('is-dragging', () => false);

  // Initialize from localStorage only on client
  const { currentProjectId } = useProjects();

  const functionsKey = computed(() => currentProjectId.value ? `project-functions-${currentProjectId.value}` : 'editor-functions');
  const activeFunctionKey = computed(() => currentProjectId.value ? `project-active-function-${currentProjectId.value}` : 'active-function-id');

  // No need to initialize in onMounted if immediate: true watch handles it
  // But we can keep it as a safety for the first load
  onMounted(() => {
    if (import.meta.client) {
      const savedFunctions = localStorage.getItem(functionsKey.value);
      if (savedFunctions) {
        try {
          functions.value = JSON.parse(savedFunctions);
        } catch (e) {
          console.error('Failed to parse saved functions', e);
        }
      }

      const savedActiveId = localStorage.getItem(activeFunctionKey.value);
      if (savedActiveId && functions.value.some(f => f.id === savedActiveId)) {
        activeFunctionId.value = savedActiveId;
      } else if (functions.value.length > 0) {
        activeFunctionId.value = functions.value[0]!.id;
      }
    }
  });

  // Persist state when it changes
  watch(functions, (newFunctions) => {
    if (import.meta.client) {
      localStorage.setItem(functionsKey.value, JSON.stringify(newFunctions));
    }
  }, { deep: true });

  watch(activeFunctionId, (newId) => {
    if (import.meta.client) {
      localStorage.setItem(activeFunctionKey.value, newId);
    }
  });

  watch(functionsKey, (newKey) => {
    if (import.meta.client) {
      const saved = localStorage.getItem(newKey);
      if (saved) {
        try {
          functions.value = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved functions', e);
          resetFunctions();
        }
      } else {
        resetFunctions();
      }

      // Also reset active function for the new project
      const savedActiveId = localStorage.getItem(activeFunctionKey.value);
      if (savedActiveId && functions.value.some(f => f.id === savedActiveId)) {
        activeFunctionId.value = savedActiveId;
      } else if (functions.value.length > 0) {
        activeFunctionId.value = functions.value[0]!.id;
      }
    }
  }, { immediate: true });

  watch(activeFunctionKey, (newKey) => {
    if (import.meta.client) {
      const saved = localStorage.getItem(newKey);
      if (saved && functions.value.some(f => f.id === saved)) {
        activeFunctionId.value = saved;
      }
    }
  });

  const addFunction = (name: string, structureId?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    functions.value.push({ 
      id, 
      name, 
      blocks: [],
      metadata: {
        returnType: 'any',
        structureId
      }
    });
    activeFunctionId.value = id;
  };

  const removeFunction = (id: string) => {
    functions.value = functions.value.filter(f => f.id !== id);
    if (activeFunctionId.value === id && functions.value.length > 0) {
      activeFunctionId.value = functions.value[0]!.id;
    }
  };

  const addBlockToFunction = (functionId: string, blockType: string, parentBlockId?: string, slotName?: string, existingBlock?: BlockInstance, afterBlockId?: string, initialConfig?: any) => {
    const f = functions.value.find(func => func.id === functionId);
    if (f) {
      const id = Math.random().toString(36).substring(2, 9);
      const newBlock: BlockInstance = existingBlock ? { ...existingBlock, id } : {
        id,
        type: blockType,
        config: initialConfig || {},
        children: []
      };

      if (!existingBlock && (blockType === 'array_push' || blockType === 'array')) {
        newBlock.config.slots = {
          ...newBlock.config.slots,
          value: null
        };
      }

      if (parentBlockId) {
        // Find parent block recursively
        const findAndAdd = (blocks: BlockInstance[]): boolean => {
          for (const b of blocks) {
            if (b.id === parentBlockId) {
              if (!b.config.slots) b.config.slots = {};
              if (slotName) {
                b.config.slots[slotName] = newBlock;
              } else {
                if (afterBlockId) {
                  const index = b.children.findIndex(child => child.id === afterBlockId);
                  if (index !== -1) {
                    b.children.splice(index + 1, 0, newBlock);
                  } else {
                    b.children.push(newBlock);
                  }
                } else {
                  b.children.unshift(newBlock); // Add at the beginning if no afterBlockId and it's a child list
                }
              }
              return true;
            }
            if (findAndAdd(b.children)) return true;
            if (b.config.slots) {
              for (const slot in b.config.slots) {
                if (b.config.slots[slot] && findAndAdd([b.config.slots[slot]])) return true;
              }
            }
          }
          return false;
        };
        findAndAdd(f.blocks);
      } else {
        if (afterBlockId) {
          if (afterBlockId === 'start') {
            f.blocks.unshift(newBlock);
            return;
          }
          const index = f.blocks.findIndex(b => b.id === afterBlockId);
          if (index !== -1) {
            f.blocks.splice(index + 1, 0, newBlock);
          } else {
            f.blocks.push(newBlock);
          }
        } else {
          f.blocks.push(newBlock);
        }
      }
    }
  };

  const removeBlockFromFunction = (functionId: string, blockId: string) => {
    const f = functions.value.find(func => func.id === functionId);
    if (f) {
      const blockToDelete = getBlockById(functionId, blockId);
      if (blockToDelete) {
        if (blockToDelete.type === 'return') {
          updateFunctionMetadata(functionId, { returnType: 'any' });
        } else {
          // Si le bloc est supprimé alors qu'il est dans un slot 'value' d'un bloc 'return', 
          // on doit réinitialiser le type de retour à 'any' car le slot devient vide.
          const parent = getParentBlock(functionId, blockId);
          if (parent) {
            if (parent.type === 'return') {
              updateFunctionMetadata(functionId, { returnType: 'any' });
            }
          }
        }
      }

      const recursiveRemove = (blocks: BlockInstance[]): BlockInstance[] => {
        return blocks.filter(b => {
          if (b.id === blockId) return false;
          b.children = recursiveRemove(b.children);
          if (b.config.slots) {
            for (const slot in b.config.slots) {
              if (b.config.slots[slot]?.id === blockId) {
                // Si on retire le premier élément (source) du bloc property, on reset le select et le return type si nécessaire
                if (b.type === 'object_property' && slot === 'source') {
                  b.config.property = '';
                  
                  // Si le bloc object_property est dans un slot 'value' d'un bloc 'return', 
                  // on doit aussi reset le return type de la fonction
                  const parent = getParentBlock(functionId, b.id);
                  if (parent && parent.type === 'return') {
                    updateFunctionMetadata(functionId, { returnType: 'any' });
                  }
                }
                delete b.config.slots[slot];
              } else if (b.config.slots[slot]) {
                b.config.slots[slot] = recursiveRemove([b.config.slots[slot]])[0];
              }
            }
          }
          return true;
        });
      };
      f.blocks = recursiveRemove(f.blocks);
    }
  };

  const updateBlockConfig = (functionId: string, blockId: string, config: any) => {
    const f = functions.value.find(func => func.id === functionId);
    if (f) {
      const recursiveUpdate = (blocks: BlockInstance[]): boolean => {
        for (const b of blocks) {
          if (b.id === blockId) {
            b.config = { ...b.config, ...config };
            return true;
          }
          if (recursiveUpdate(b.children)) return true;
          if (b.config.slots) {
            for (const slot in b.config.slots) {
              if (b.config.slots[slot] && recursiveUpdate([b.config.slots[slot]])) return true;
            }
          }
        }
        return false;
      };
      recursiveUpdate(f.blocks);
    }
  };

  const updateFunctionMetadata = (functionId: string, metadata: { returnType: any }) => {
    const f = functions.value.find(func => func.id === functionId);
    if (f) {
      // Ne mettre à jour que si les métadonnées ont réellement changé pour éviter les boucles de réactivité
      const currentMetadata = f.metadata || {};
      const newMetadata = { ...currentMetadata, ...metadata };
      
      if (JSON.stringify(currentMetadata) !== JSON.stringify(newMetadata)) {
        f.metadata = newMetadata;
      }
    }
  };

  const getBlockById = (functionId: string, blockId: string): BlockInstance | null => {
    const f = functions.value.find(func => func.id === functionId);
    if (!f) return null;
    
    const findRecursive = (blocks: BlockInstance[]): BlockInstance | null => {
      for (const b of blocks) {
        if (b.id === blockId) return b;
        const fromChildren = findRecursive(b.children);
        if (fromChildren) return fromChildren;
        if (b.config.slots) {
          for (const slot in b.config.slots) {
            const slotBlock = b.config.slots[slot];
            if (slotBlock) {
              const fromSlot = findRecursive([slotBlock]);
              if (fromSlot) return fromSlot;
            }
          }
        }
      }
      return null;
    };
    
    return findRecursive(f.blocks);
  };

  const getParentBlock = (functionId: string, blockId: string): BlockInstance | null => {
    const f = functions.value.find(func => func.id === functionId);
    if (!f) return null;

    const findParentRecursive = (blocks: BlockInstance[], targetId: string): BlockInstance | null => {
      if (!blocks) return null;
      for (const b of blocks) {
        if (b?.children.some(child => child.id === targetId)) return b;
        if (b?.config.slots) {
          for (const slot in b.config.slots) {
            if (b.config.slots[slot]?.id === targetId) return b;
            const fromSlot = findParentRecursive([b.config.slots[slot]], targetId);
            if (fromSlot) return fromSlot;
          }
        }
        const fromChildren = findParentRecursive(b?.children, targetId);
        if (fromChildren) return fromChildren;
      }
      return null;
    };

    return findParentRecursive(f.blocks, blockId);
  };

  const getParentBlockWithSlot = (functionId: string, blockId: string): { parent: BlockInstance, slotName: string } | null => {
    const f = functions.value.find(func => func.id === functionId);
    if (!f) return null;

    const findParentRecursive = (blocks: BlockInstance[], targetId: string): { parent: BlockInstance, slotName: string } | null => {
      if (!blocks) return null;
      for (const b of blocks) {
        if (b?.children.some(child => child.id === targetId)) return { parent: b, slotName: 'children' };
        if (b?.config.slots) {
          for (const slot in b.config.slots) {
            if (b.config.slots[slot]?.id === targetId) return { parent: b, slotName: slot };
            const fromSlot = findParentRecursive([b.config.slots[slot]], targetId);
            if (fromSlot) return fromSlot;
          }
        }
        const fromChildren = findParentRecursive(b?.children, targetId);
        if (fromChildren) return fromChildren;
      }
      return null;
    };

    return findParentRecursive(f.blocks, blockId);
  };

  const findReturnParent = (functionId: string, blockId: string): BlockInstance | null => {
    let currentId = blockId;
    let parentInfo = getParentBlockWithSlot(functionId, currentId);
    
    // Slots qui ne propagent pas le type de retour de leur contenu vers le bloc return parent
    const blockingSlots = ['condition', 'from', 'to', 'list', 'left', 'right'];
    
    while (parentInfo) {
      const { parent, slotName } = parentInfo;
      
      // Si on traverse un slot bloquant, on s'arrête : il n'y a pas de propagation du type de retour
      if (blockingSlots.includes(slotName)) return null;
      
      if (parent.type === 'return') return parent;
      
      currentId = parent.id;
      parentInfo = getParentBlockWithSlot(functionId, currentId);
    }
    return null;
  };

  function resetFunctions () {
    functions.value = [
      { id: 'f1', name: 'main', blocks: [] }
    ];
    activeFunctionId.value = 'f1';
  }

  const removeStructureFromFunctions = (structureId: string) => {
    functions.value.forEach(f => {
      if (f.metadata?.structureId === structureId) {
        f.metadata.structureId = undefined;
      }
    });
  };

  return {
    functions,
    activeFunctionId,
    isDragging,
    addFunction,
    removeFunction,
    addBlockToFunction,
    removeBlockFromFunction,
    updateBlockConfig,
    updateFunctionMetadata,
    getBlockById,
    getParentBlock,
    getParentBlockWithSlot,
    findReturnParent,
    resetFunctions,
    removeStructureFromFunctions
  };
};
