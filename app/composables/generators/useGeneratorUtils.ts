import type { BlockInstance } from '../useFunctions';
import { useExpressionType } from '../useExpressionType';
import { useDataStructures } from '../useDataStructures';
import { getJavaType } from "~/composables/generators/useJavaGenerator";
import { getGoType } from "~/composables/generators/useGoGenerator";

export const useGeneratorUtils = () => {
  const { structures } = useDataStructures();
  const { getBlockType } = useExpressionType();

  const indent = (code: string, spaces: number = 2) => {
    if (!code || code.trim() === '') return '';
    const spaceStr = ' '.repeat(spaces);
    return code.split('\n').map(line => line ? spaceStr + line : line).join('\n');
  };

  const hasReturnBlock = (blocks: BlockInstance[]): boolean => {
    return blocks.some(block => {
      if (block.type === 'return') return true;
      if (block.children && hasReturnBlock(block.children)) return true;
      if (block.config?.slots) {
        return Object.values(block.config.slots).some((s: any) => {
          if (!s) return false;
          return hasReturnBlock(Array.isArray(s) ? s : [s]);
        });
      }
      if (block.type === 'elseif' || block.type === 'else') {
        if (block.children && hasReturnBlock(block.children)) return true;
      }
      if (block.config?.elseifs) {
        return block.config.elseifs.some((ei: any) => ei.children && hasReturnBlock(ei.children));
      }
      if (block.config?.else?.children) {
        return hasReturnBlock(block.config.else.children);
      }
      return false;
    });
  };

  const getReassignedVars = (blocks: BlockInstance[]): Set<string> => {
    const reassigned = new Set<string>();
    const scan = (bs: BlockInstance[]) => {
      bs.forEach(block => {
        if (block.type === 'set_var' || block.type === 'assign') {
          if (block.type === 'set_var' && block.config?.slots?.variable) {
            const varBlock = block.config.slots.variable;
            if (varBlock.type === 'var' && varBlock.config?.name) {
              reassigned.add(varBlock.config.name);
            } else if (varBlock.type === 'var' && varBlock.config?.selectedVar) {
              reassigned.add(varBlock.config.selectedVar);
            }
          } else if (block.config?.name) {
            reassigned.add(block.config.name);
          }
        }
        if (block.children) scan(block.children);
        if (block.config?.slots) {
          Object.values(block.config.slots).forEach((s: any) => {
            if (s) scan(Array.isArray(s) ? s : [s]);
          });
        }
        if (block.type === 'elseif' || block.type === 'else') {
          if (block.children) scan(block.children);
        }
        if (block.config?.elseifs) {
          block.config.elseifs.forEach((ei: any) => ei.children && scan(ei.children));
        }
        if (block.config?.else?.children) {
          scan(block.config.else.children);
        }
      });
    };
    scan(blocks);
    return reassigned;
  };

  const hasBreakOrContinue = (blocks: BlockInstance[]): boolean => {
    return blocks.some(block => {
      if (block.type === 'break' || block.type === 'continue') return true;
      if (block.children && hasBreakOrContinue(block.children)) return true;
      if (block.config?.else?.children && hasBreakOrContinue(block.config.else.children)) return true;
      if (block.config?.elseifs) {
        return block.config.elseifs.some((ei: any) => ei.children && hasBreakOrContinue(ei.children));
      }
      return false;
    });
  };

  const formatLiteral = (value: any, language: string, typeHint?: string): string => {
    if (value === undefined || value === null || value === '') {
      if (typeHint === 'number') return '0';
      if (typeHint === 'string') return (language === 'python' || language === 'java') ? '""' : "''";
      if (typeHint === 'boolean') return language === 'python' ? 'False' : 'false';
      if (typeHint === 'array' || (typeof typeHint === 'object' && (typeHint as any).kind === 'array')) {
        const itemType = typeof typeHint === 'object' ? ((typeHint as any).itemType || (typeHint as any).elementType) : undefined;
        if (language === 'python') return '[]';
        if (language === 'php') return '[]';
        if (language === 'nodejs') return '[]';
        if (language === 'java') {
          return `new ArrayList<${itemType ? getJavaType(itemType) : 'Object'}>()`;
        }
        if (language === 'go') {
          const goItemType = itemType ? getGoType(itemType) : 'interface{}';
          return `[]${goItemType}{}`;
        }
      }

      if (language === 'python') return 'None';
      if (language === 'php' || language === 'nodejs' || language === 'java') return 'null';
      return 'undefined';
    }

    if (typeof value === 'boolean') {
      if (language === 'python') return value ? 'True' : 'False';
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') return String(value);

    if (typeof value === 'string' || typeHint === 'string') {
      if (language === 'python' || language === 'java' || language === 'go') {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return `'${value.replace(/'/g, "\\")}'`;
    }

    return String(value);
  };

  return {
    indent,
    hasReturnBlock,
    getReassignedVars,
    hasBreakOrContinue,
    getJavaType,
    formatLiteral,
    structures,
    getBlockType
  };
};
