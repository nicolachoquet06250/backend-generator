<script setup lang="ts">
const props = defineProps<{
  slotName?: string;
  parentBlockId: string;
  afterBlockId?: string;
  block?: any;
  acceptedBlockTypes?: string[];
  isStackZone?: boolean;
  isBetweenBlocks?: boolean;
  isBetweenIfChain?: boolean;
  filterContext?: string;
}>();

import BlockPickerModal from '../editor/BlockPickerModal.vue';

const showPicker = ref(false);

const { functions, activeFunctionId, addBlockToFunction, removeBlockFromFunction, getBlockById, updateFunctionMetadata } = useFunctions();

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
          const found = findVarDeclaration(Array.isArray(s) ? s : [s as any], name);
          if (found) return found;
        }
      }
    }
  }
  return null;
};

const findParamDeclaration = (blocks: any[], name: string): any => {
  for (const block of blocks) {
    if (block.type === 'parameter' && block.config?.name === name && !block.config?.selectedParam) return block;
    if (block.children) {
      const found = findParamDeclaration(block.children, name);
      if (found) return found;
    }
    if (block.config?.slots) {
      for (const s of Object.values(block.config.slots)) {
        if (s) {
          const found = findParamDeclaration(Array.isArray(s) ? s : [s as any], name);
          if (found) return found;
        }
      }
    }
  }
  return null;
};

const { isMobile } = useDevice();
const inLoop = inject('inLoop', ref(false));
const isDraggingOver = ref(false);

const isAccepted = (type: string) => {
  if (type === 'break' || type === 'continue') {
    if (!inLoop.value) return false;
  }
  
  // Le type 'literal' est un joker pour le type attendu par le parent (utile pour le multi-drop)
  // Il est traité plus bas dans la logique spécifique aux parents.

  let normalizedType = type;
  if (type === 'true' || type === 'false') {
    normalizedType = 'boolean';
  }

  if (normalizedType === 'elseif' || normalizedType === 'else') {
    if (!props.isStackZone) return false;
    
    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    if (!currentFunction) return false;

    let siblings: any[] = [];
    if (props.parentBlockId) {
      const parent = getBlockById(activeFunctionId.value, props.parentBlockId);
      if (parent) siblings = parent.children || [];
    } else {
      siblings = currentFunction.blocks;
    }

    // On cherche le bloc qui précède le point d'insertion (afterBlockId).
    const prevIndex = props.afterBlockId === 'start' ? -1 : siblings.findIndex(b => b.id === props.afterBlockId);
    const previousBlock = prevIndex === -1 ? null : siblings[prevIndex];
    const nextBlock = siblings[prevIndex + 1];

    if (normalizedType === 'elseif') {
      // Un elseif doit être précédé d'un if ou d'un elseif
      const isPrecededByIfChain = previousBlock && (previousBlock.type === 'if' || previousBlock.type === 'elseif');
      if (!isPrecededByIfChain) return false;

      // On ne peut pas insérer un elseif APRES un else (ça casserait la chaîne)
      return previousBlock?.type !== 'else';


    }

    if (normalizedType === 'else') {
      // Un else doit être précédé d'un if ou d'un elseif
      const isPrecededByIfChain = previousBlock && (previousBlock.type === 'if' || previousBlock.type === 'elseif');
      if (!isPrecededByIfChain) return false;

      // On ne peut pas avoir deux "else" à la suite
      if (nextBlock && nextBlock.type === 'else') return false;

      // On ne peut pas mettre un block "else" avant un block "elseif"
      return !(nextBlock && nextBlock.type === 'elseif');


    }
  }

  // Si on essaie de dropper n'importe quel bloc (autre qu'elseif/else)
  // dans une position qui casserait la chaîne conditionnelle.
  if (normalizedType !== 'elseif' && normalizedType !== 'else' && props.isStackZone) {
    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    if (currentFunction) {
      let siblings: any[] = [];
      if (props.parentBlockId) {
        const parent = getBlockById(activeFunctionId.value, props.parentBlockId);
        if (parent) siblings = parent.children || [];
      } else {
        siblings = currentFunction.blocks;
      }

      const prevIndex = props.afterBlockId === 'start' ? -1 : siblings.findIndex(b => b.id === props.afterBlockId);
      const previousBlock = prevIndex === -1 ? null : siblings[prevIndex];
      const nextBlock = siblings[prevIndex + 1];

      const isPrevIfChain = previousBlock && (previousBlock.type === 'if' || previousBlock.type === 'elseif');
      const isNextIfChainPart = nextBlock && (nextBlock.type === 'elseif' || nextBlock.type === 'else');

      // Si on est ENTRE deux morceaux d'une même chaîne (if elseif ou elseif else ou if else)
      // SEUL un elseif est autorisé ici.
      if (isPrevIfChain && isNextIfChainPart) {
        return normalizedType === 'elseif';

      }

      // Si on est JUSTE AVANT un elseif ou un else existant.
      if (isNextIfChainPart) {
        if (!previousBlock) {
          return normalizedType === 'if';

        } else {
          if (normalizedType !== 'if' && normalizedType !== 'elseif') return false;
          // Si c'est un if ou un elseif, on autorise, mais ATTENTION :
          // si previousBlock était déjà un if/elseif, on est tombé dans le cas précédent (isPrevIfChain && isNextIfChainPart).
          // Sinon, on autorise l'insertion d'un if/elseif pour "réparer" ou "insérer" une chaîne.
          return true;
        }
      }
    }
  }

  if (!props.acceptedBlockTypes || props.acceptedBlockTypes.length === 0) return true;

  const expressionTypes = ['string', 'number', 'boolean', 'true', 'false', 'var', 'parameter', 'math-op', 'compare-op', 'equal', 'array', 'object', 'object_property', 'function', 'print', 'json', 'html', 'ternary'];
  
  const expandedAccepted = props.acceptedBlockTypes.flatMap(t => t === 'expression' ? expressionTypes : [t]);

  // Si on est dans un ArrayBlock avec un elementType, on accepte d'autres types,
  // car on va les transformer lors du drop (si c'est un nouveau bloc).
  const parentBlock = props.parentBlockId ? getBlockById(activeFunctionId.value, props.parentBlockId) : null;
  const isArrayElement = parentBlock && parentBlock.type === 'array' && parentBlock.config?.elementType;
  
  // Si le type est "literal", on l'accepte si on est dans un tableau ou dans un slot qui attend une expression.
  // Dans le cas d'une variable, on vérifiera la compatibilité lors du drop réel pour savoir quel type de littéral créer.
  if (type === 'literal') {
    if (isArrayElement) return true;
    if (parentBlock && (parentBlock.type === 'var' || parentBlock.type === 'set_var') && props.slotName === 'value') return true;
    return expandedAccepted.includes('expression');
  }

  if (isArrayElement) {
    // ... existant ...
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
        // Note : ceci est complexe, car il faut trouver la déclaration de la variable
        // Pour l'instant, on accepte 'var' parce que c'est une expression dynamique,
        // mais on pourrait être plus strict si on avait accès au type de la variable.
        return true; 
      }
      return true;
    }
    
    // Si ce n'est pas explicitement accepté ou si c'est un mauvais littéral, on refuse
    return false;
  }

  // Validation spécifique pour le bloc Ternary : forcer isTrue et isFalse à avoir le même type
  if (parentBlock && parentBlock.type === 'ternary' && (props.slotName === 'isTrue' || props.slotName === 'isFalse')) {
    const otherSlotName = props.slotName === 'isTrue' ? 'isFalse' : 'isTrue';
    const otherBlock = parentBlock.config?.slots?.[otherSlotName];
    
    if (otherBlock) {
      // Si l'autre slot est rempli, on doit vérifier la compatibilité
      const getReturnType = (block: any): string | null => {
        if (!block) return null;
        const type = block.type;
        if (type === 'string' || type === 'number' || type === 'array' || type === 'object') return type;
        if (type === 'true' || type === 'false' || type === 'boolean' || type === 'equal' || type.startsWith('compare-')) return 'boolean';
        if (type.startsWith('math-')) return 'number';
        if (type === 'var' || type === 'parameter') return block.config?.variableType || null;
        if (type === 'function') return block.config?.returnType || null;
        if (type === 'ternary') return getReturnType(block.config?.slots?.isTrue) || 'any';
        return null;
      };

      const otherType = getReturnType(otherBlock);
      const currentType = getReturnType({ type: normalizedType });

      if (otherType && currentType && otherType !== 'any' && currentType !== 'any' && otherType !== currentType) {
        return false;
      }
    }
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

  if (parentBlock && (parentBlock.type === 'json' || parentBlock.type === 'html' || parentBlock.type === 'new_route')) {
    // Si un bloc est déjà présent dans ce slot et que ce n'est pas une zone de pile, on refuse.
    if (props.block && !props.isStackZone) return false;

    // On n'accepte que les types explicitement fournis dans expandedAccepted (car déjà limités dans JsonBlock/HtmlBlock/NewRouteBlock).
    return expandedAccepted.includes(normalizedType);
  }

  if (normalizedType === 'elseif' || normalizedType === 'else') {
    if (!props.isStackZone) return false;
    
    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    if (!currentFunction) return false;

    let siblings: any[] = [];
    if (props.parentBlockId) {
      const parent = getBlockById(activeFunctionId.value, props.parentBlockId);
      if (parent) siblings = parent.children || [];
    } else {
      siblings = currentFunction.blocks;
    }

    // On cherche le bloc qui précède le point d'insertion (afterBlockId).
    const prevIndex = props.afterBlockId === 'start' ? -1 : siblings.findIndex(b => b.id === props.afterBlockId);
    const previousBlock = prevIndex === -1 ? null : siblings[prevIndex];
    const nextBlock = siblings[prevIndex + 1];

    if (normalizedType === 'elseif') {
      // Un elseif doit être précédé d'un if ou d'un elseif
      const isPrecededByIfChain = previousBlock && (previousBlock.type === 'if' || previousBlock.type === 'elseif');
      if (!isPrecededByIfChain) return false;

      // On ne peut pas insérer un elseif APRES un else (ça casserait la chaîne)
      return previousBlock?.type !== 'else';


    }

    if (normalizedType === 'else') {
      // Un else doit être précédé d'un if ou d'un elseif
      const isPrecededByIfChain = previousBlock && (previousBlock.type === 'if' || previousBlock.type === 'elseif');
      if (!isPrecededByIfChain) return false;

      // On ne peut pas avoir deux "else" à la suite
      if (nextBlock && nextBlock.type === 'else') return false;

      // On ne peut pas mettre un block "else" avant un block "elseif"
      return !(nextBlock && nextBlock.type === 'elseif');


    }
  }

  // Si on essaie de dropper n'importe quel bloc (autre qu'elseif/else)
  // dans une position qui casserait la chaîne conditionnelle.
  if (normalizedType !== 'elseif' && normalizedType !== 'else' && props.isStackZone) {
    const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
    if (currentFunction) {
      let siblings: any[] = [];
      if (props.parentBlockId) {
        const parent = getBlockById(activeFunctionId.value, props.parentBlockId);
        if (parent) siblings = parent.children || [];
      } else {
        siblings = currentFunction.blocks;
      }

      const prevIndex = props.afterBlockId === 'start' ? -1 : siblings.findIndex(b => b.id === props.afterBlockId);
      const previousBlock = prevIndex === -1 ? null : siblings[prevIndex];
      const nextBlock = siblings[prevIndex + 1];

      const isPrevIfChain = previousBlock && (previousBlock.type === 'if' || previousBlock.type === 'elseif');
      const isNextIfChainPart = nextBlock && (nextBlock.type === 'elseif' || nextBlock.type === 'else');

      // Si on est ENTRE deux morceaux d'une même chaîne (if elseif ou elseif else ou if else)
      // SEUL un elseif est autorisé ici.
      if (isPrevIfChain && isNextIfChainPart) {
        return normalizedType === 'elseif';

      }

      // Si on est JUSTE AVANT un elseif ou un else existant.
      if (isNextIfChainPart) {
        if (!previousBlock) {
          return normalizedType === 'if';

        } else {
          if (normalizedType !== 'if' && normalizedType !== 'elseif') return false;
          // Si c'est un if ou un elseif, on autorise, mais ATTENTION :
          // si previousBlock était déjà un if/elseif, on est tombé dans le cas précédent (isPrevIfChain && isNextIfChainPart).
          // Sinon, on autorise l'insertion d'un if/elseif pour "réparer" ou "insérer" une chaîne.
          return true;
        }
      }
    }
  }

  // Cas spécifique : ne pas pouvoir dropper quoi que ce soit entre un elseif et un else, 
  // ou entre un if et un elseif, SAUF un elseif.
  // C'est déjà couvert par la logique ci-dessus.

  return (expandedAccepted.includes(normalizedType) ||
      (expandedAccepted.includes('math-op') && normalizedType.startsWith('math-')) ||
      (expandedAccepted.includes('compare-op') && normalizedType.startsWith('compare-'))) && 
      normalizedType !== 'elseif' && normalizedType !== 'else';
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
    // mais pour le drop, on va filtrer individuellement.
    if (blockTypeToDrop && !blockTypeToDrop.includes(',') && !blockTypeToDrop.includes('*') && !isAccepted(blockTypeToDrop)) {
      return;
    }

    // Gestion du multi-drop : si typeFromData contient des virgules, c'est une liste de types
    // On supporte aussi le format "type*count" (ex : "string*3")
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
        let initialConfig: Record<string, any> = {};
        
        // Mapping des types littéraux vers les types de base
        const literalToKind: Record<string, string> = {
          'string': 'string', 'number': 'number', 'boolean': 'boolean',
          'true': 'boolean', 'false': 'boolean', 'array': 'array', 'object': 'object'
        };

        // Logic pour ArrayBlock : si on drop un bloc "générique" ou un bloc litéral,
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

            // Si le nouveau bloc est aussi un tableau, on lui transmet l'elementType si nécessaire
            if (blockToCreate === 'array' && parentBlock.config.elementType.kind === 'array') {
              initialConfig = { elementType: parentBlock.config.elementType.elementType };
            }
          } else if (parentBlock && (parentBlock.type === 'json' || parentBlock.type === 'html')) {
            // Pour le bloc JSON/HTML, si on drop un littéral générique, on crée un string par défaut
            if (currentType === 'literal') {
              blockToCreate = 'string';
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

        // Update function metadata if drop in a return block
        if (props.parentBlockId) {
          const parentBlock = getBlockById(activeFunctionId.value, props.parentBlockId);
          if (parentBlock && parentBlock.type === 'return' && props.slotName === 'value') {
            let returnType = blockToCreate;
            if (blockToCreate === 'true' || blockToCreate === 'false') {
              returnType = 'boolean';
            } else if (blockToCreate.startsWith('math-')) {
              returnType = 'number';
            } else if (blockToCreate.startsWith('compare-') || blockToCreate === 'equal') {
              returnType = 'boolean';
            } else if (blockToCreate === 'var') {
              returnType = 'any';
            }
            if (blockToCreate === 'var' && initialConfig.selectedVar) {
              const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
              const declaration = currentFunction ? findVarDeclaration(currentFunction.blocks, initialConfig.selectedVar) : null;
              if (declaration) {
                returnType = declaration.config?.typeConfig || 'any';
              }
            } else if (blockToCreate === 'parameter' && initialConfig.selectedParam) {
              const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
              const declaration = currentFunction ? findParamDeclaration(currentFunction.blocks, initialConfig.selectedParam) : null;
              if (declaration) {
                returnType = declaration.config?.type || 'any';
              }
            } else if (blockToCreate === 'function' && initialConfig.functionId) {
              const targetFunc = functions.value.find(f => f.id === initialConfig.functionId);
              if (targetFunc) {
                returnType = targetFunc.metadata?.returnType || 'any';
              }
            } else if (blockToCreate === 'ternary') {
              returnType = 'any';
            }
            updateFunctionMetadata(activeFunctionId.value, { returnType });
          }
        }
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
                const varBlock = parentBlock.config?.slots?.variable || parentBlock.config?.variable;
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
          
          // Update function metadata if drop in a return block
          if (props.parentBlockId) {
            const parentBlock = getBlockById(activeFunctionId.value, props.parentBlockId);
            if (parentBlock && parentBlock.type === 'return' && props.slotName === 'value') {
              let returnType: any = block.type;
              if (block.type === 'string') {
                returnType = 'string';
              } else if (block.type === 'number') {
                returnType = 'number';
              } else if (block.type === 'true' || block.type === 'false' || block.type === 'boolean') {
                returnType = 'boolean';
              } else if (block.type.startsWith('math-')) {
                returnType = 'number';
              } else if (block.type.startsWith('compare-') || block.type === 'equal') {
                returnType = 'boolean';
              } else if (block.type === 'array') {
                returnType = initialConfig.elementType ? { kind: 'array', elementType: initialConfig.elementType } : 'array';
              } else if (block.type === 'object') {
                returnType = initialConfig.structId ? { kind: 'object', structId: initialConfig.structId } : 'object';
              } else if (block.type === 'var') {
                returnType = 'any';
              } else if (block.type === 'ternary') {
                const getReturnType = (b: any): string | null => {
                  if (!b) return null;
                  const type = b.type;
                  if (type === 'string' || type === 'number' || type === 'array' || type === 'object') return type;
                  if (type === 'true' || type === 'false' || type === 'boolean' || type === 'equal' || type.startsWith('compare-')) return 'boolean';
                  if (type.startsWith('math-')) return 'number';
                  if (type === 'var' || type === 'parameter') return b.config?.variableType || null;
                  if (type === 'function') return b.config?.returnType || null;
                  if (type === 'ternary') return getReturnType(b.config?.slots?.isTrue) || 'any';
                  return null;
                };
                returnType = getReturnType(block) || 'any';
              }
              if (block.type === 'var' && initialConfig.selectedVar) {
                const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
                const declaration = currentFunction ? findVarDeclaration(currentFunction.blocks, initialConfig.selectedVar) : null;
                if (declaration) {
                  returnType = declaration.config?.typeConfig || 'any';
                }
              } else if (block.type === 'parameter' && initialConfig.selectedParam) {
                const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
                const declaration = currentFunction ? findParamDeclaration(currentFunction.blocks, initialConfig.selectedParam) : null;
                if (declaration) {
                  returnType = declaration.config?.type || 'any';
                }
              } else if (block.type === 'function' && initialConfig.functionId) {
                const targetFunc = functions.value.find(f => f.id === initialConfig.functionId);
                if (targetFunc) {
                  returnType = targetFunc.metadata?.returnType || 'any';
                }
              }
              updateFunctionMetadata(activeFunctionId.value, { returnType });
            }
          }
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
    // Sur certains navigateurs mobiles, e.dataTransfer.types est un DOMStringList et non un Array
    const types = Array.from(e.dataTransfer.types);
    const isExisting = types.some(t => t.toLowerCase() === 'existingblockid');
    e.dataTransfer.dropEffect = isExisting ? 'move' : 'copy';
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

const handlePickerSelect = (type: string) => {
  if (!activeFunctionId.value) return;
  
  // Logic almost identical to onDrop but simplified for new blocks only
  let initialConfig: any = {};
  
  // Adapt if it's math or compare op
  let blockType = type;
  if (type.startsWith('math-')) {
    blockType = `math-${type.split('-')[1]}`;
    initialConfig = {};
  } else if (type.startsWith('compare-')) {
    blockType = `compare-${type.split('-')[1]}`;
    initialConfig = {};
  } else if (type === 'equal') {
    blockType = 'equal';
    initialConfig = { symbol: '==' };
  } else if (type === 'true' || type === 'false') {
    blockType = 'boolean';
    initialConfig = { value: type === 'true' };
  }

  // Handle special case for array elements if it has an elementType
  const parentBlock = props.parentBlockId ? getBlockById(activeFunctionId.value, props.parentBlockId) : null;
  if (parentBlock && parentBlock.type === 'array' && parentBlock.config?.elementType) {
    const targetKind = typeof parentBlock.config.elementType === 'string' ? 
                 parentBlock.config.elementType : parentBlock.config.elementType.kind;
    const targetStructId = typeof parentBlock.config.elementType === 'object' ? 
                 parentBlock.config.elementType.structId : null;
    
    if (targetKind !== 'any') {
      if (blockType === 'string' && targetKind === 'string') initialConfig = { ...initialConfig, value: '' };
      if (blockType === 'number' && targetKind === 'number') initialConfig = { ...initialConfig, value: 0 };
      if (blockType === 'boolean' && targetKind === 'boolean') initialConfig = { ...initialConfig, value: true };
      if (blockType === 'object' && targetKind === 'object' && targetStructId) {
        initialConfig = { ...initialConfig, structId: targetStructId };
      }
    }
  }

  addBlockToFunction(activeFunctionId.value, blockType, props.parentBlockId, props.slotName, undefined, props.afterBlockId, initialConfig);
  
  // Update function metadata if drop in a return block
  if (props.parentBlockId) {
    const parentBlock = getBlockById(activeFunctionId.value, props.parentBlockId);
    if (parentBlock && parentBlock.type === 'return' && props.slotName === 'value') {
      let returnType = blockType;
      if (blockType === 'true' || blockType === 'false') {
        returnType = 'boolean';
      } else if (blockType.startsWith('math-')) {
        returnType = 'number';
      } else if (blockType.startsWith('compare-') || blockType === 'equal') {
        returnType = 'boolean';
      } else if (blockType === 'var') {
        returnType = 'any';
      } else if (blockType === 'ternary') {
        returnType = 'any';
      }
      if (blockType === 'var' && initialConfig.selectedVar) {
        const currentFunction = functions.value.find(f => f.id === activeFunctionId.value);
        const declaration = currentFunction ? findVarDeclaration(currentFunction.blocks, initialConfig.selectedVar) : null;
        if (declaration) {
          const typeCfg = declaration.config?.typeConfig;
          returnType = typeof typeCfg === 'string' ? typeCfg : (typeCfg?.kind || 'any');
        }
      }
      updateFunctionMetadata(activeFunctionId.value, { returnType });
    }
  }
};

const onZoneClick = () => {
  if (!props.block && isMobile.value) {
    showPicker.value = true;
  }
};

const onMobileDragOver = (e: any) => {
  const dataTransfer = e.detail.dataTransfer;
  const blockType = dataTransfer.getData('blockType');
  const existingBlockId = dataTransfer.getData('existingBlockId');
  
  if (blockType && isAccepted(blockType)) {
    isDraggingOver.value = true;
  } else if (existingBlockId) {
    isDraggingOver.value = true;
  }
};

const onMobileDrop = (e: any) => {
  isDraggingOver.value = false;
  const dataTransfer = e.detail.dataTransfer;
  // On simule un DragEvent avec les fonctions preventDefault/stopPropagation
  // pour éviter les erreurs d'exécution dans onDrop
  onDrop({ 
    dataTransfer,
    preventDefault: () => {},
    stopPropagation: () => {}
  } as any);
};

const onMobileDragLeave = () => {
  isDraggingOver.value = false;
};
</script>

<template>
  <div 
    class="block-drop-zone"
    :class="{ 
      'is-dragging-over': isDraggingOver, 
      'is-stack-zone': isStackZone,
      'is-between-blocks': isBetweenBlocks,
      'is-between-if-chain': isBetweenIfChain
    }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    v-bind="!!block ? { draggable: true } : {}"
    @dragstart.stop="onDragStart"
    @mobile-dragover="onMobileDragOver"
    @mobile-dragleave="onMobileDragLeave"
    @mobile-drop="onMobileDrop"
    @click.stop="onZoneClick"
    @pointerdown.stop
    @mousedown.stop
    @touchstart.stop
    :style="{ cursor: (!block && !isMobile) ? 'default' : 'pointer' }"
  >
    <slot v-if="block" />
    <span v-else class="placeholder">?</span>

    <BlockPickerModal 
      :show="showPicker" 
      :accepted-types="acceptedBlockTypes"
      :filterContext="filterContext"
      @close="showPicker = false"
      @select="handlePickerSelect"
    />
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
  touch-action: none;
}

.block-drop-zone.is-between-blocks {
  min-height: 10px;
  height: 10px;
  margin: 0;
  padding: 0;
  border-width: 1px;
  opacity: 0.5;

  .placeholder {
    font-size: .8em;
  }
}

.block-drop-zone.is-between-blocks.is-dragging-over {
  min-height: 40px;
  height: auto;
  opacity: 1;
  margin: 4px 0;
  padding: 4px;
  border-width: 2px;
}

@media (max-width: 768px) {
  .block-drop-zone.is-between-blocks {
    min-height: 15px;
    height: 15px;
  }
  
  .block-drop-zone.is-between-blocks.is-dragging-over {
    min-height: 56px;
    height: auto;
  }

  .block-drop-zone {
    min-height: 56px; /* Increased from 48px */
    min-width: 72px;  /* Increased from 60px */
    margin: 8px 4px;  /* Slightly more spacing */
    border-width: 3px; /* More visible border */
    transition: font-size 0.2s ease;
  }
}

.block-drop-zone.is-stack-zone {
  min-height: 12px;
  margin: 0;
  width: 100%;
  border-radius: 0;
  background: transparent;
  border: 1px dashed rgba(var(--text-color-rgb, 255, 255, 255), 0.1);
  border-left: none;
  border-right: none;
}

.block-drop-zone.is-stack-zone.is-between-if-chain {
  min-height: 20px;
  height: 20px;
  background: rgba(var(--text-color-rgb, 255, 255, 255), 0.05);
  border-color: rgba(var(--text-color-rgb, 255, 255, 255), 0.2);
  margin: 0;
  opacity: 1;
}

.block-drop-zone.is-stack-zone.is-between-if-chain:hover,
.block-drop-zone.is-stack-zone.is-between-if-chain.is-dragging-over {
  min-height: 40px;
  height: auto;
  background: rgba(var(--text-color-rgb, 255, 255, 255), 0.15);
  margin: 4px 0;
}

@media (max-width: 768px) {
  .block-drop-zone.is-stack-zone {
    min-height: 26px;
    margin: 0;
  }
}

.block-drop-zone.is-stack-zone:hover, .block-drop-zone.is-stack-zone.is-dragging-over {
  min-height: 24px;
  background: rgba(var(--text-color-rgb, 255, 255, 255), 0.1);
  border-color: rgba(var(--text-color-rgb, 255, 255, 255), 0.4);
  margin: 2px 0;

  .placeholder {
    font-size: 1.5em;
  }
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
  user-select: none;
}
</style>
