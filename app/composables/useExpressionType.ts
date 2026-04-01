import type { BlockInstance } from './useFunctions';

export const useExpressionType = () => {
  const { functions, activeFunctionId } = useFunctions();

  const findVarType = (blocks: BlockInstance[], name: string): any => {
    for (const block of blocks) {
      if (block.type === 'var' && block.config?.name === name) return block.config.typeConfig;
      if (block.type === 'for' && block.config?.loopVar === name) return 'number';
      if (block.type === 'foreach') {
        if (block.config?.key === name) return 'number';
        if (block.config?.item === name) {
          const listBlock = block.config.slots?.list;
          if (listBlock) {
            const listType = getBlockType(listBlock, blocks);
            if (listType && typeof listType === 'object' && listType.kind === 'array') {
              return listType.itemType || 'any';
            }
          }
          return 'any';
        }
      }
      if (block.children) {
        const found = findVarType(block.children, name);
        if (found) return found;
      }
      if (block.config?.slots) {
        for (const s of Object.values(block.config.slots)) {
          if (s) {
            const found = findVarType(Array.isArray(s) ? s : [s as any], name);
            if (found) return found;
          }
        }
      }
    }
    return null;
  };

  const findParamType = (blocks: BlockInstance[], name: string): any => {
    for (const block of blocks) {
      if (block.type === 'parameter' && block.config?.name === name && !block.config?.selectedParam) return block.config.type;
      if (block.children) {
        const found = findParamType(block.children, name);
        if (found) return found;
      }
      if (block.config?.slots) {
        for (const s of Object.values(block.config.slots)) {
          if (s) {
            const found = findParamType(Array.isArray(s) ? s : [s as any], name);
            if (found) return found;
          }
        }
      }
    }
    return null;
  };

  const getBlockType = (block: BlockInstance, contextBlocks?: BlockInstance[]): any => {
    if (!block) return 'any';

    switch (block.type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean':
      case 'true':
      case 'false':
      case 'equal': return 'boolean';
      case 'array': return block.config?.itemType ? { kind: 'array', itemType: block.config.itemType } : (block.config?.elementType ? { kind: 'array', itemType: block.config.elementType } : 'array');
      case 'object': return block.config?.structId ? { kind: 'object', structId: block.config.structId } : 'object';
      case 'var':
        if (block.config?.selectedVar) {
          const blocks = contextBlocks || functions.value.find(f => f.id === activeFunctionId.value)?.blocks || [];
          const vt = findVarType(blocks, block.config.selectedVar);
          if (vt && typeof vt === 'object' && vt.itemType) {
            return { kind: 'array', itemType: vt.itemType };
          }
          if (vt && typeof vt === 'object' && vt.elementType) {
            return { kind: 'array', itemType: vt.elementType };
          }
          return vt || 'any';
        }
        const tc = block.config?.typeConfig;
        if (tc && typeof tc === 'object' && tc.kind === 'array') {
          if (tc.itemType) return { kind: 'array', itemType: tc.itemType };
          if (tc.elementType) return { kind: 'array', itemType: tc.elementType };
        }
        return tc || 'any';
      case 'parameter':
        if (block.config?.selectedParam) {
          const blocks = contextBlocks || functions.value.find(f => f.id === activeFunctionId.value)?.blocks || [];
          const pt = findParamType(blocks, block.config.selectedParam);
          if (pt && typeof pt === 'object' && pt.itemType) {
            return { kind: 'array', itemType: pt.itemType };
          }
          if (pt && typeof pt === 'object' && pt.elementType) {
            return { kind: 'array', itemType: pt.elementType };
          }
          return pt || 'any';
        }
        const t = block.config?.type;
        if (t && typeof t === 'object' && t.kind === 'array') {
          if (t.itemType) return { kind: 'array', itemType: t.itemType };
          if (t.elementType) return { kind: 'array', itemType: t.elementType };
        }
        return t || 'any';
      case 'object_property':
        // Pour être complet il faudrait inférer le type de la propriété, mais c'est complexe ici
        return 'any';
      case 'function':
        const func = functions.value.find(f => f.id === block.config?.functionId);
        return func?.metadata?.returnType || 'any';
      default:
        if (block.type.startsWith('math-')) return 'number';
        if (block.type.startsWith('compare-')) return 'boolean';
        return 'any';
    }
  };

  return {
    getBlockType,
    findVarType,
    findParamType
  };
};
