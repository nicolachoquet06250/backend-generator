<script setup lang="ts">
const props = defineProps<{
  slotName: string;
  parentBlockId: string;
  afterBlockId?: string;
  block?: any;
  acceptedBlockTypes?: string[];
  isStackZone?: boolean;
}>();

const { functions, activeFunctionId, addBlockToFunction, removeBlockFromFunction, getBlockById } = useFunctions();

const findVarDeclaration = (blocks: any[], name: string): any => {
  for (const block of blocks) {
    if (block.type === 'var' && block.config?.name === name) return block;
    if (block.children) {
      const found = findVarDeclaration(block.children, name);
      if (found) return found;
    }
    if (block.config?.slots) {
      for (const s of Object.values(block.config.slots)) {
        if (s) {
          const found = findVarDeclaration([s as any], name);
          if (found) return found;
        }
      }
    }
  }
  return null;
};

const inLoop = inject('inLoop', ref(false));
const isDraggingOver = ref(false);

const isAccepted = (type: string) => {
  if (type === 'break' || type === 'continue') {
    if (!inLoop.value) return false;
  }
  
  // Le type 'literal' est un joker pour le type attendu par le parent (utile pour le multi-drop)
  // Il est traité plus bas dans la logique spécifique aux parents

  if (!props.acceptedBlockTypes || props.acceptedBlockTypes.length === 0) return true;
  
  let normalizedType = type;
  if (type === 'true' || type === 'false') {
    normalizedType = 'boolean';
  }

  const expressionTypes = ['string', 'number', 'boolean', 'true', 'false', 'var', 'parameter', 'math-op', 'compare-op', 'equal', 'array', 'object', 'object_property', 'function', 'print'];
  
  const expandedAccepted = props.acceptedBlockTypes.flatMap(t => t === 'expression' ? expressionTypes : [t]);

  // Si on est dans un ArrayBlock avec un elementType, on accepte d'autres types 
  // car on va les transformer lors du drop (si c'est un nouveau bloc).
  const parentBlock = props.parentBlockId ? getBlockById(activeFunctionId.value, props.parentBlockId) : null;
  const isArrayElement = parentBlock && parentBlock.type === 'array' && parentBlock.config?.elementType;
  
  // Si le type est "literal", on l'accepte si on est dans un tableau ou dans un slot qui attend une expression.
  // Dans le cas d'une variable, on vérifiera la compatibilité lors du drop réel pour savoir quel type de littéral créer.
  if (type === 'literal') {
    if (isArrayElement) return true;
    if (parentBlock && (parentBlock.type === 'var' || parentBlock.type === 'set_var') && props.slotName === 'value') return true;
    if (expandedAccepted.includes('expression')) return true;
    return false;
  }

  if (isArrayElement) {
    // On doit vérifier si le bloc est compatible avec le elementType du tableau
    const kind = typeof parentBlock.config.elementType === 'string' ? 
                 parentBlock.config.elementType : parentBlock.config.elementType.kind;
    
    // Mapping des types littéraux vers les types de base
    const literalToKind: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'true': 'boolean',
      'false': 'boolean',
      'array': 'array',
      'object': 'object'
    };

    const blockKind = literalToKind[normalizedType];
    
    // Si c'est un littéral, il doit correspondre au kind du tableau
    if (blockKind) {
      if (blockKind !== kind) {
        return false;
      }
    }

    // On accepte aussi les expressions si le tableau accepte les types de base correspondants
    if (expandedAccepted.includes(normalizedType) || 
        (expandedAccepted.includes('math-op') && normalizedType.startsWith('math-')) ||
        (expandedAccepted.includes('compare-op') && normalizedType.startsWith('compare-'))) {
      
      // Si c'est un bloc 'var', on vérifie si son type est compatible
      if (normalizedType === 'var' && kind !== 'any') {
        // Pour les variables existantes, on peut essayer de trouver leur type
        // Note: ceci est complexe car il faut trouver la déclaration de la variable
        // Pour l'instant on accepte 'var' car c'est une expression dynamique, 
        // mais on pourrait être plus strict si on avait accès au type de la variable.
        return true; 
      }
      return true;
    }
    
    // Si ce n'est pas explicitement accepté ou si c'est un mauvais littéral, on refuse
    return false;
  }

  // Ajout pour permettre de dropper un bloc 'array' dans un VarBlock de type array (déclaration ou affectation)
  if (parentBlock && (parentBlock.type === 'var' || parentBlock.type === 'set_var') && props.slotName === 'value' && normalizedType === 'array') {
    let targetKind = null;
    if (parentBlock.type === 'var') {
      targetKind = typeof parentBlock.config?.typeConfig === 'string' ? 
                   parentBlock.config.typeConfig : parentBlock.config?.typeConfig?.kind;
    } else if (parentBlock.type === 'set_var') {
      const varBlock = parentBlock.config.slots?.variable;
      const selectedVar = varBlock?.config?.selectedVar;
      if (selectedVar) {
        const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
        const declaration = currentFunction ? findVarDeclaration(currentFunction.blocks, selectedVar) : null;
        if (declaration) {
          targetKind = typeof declaration.config?.typeConfig === 'string' ? 
                       declaration.config.typeConfig : declaration.config?.typeConfig?.kind;
        }
      }
    }

    if (targetKind === 'array') {
      return true;
    }
  }

  const result = expandedAccepted.includes(normalizedType) || 
         (expandedAccepted.includes('math-op') && normalizedType.startsWith('math-')) ||
         (expandedAccepted.includes('compare-op') && normalizedType.startsWith('compare-'));
  
  return result;
};

const onDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDraggingOver.value = false;
  const typeFromData = e.dataTransfer?.getData('blockType') || e.dataTransfer?.getData('text/plain');
  const existingBlockId = e.dataTransfer?.getData('existingBlockId');
  const sourceFunctionId = e.dataTransfer?.getData('sourceFunctionId') || activeFunctionId.value;

  if (activeFunctionId.value) {
    const blockTypeToDrop = typeFromData || (existingBlockId ? getBlockById(sourceFunctionId, existingBlockId)?.type : null);
    
    // On doit vérifier chaque type dans le cas d'un multi-drop (mais isAccepted ne prend qu'un type)
    // On fait un check rapide ici pour le feedback visuel du dragover, 
    // mais pour le drop on va filtrer individuellement.
    if (blockTypeToDrop && !blockTypeToDrop.includes(',') && !blockTypeToDrop.includes('*') && !isAccepted(blockTypeToDrop)) {
      return;
    }

    // Gestion du multi-drop : si typeFromData contient des virgules, c'est une liste de types
    // On supporte aussi le format "type*count" (ex: "string*3")
    let typesToCreate: string[] = [];
    if (typeFromData?.includes(',')) {
      typesToCreate = typeFromData.split(',');
    } else if (typeFromData?.includes('*')) {
      const [type, countStr] = typeFromData.split('*');
      const count = parseInt(countStr || '1');
      for (let i = 0; i < count; i++) typesToCreate.push(type!);
    } else if (typeFromData) {
      typesToCreate = [typeFromData];
    }

    for (const currentType of typesToCreate) {
      if (currentType && !existingBlockId) {
        // Validation individuelle pour le multi-drop
        if (!isAccepted(currentType)) continue;

        // New block from sidebar
        let blockToCreate = currentType;
        let initialConfig = {};
        
        // Mapping des types littéraux vers les types de base
        const literalToKind: Record<string, string> = {
          'string': 'string', 'number': 'number', 'boolean': 'boolean',
          'true': 'boolean', 'false': 'boolean', 'array': 'array', 'object': 'object'
        };

        // Logic pour ArrayBlock: si on drop un bloc "générique" ou un bloc litéral, 
        // on vérifie si le parent est un array avec un elementType défini.
        if (props.parentBlockId) {
          const parentBlock = getBlockById(activeFunctionId.value, props.parentBlockId);
          if (parentBlock && parentBlock.type === 'array' && parentBlock.config?.elementType) {
            const kind = typeof parentBlock.config.elementType === 'string' ? 
                         parentBlock.config.elementType : parentBlock.config.elementType.kind;
            
            // Si on glisse un bloc générique ou "literal" ou qu'on veut forcer le type du tableau
            if (currentType === 'literal' || !literalToKind[currentType] || literalToKind[currentType] === kind) {
              if (kind === 'string') blockToCreate = 'string';
              else if (kind === 'number') blockToCreate = 'number';
              else if (kind === 'boolean') blockToCreate = 'true';
              else if (kind === 'array') blockToCreate = 'array';
              else if (kind === 'object') {
                blockToCreate = 'object';
                if (parentBlock.config.elementType.structId) {
                  initialConfig = { ...initialConfig, structId: parentBlock.config.elementType.structId };
                }
              }
            }

            // Si le nouveau bloc est aussi un tableau, on lui transmet le elementType si nécessaire
            if (blockToCreate === 'array' && parentBlock.config.elementType.kind === 'array') {
              initialConfig = { elementType: parentBlock.config.elementType.elementType };
            }
          } else if (parentBlock && (parentBlock.type === 'var' || parentBlock.type === 'set_var') && props.slotName === 'value') {
            let targetKind = 'any';
            let arrayElementType = null;

            if (parentBlock.type === 'var') {
              const typeCfg = parentBlock.config?.typeConfig;
              targetKind = typeof typeCfg === 'string' ? typeCfg : (typeCfg?.kind || 'any');
              if (targetKind === 'array') {
                arrayElementType = typeCfg.elementType;
              }
            } else if (parentBlock.type === 'set_var') {
              const varBlock = parentBlock.config.slots?.variable;
              const selectedVar = varBlock?.config?.selectedVar;
              if (selectedVar) {
                const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
                const declaration = currentFunction ? findVarDeclaration(currentFunction.blocks, selectedVar) : null;
                if (declaration) {
                  const typeCfg = declaration.config?.typeConfig;
                  targetKind = typeof typeCfg === 'string' ? typeCfg : (typeCfg?.kind || 'any');
                  if (targetKind === 'array') {
                    arrayElementType = typeCfg.elementType;
                  }
                }
              }
            }

            // Transformation du littéral joker pour les variables
            if (currentType === 'literal') {
              if (targetKind === 'string') blockToCreate = 'string';
              else if (targetKind === 'number') blockToCreate = 'number';
              else if (targetKind === 'boolean') blockToCreate = 'true';
              else if (targetKind === 'array') blockToCreate = 'array';
              else if (targetKind === 'object') blockToCreate = 'object';
              else blockToCreate = 'string'; // Fallback
            }

            if (blockToCreate === 'object' && targetKind === 'object') {
              const typeCfg = parentBlock.type === 'var' ? 
                              parentBlock.config.typeConfig : 
                              (functions.value.find(f => f.id === activeFunctionId.value) && parentBlock.config.slots?.variable?.config?.selectedVar ? 
                                findVarDeclaration(functions.value.find(f => f.id === activeFunctionId.value)!.blocks, parentBlock.config.slots.variable.config.selectedVar)?.config?.typeConfig : 
                                null);
              if (typeCfg?.structId) {
                initialConfig = { ...initialConfig, structId: typeCfg.structId };
              }
            }

            if (blockToCreate === 'array' && arrayElementType) {
              initialConfig = { ...initialConfig, elementType: arrayElementType };
            }
          } else if (parentBlock && parentBlock.type === 'array' && parentBlock.config?.elementType) {
             const kind = typeof parentBlock.config.elementType === 'string' ? 
                          parentBlock.config.elementType : parentBlock.config.elementType.kind;
             
             if (blockToCreate === 'object' && kind === 'object') {
               if (parentBlock.config.elementType.structId) {
                 initialConfig = { ...initialConfig, structId: parentBlock.config.elementType.structId };
               }
             }
          }
        }

        addBlockToFunction(activeFunctionId.value, blockToCreate, props.parentBlockId, props.slotName, undefined, props.afterBlockId, initialConfig);
      } else if (existingBlockId) {
        // Re-nesting existing block (seulement pour le premier si multi-drop improbable ici)
        const block = getBlockById(sourceFunctionId, existingBlockId);
        if (block) {
          removeBlockFromFunction(sourceFunctionId, existingBlockId);
          
          let initialConfig = block.config || {};
          
          // Propagation du structId pour les blocs déplacés
          if (props.parentBlockId) {
            const parentBlock = getBlockById(activeFunctionId.value, props.parentBlockId);
            if (parentBlock && parentBlock.type === 'array' && parentBlock.config?.elementType) {
              const kind = typeof parentBlock.config.elementType === 'string' ? 
                           parentBlock.config.elementType : parentBlock.config.elementType.kind;
              
              if (block.type === 'object' && kind === 'object' && parentBlock.config.elementType.structId) {
                initialConfig = { ...initialConfig, structId: parentBlock.config.elementType.structId };
              }
            } else if (parentBlock && (parentBlock.type === 'var' || parentBlock.type === 'set_var') && props.slotName === 'value') {
              let targetKind = 'any';
              let targetStructId = null;

              if (parentBlock.type === 'var') {
                const typeCfg = parentBlock.config?.typeConfig;
                targetKind = typeof typeCfg === 'string' ? typeCfg : (typeCfg?.kind || 'any');
                targetStructId = typeCfg?.structId;
              } else if (parentBlock.type === 'set_var') {
                // Recherche de la déclaration pour trouver le type de la variable
                const varBlock = parentBlock.config.slots?.variable;
                const selectedVar = varBlock?.config?.selectedVar;
                if (selectedVar) {
                  const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
                  const declaration = currentFunction ? findVarDeclaration(currentFunction.blocks, selectedVar) : null;
                  if (declaration) {
                    const typeCfg = declaration.config?.typeConfig;
                    targetKind = typeof typeCfg === 'string' ? typeCfg : (typeCfg?.kind || 'any');
                    targetStructId = typeCfg?.structId;
                  }
                }
              }

              if (block.type === 'object' && targetKind === 'object' && targetStructId) {
                initialConfig = { ...initialConfig, structId: targetStructId };
              }
            }
          }
          
          addBlockToFunction(activeFunctionId.value, block.type, props.parentBlockId, props.slotName, { ...block, config: initialConfig }, props.afterBlockId);
        }
        break; // On ne traite qu'un seul bloc existant
      }
    }
  }
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (e.dataTransfer) {
    const isExisting = e.dataTransfer.types.includes('existingblockid');
    e.dataTransfer.dropEffect = isExisting ? 'move' : 'copy';
    
    // Tentative de récupération du type pendant le dragover pour le feedback visuel
    // Note: getData() ne fonctionne souvent pas pendant le dragover pour des raisons de sécurité
    // Sauf si on utilise des types MIME spécifiques ou si on est sur le même élément.
    const type = e.dataTransfer.getData('blockType') || e.dataTransfer.getData('text/plain');
    
    let detectedType = type;
    if (detectedType) {
      if (!isAccepted(detectedType)) {
        e.dataTransfer.dropEffect = 'none';
        isDraggingOver.value = false;
        return;
      }
    }
  }
  
  isDraggingOver.value = true;
};

const onDragLeave = () => {
  isDraggingOver.value = false;
};
const onDragStart = (e: DragEvent) => {
  if (props.block && e.dataTransfer && activeFunctionId.value) {
    e.stopPropagation();
    e.dataTransfer.setData('existingBlockId', props.block.id);
    e.dataTransfer.setData('blockType', props.block.type);
    // On ajoute aussi le type dans les types pour y accéder pendant dragover
    e.dataTransfer.setData('text/plain', props.block.type);
    e.dataTransfer.setData('sourceFunctionId', activeFunctionId.value);
    e.dataTransfer.effectAllowed = 'move';
  }
};
</script>

<template>
  <div 
    class="block-drop-zone"
    :class="{ 'is-dragging-over': isDraggingOver, 'is-stack-zone': isStackZone }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    :draggable="!!block"
    @dragstart="onDragStart"
  >
    <slot v-if="block" />
    <span v-else class="placeholder">?</span>
  </div>
</template>

<style scoped>
.block-drop-zone {
  min-width: 40px;
  min-height: 30px;
  background: rgba(var(--text-color-rgb, 255, 255, 255), 0.1);
  border: 2px dashed rgba(var(--text-color-rgb, 255, 255, 255), 0.3);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: all 0.2s ease;
  margin: 2px;
  box-sizing: border-box;
}

.block-drop-zone.is-stack-zone {
  min-height: 12px;
  margin: 0;
  border-radius: 3px;
  background: transparent;
  border: 1px dashed rgba(var(--text-color-rgb, 255, 255, 255), 0.15);
}

.block-drop-zone.is-stack-zone:hover, .block-drop-zone.is-stack-zone.is-dragging-over {
  min-height: 24px;
  background: rgba(var(--text-color-rgb, 255, 255, 255), 0.1);
  border-color: rgba(var(--text-color-rgb, 255, 255, 255), 0.4);
  margin: 2px 0;
}

.block-drop-zone.is-dragging-over {
  background: rgba(var(--text-color-rgb, 255, 255, 255), 0.2);
  border-color: var(--text-color);
  transform: scale(1.05);
}

.block-drop-zone:hover {
  background: rgba(var(--text-color-rgb, 255, 255, 255), 0.15);
  border-color: rgba(var(--text-color-rgb, 255, 255, 255), 0.5);
  transform: scale(1.02);
}

.placeholder {
  color: var(--text-color);
  opacity: 0.6;
  font-size: 1.2em;
  font-weight: bold;
}
</style>
