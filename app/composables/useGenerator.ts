import type {BlockInstance, FunctionDefinition} from './useFunctions';
import {useExpressionType} from './useExpressionType';

export const useGenerator = () => {
  const { structures } = useDataStructures();
  const { functions } = useFunctions();
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
          // Pour set_var, la variable cible peut être dans un slot 'variable' (qui est un bloc 'var')
          // ou via block.config.name
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

    if (typeof value === 'boolean' || typeHint === 'boolean') {
      const boolVal = typeof value === 'boolean' ? value : (value === 'true' || value === true);
      if (language === 'python') return boolVal ? 'True' : 'False';
      return boolVal ? 'true' : 'false';
    }

    if (typeof value === 'number' || typeHint === 'number') {
      const numVal = Number(value);
      return isNaN(numVal) ? '0' : numVal.toString();
    }

    if (typeof value === 'string' || typeHint === 'string') {
      if (language === 'python' || language === 'java' || language === 'go') {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return `'${value.replace(/'/g, "\\")}'`;
    }

    return String(value);
  };

  const generateNodeJS = (blocks: BlockInstance[], isNested: boolean = false, reassignedVars?: Set<string>): string => {
    const reassigned = reassignedVars || getReassignedVars(blocks);
    return blocks.map(block => {
      switch (block.type) {
        case 'var':
          if (block.config.selectedVar) {
            return block.config.selectedVar;
          }
          const varName = block.config.name || 'v';
          const isReassigned = reassigned.has(varName);
          const decl = isReassigned ? 'let' : 'const';

          const type = typeof block.config.typeConfig === 'string' ? block.config.typeConfig : (block.config.typeConfig?.kind || 'any');
          const tsTypeName = getTypescriptType(block.config.typeConfig);
          if (type === 'object') {
            const structId = block.config.typeConfig?.structId;
            const struct = structures.value.find(s => s.id === structId);
            const structName = struct?.name || structId || 'Object';
            let fields = '';
            if (struct) {
              const fieldValues = struct.fields.map((f: any) => {
                const val = block.config.structValues?.[f.name];
                const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
                return `${f.name}: ${formatLiteral(val, 'nodejs', fType)}`;
              }).join(', ');
              fields = `{ ${fieldValues} }`;
            } else {
              fields = '{}';
            }
            return `${decl} ${varName}: ${tsTypeName} = new ${structName}(${fields});`;
          }
          const nodeJsVal = block.config.slots?.value ? generateNodeJS([block.config.slots.value], true, reassigned) : formatLiteral(block.config.value, 'nodejs', block.config.typeConfig || type);
          return `${decl} ${varName}: ${tsTypeName} = ${nodeJsVal};`;
        case 'set_var':
          const varSource = block.config.slots?.variable ? generateNodeJS([block.config.slots.variable], true, reassigned) : (block.config.name || 'undefined');
          const nodeJsSetVarType = block.config.slots?.variable?.config?.typeConfig;
          const nodeJsSetVarKind = typeof nodeJsSetVarType === 'string' ? nodeJsSetVarType : (nodeJsSetVarType?.kind || 'any');
          const varValue = block.config.slots?.value ? generateNodeJS([block.config.slots.value], true, reassigned) : formatLiteral(block.config.value, 'nodejs', nodeJsSetVarKind);
          return `${varSource} = ${varValue};`;
        case 'assign':
          return `${block.config.name} = ${formatLiteral(block.config.value, 'nodejs')};`;
        case 'this':
          return 'this';
        case 'object_property':
          const nodeJsSource = block.config.slots?.target ? generateNodeJS([block.config.slots.target], true, reassigned) : (block.config.slots?.source ? generateNodeJS([block.config.slots.source], true, reassigned) : 'undefined');
          let nodeJsProp = block.config.property || '';
          if (nodeJsProp.startsWith('field_')) nodeJsProp = nodeJsProp.replace('field_', '');
          if (nodeJsProp.startsWith('func_')) {
            nodeJsProp = nodeJsProp.replace('func_', '');
          }
          const nodeJsPropRes = `${nodeJsSource}.${nodeJsProp}`;
          return isNested ? nodeJsPropRes : `${nodeJsPropRes};`;
        case 'object':
          const structId = block.config.structId;
          const struct = structures.value.find(s => s.id === structId);
          const structName = struct?.name || structId || 'Object';
          let fields = '';
          if (struct) {
            const fieldValues = struct.fields.map((f: any) => {
              const val = block.config.values?.[f.name];
              const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
              return `${f.name}: ${formatLiteral(val, 'nodejs', fType)}`;
            }).join(', ');
            fields = `{ ${fieldValues} }`;
          } else {
            fields = '{}';
          }
          const res = `new ${structName}(${fields})`;
          return isNested ? res : `${res};`;
        case 'true':
          return isNested ? 'true' : 'true;';
        case 'false':
          return isNested ? 'false' : 'false;';
        case 'boolean':
          const nodeJsBool = block.config.value === true || block.config.value === 'true' ? 'true' : 'false';
          return isNested ? nodeJsBool : `${nodeJsBool};`;
        case 'string':
          const nodeJsStr = formatLiteral(block.config.value, 'nodejs', 'string');
          return isNested ? nodeJsStr : `${nodeJsStr};`;
        case 'number':
          const nodeJsNum = formatLiteral(block.config.value, 'nodejs', 'number');
          return isNested ? nodeJsNum : `${nodeJsNum};`;
        case 'ternary':
          const nodeJsCond = block.config.slots?.condition ? generateNodeJS([block.config.slots.condition], true, reassigned) : (block.config.condition || 'true');
          const nodeJsTrue = block.config.slots?.isTrue ? generateNodeJS([block.config.slots.isTrue], true, reassigned) : 'undefined';
          const nodeJsFalse = block.config.slots?.isFalse ? generateNodeJS([block.config.slots.isFalse], true, reassigned) : 'undefined';
          const nodeJsTernary = `${nodeJsCond} ? ${nodeJsTrue} : ${nodeJsFalse}`;
          return isNested ? nodeJsTernary : `${nodeJsTernary};`;
        case 'equal':
          const nodeJsLeft = block.config.slots?.left ? generateNodeJS([block.config.slots.left], true, reassigned) : 'undefined';
          const nodeJsRight = block.config.slots?.right ? generateNodeJS([block.config.slots.right], true, reassigned) : 'undefined';
          const nodeJsEqual = `${nodeJsLeft} === ${nodeJsRight}`;
          return isNested ? nodeJsEqual : `${nodeJsEqual};`;
        case 'print':
          const printVal = block.config.slots?.value ? generateNodeJS([block.config.slots.value], true, reassigned) : formatLiteral(block.config.value, 'nodejs');
          return `console.log(${printVal});`;
        case 'if':
          const nodeJsCondIf = block.config.slots?.condition ? generateNodeJS([block.config.slots.condition], true, reassigned) : (block.config.condition || 'true');
          const children = generateNodeJS(block.children, false, reassigned);
          const elseifArr = block.config.elseifs?.map((ei: any) => {
            const eiCond = ei.slots?.condition ? generateNodeJS([ei.slots.condition], true, reassigned) : (ei.condition || 'true');
            const eiChildren = generateNodeJS(ei.children || [], false, reassigned);
            return ` else if (${eiCond}) {\n${indent(eiChildren)}${eiChildren ? '\n' : ''}}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generateNodeJS(block.config.else.children || [], false, reassigned);
            return ` else {\n${indent(eChildren)}${eChildren ? '\n' : ''}}`;
          })() : '';
          return `if (${nodeJsCondIf}) {\n${indent(children)}${children ? '\n' : ''}}${elseifArr}${elsePart}`;
        case 'elseif':
          const nodeJsCondElseIf = block.config.slots?.condition ? generateNodeJS([block.config.slots.condition], true, reassigned) : (block.config.condition || 'true');
          const elseifChildren = generateNodeJS(block.children, false, reassigned);
          return `else if (${nodeJsCondElseIf}) {\n${indent(elseifChildren)}${elseifChildren ? '\n' : ''}}`;
        case 'else':
          const elseChildren = generateNodeJS(block.children, false, reassigned);
          return `else {\n${indent(elseChildren)}${elseChildren ? '\n' : ''}}`;
        case 'for':
          const forVar = block.config.loopVar || block.config.varName || 'i';
          const forInit = `let ${forVar} = ${block.config.from || 0}`;
          const forCond = `${forVar} < ${block.config.to || 10}`;
          const forInc = `${forVar}++`;
          const forChildren = generateNodeJS(block.children, false, reassigned);
          return `for (${forInit}; ${forCond}; ${forInc}) {\n${indent(forChildren)}${forChildren ? '\n' : ''}}`;
        case 'foreach':
          const foreachListExpr = block.config.slots?.list ? generateNodeJS([block.config.slots.list], true, reassigned) : (block.config.list || 'list');
          const foreachItemVar = (block.config.item || 'item');
          const foreachKeyVar = (block.config.key || '').trim();
          const foreachChildren = generateNodeJS(block.children, false, reassigned);

          if (hasBreakOrContinue(block.children)) {
            let keyInit = '';
            let keyInc = '';
            if (foreachKeyVar) {
              keyInit = `let ${foreachKeyVar} = 0;\n`;
              keyInc = `  ${foreachKeyVar}++;`;
            }
            return `${keyInit}for (const ${foreachItemVar} of ${foreachListExpr}) {\n${indent(foreachChildren)}${foreachChildren ? '\n' : ''}${keyInc ? indent(keyInc) + '\n' : ''}}`;
          }

          if (foreachKeyVar) {
            return `${foreachListExpr}.forEach((${foreachItemVar}, ${foreachKeyVar}) => {\n${indent(foreachChildren)}${foreachChildren ? '\n' : ''}});`;
          }
          return `${foreachListExpr}.forEach((${foreachItemVar}) => {\n${indent(foreachChildren)}${foreachChildren ? '\n' : ''}});`;
        case 'array':
          const arrayItems = (block.children || []).map(child => generateNodeJS([child], true, reassigned)).join(', ');
          const arrayRes = `[${arrayItems}]`;
          return isNested ? arrayRes : `${arrayRes};`;
        case 'array_push':
          const pushTarget = block.config.slots?.array ? generateNodeJS([block.config.slots.array], true, reassigned) : '[]';
          const pushValue = block.config.slots?.value ? generateNodeJS([block.config.slots.value], true, reassigned) : 'null';
          return `${pushTarget}.push(${pushValue});`;
        case 'array_remove':
          const removeTarget = block.config.slots?.array ? generateNodeJS([block.config.slots.array], true, reassigned) : '[]';
          const removeIndex = block.config.slots?.index ? generateNodeJS([block.config.slots.index], true, reassigned) : '0';
          return `${removeTarget}.splice(${removeIndex}, 1);`;
        case 'array_set_key':
          const setKeyTarget = block.config.slots?.array ? generateNodeJS([block.config.slots.array], true, reassigned) : '[]';
          const setKeyValue = block.config.slots?.value ? generateNodeJS([block.config.slots.value], true, reassigned) : 'null';
          const setKeyKey = block.config.selectedKey ? `"${block.config.selectedKey}"` : (block.config.slots?.key ? generateNodeJS([block.config.slots.key], true, reassigned) : '0');
          return `${setKeyTarget}[${setKeyKey}] = ${setKeyValue};`;
        case 'while':
          const nodeJsWhileCond = block.config.slots?.condition ? generateNodeJS([block.config.slots.condition], true, reassigned) : (block.config.condition || 'true');
          const whileChildren = generateNodeJS(block.children, false, reassigned);
          return `while (${nodeJsWhileCond}) {\n${indent(whileChildren)}${whileChildren ? '\n' : ''}}`;
        case 'parameter':
          const nodeJsParamName = block.config.selectedParam || '';
          return isNested ? nodeJsParamName : (nodeJsParamName ? `${nodeJsParamName};` : '');
        case 'func_call':
        case 'function':
          const func = functions.value.find(f => f.id === block.config.functionId || f.id === block.config.property?.replace('func_', ''));
          const funcName = func?.name || block.config.name || block.config.property?.replace('func_', '') || 'unknownFunction';

          // Extraire les paramètres de la fonction pour savoir quels arguments chercher dans les slots
          const params: any[] = [];
          if (func) {
            const findParams = (bs: any[]) => {
              bs.forEach(b => {
                if (b.type === 'parameter' && b.config?.name && !b.config?.selectedParam) {
                  params.push(b.config.name);
                }
                if (b.children) findParams(b.children);
                if (b.config?.slots) {
                  Object.values(b.config.slots).forEach((s: any) => {
                    if (s) findParams(Array.isArray(s) ? s : [s]);
                  });
                }
              });
            };
            findParams(func.blocks || []);
          }

          const nodeJsArgs = params.map(p => {
            const argBlock = block.config.slots?.[`arg_${p}`];
            return argBlock ? generateNodeJS([argBlock], true, reassigned) : 'undefined';
          }).join(', ');

          const funcCallTarget = block.config.slots?.target ? generateNodeJS([block.config.slots.target], true, reassigned) : (block.config.slots?.source ? generateNodeJS([block.config.slots.source], true, reassigned) : null);
          const call = funcCallTarget ? `${funcCallTarget}.${funcName}(${nodeJsArgs})` : `${funcName}(${nodeJsArgs})`;
          return isNested ? call : `${call};`;
        case 'return':
          const retVal = block.config.slots?.value ? generateNodeJS([block.config.slots.value], true, reassigned) : formatLiteral(block.config.value, 'nodejs');
          return `return ${retVal};`;
        case 'break':
          return 'break;';
        case 'continue':
          return 'continue;';
        default:
          if (block.type.startsWith('math-') || block.type.startsWith('compare-')) {
            const isCompare = block.type.startsWith('compare-');
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generateNodeJS([block.config.slots.left], true, reassigned) : (block.config.left || '0');
            const right = block.config.slots?.right ? generateNodeJS([block.config.slots.right], true, reassigned) : (block.config.right || '0');
            let actualOp = op;
            if (op === '!=') actualOp = '!==';
            const res = isCompare ? `${left} ${actualOp} ${right}` : `${left} ${op} ${right}`;
            const isInside = block.config.slots?.left?.type.startsWith(isCompare ? 'compare-' : 'math-') || block.config.slots?.right?.type.startsWith(isCompare ? 'compare-' : 'math-');
            return isNested && isInside ? `(${res})` : res;
          }
          return `// TODO: implement ${block.type}`;
      }
    }).filter(line => line.trim() !== '').join('\n');
  };

  const generatePython = (blocks: BlockInstance[], isNested: boolean = false): string => {
    return blocks.map(block => {
      switch (block.type) {
        case 'var':
          if (block.config.selectedVar) {
            return block.config.selectedVar;
          }
          const pyTypeConfig = block.config.typeConfig;
          const isNullable = block.config.nullable || false;
          const pyTypeName = getPythonType(pyTypeConfig, isNullable);
          if ((pyTypeName.startsWith('object') || (pyTypeConfig?.kind === 'object' && !isNullable)) && block.config.typeConfig?.kind !== 'array') {
            const structId = pyTypeConfig?.structId;
            const struct = structures.value.find(s => s.id === structId);
            const structName = struct?.name || structId || 'Object';
            let fields = '';
            if (struct) {
              fields = struct.fields.map((f: any) => {
                const val = block.config.structValues?.[f.name];
                const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
                return `${f.name}=${formatLiteral(val, 'python', fType)}`;
              }).join(', ');
            }
            return `${block.config.name || 'v'}: ${pyTypeName} = ${structName}(${fields})`;
          }
          const pythonVarVal = block.config.slots?.value ? generatePython([block.config.slots.value], true) : formatLiteral(block.config.value, 'python', pyTypeConfig || (typeof pyTypeConfig === 'string' ? pyTypeConfig : pyTypeConfig?.kind));
          return `${block.config.name || 'v'}: ${pyTypeName} = ${pythonVarVal}`;
        case 'set_var':
          const varSource = block.config.slots?.variable ? generatePython([block.config.slots.variable], true) : (block.config.name || 'None');
          const pySetVarType = block.config.slots?.variable?.config?.typeConfig;
          const pySetVarKind = typeof pySetVarType === 'string' ? pySetVarType : (pySetVarType?.kind || 'any');
          const varValue = block.config.slots?.value ? generatePython([block.config.slots.value], true) : formatLiteral(block.config.value, 'python', pySetVarKind);
          return `${varSource} = ${varValue}`;
        case 'assign':
          return `${block.config.name} = ${formatLiteral(block.config.value, 'python')}`;
        case 'this':
          return 'self';
        case 'object_property':
          const pythonSource = block.config.slots?.target ? generatePython([block.config.slots.target], true) : (block.config.slots?.source ? generatePython([block.config.slots.source], true) : 'None');
          let pythonProp = block.config.property || '';
          if (pythonProp.startsWith('field_')) pythonProp = pythonProp.replace('field_', '');
          if (pythonProp.startsWith('func_')) {
            pythonProp = pythonProp.replace('func_', '');
          }
          return `${pythonSource}.${pythonProp}`;
        case 'object':
          const structId = block.config.structId;
          const struct = structures.value.find(s => s.id === structId);
          const structName = struct?.name || structId || 'object';
          let fields = '';
          if (struct) {
            fields = struct.fields.map((f: any) => {
              const val = block.config.values?.[f.name];
              const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
              return `${f.name}=${formatLiteral(val, 'python', fType)}`;
            }).join(', ');
          }
          return `${structName}(${fields})`;
        case 'true':
          return 'True';
        case 'false':
          return 'False';
        case 'boolean':
          return block.config.value === true || block.config.value === 'true' ? 'True' : 'False';
        case 'string':
          return formatLiteral(block.config.value, 'python', 'string');
        case 'number':
          return formatLiteral(block.config.value, 'python', 'number');
        case 'ternary':
          const pyCond = block.config.slots?.condition ? generatePython([block.config.slots.condition], true) : (block.config.condition || 'True');
          const pyTrue = block.config.slots?.isTrue ? generatePython([block.config.slots.isTrue], true) : 'None';
          const pyFalse = block.config.slots?.isFalse ? generatePython([block.config.slots.isFalse], true) : 'None';
          return `${pyTrue} if ${pyCond} else ${pyFalse}`;
        case 'equal':
          const pyLeft = block.config.slots?.left ? generatePython([block.config.slots.left], true) : 'None';
          const pyRight = block.config.slots?.right ? generatePython([block.config.slots.right], true) : 'None';
          return `${pyLeft} == ${pyRight}`;
        case 'print':
          const printVal = block.config.slots?.value ? generatePython([block.config.slots.value], true) : formatLiteral(block.config.value, 'python');
          return `print(${printVal})`;
        case 'if':
          const pyCondIf = block.config.slots?.condition ? generatePython([block.config.slots.condition], true) : (block.config.condition || 'True');
          const children = generatePython(block.children);
          const elifs = block.config.elseifs?.map((ei: any) => {
            const eiCond = ei.slots?.condition ? generatePython([ei.slots.condition], true) : (ei.condition || 'True');
            const eiChildren = generatePython(ei.children || []);
            return `\nelif ${eiCond}:\n${indent(eiChildren || 'pass', 4)}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generatePython(block.config.else.children || []);
            return `\nelse:\n${indent(eChildren || 'pass', 4)}`;
          })() : '';
          return `if ${pyCondIf}:\n${indent(children || 'pass', 4)}${elifs}${elsePart}`;
        case 'elseif':
          const pyCondElseIf = block.config.slots?.condition ? generatePython([block.config.slots.condition], true) : (block.config.condition || 'True');
          const elseifChildrenPy = generatePython(block.children);
          return `elif ${pyCondElseIf}:\n${indent(elseifChildrenPy || 'pass', 4)}`;
        case 'else':
          const elseChildrenPy = generatePython(block.children);
          return `else:\n${indent(elseChildrenPy || 'pass', 4)}`;
        case 'for':
          return `for ${block.config.varName || 'i'} in range(${block.config.from || 0}, ${block.config.to || 10}):\n${indent(generatePython(block.children) || 'pass', 4)}`;
        case 'foreach':
          const pyListExpr = block.config.slots?.list ? generatePython([block.config.slots.list], true) : (block.config.list || 'list');
          const pyItem = (block.config.item || 'item');
          const pyKey = (block.config.key || '').trim();
          if (pyKey) {
            return `for ${pyKey}, ${pyItem} in enumerate(${pyListExpr}):\n${indent(generatePython(block.children) || 'pass', 4)}`;
          }
          return `for ${pyItem} in ${pyListExpr}:\n${indent(generatePython(block.children) || 'pass', 4)}`;
        case 'array':
          const pyArrayItems = (block.children || []).map(child => generatePython([child], true)).join(', ');
          return `[${pyArrayItems}]`;
        case 'array_push':
          const pyPushTarget = block.config.slots?.array ? generatePython([block.config.slots.array], true) : '[]';
          const pyPushValue = block.config.slots?.value ? generatePython([block.config.slots.value], true) : 'None';
          return `${pyPushTarget}.append(${pyPushValue})`;
        case 'array_remove':
          const pyRemoveTarget = block.config.slots?.array ? generatePython([block.config.slots.array], true) : '[]';
          const pyRemoveIndex = block.config.slots?.index ? generatePython([block.config.slots.index], true) : '0';
          return `del ${pyRemoveTarget}[${pyRemoveIndex}]`;
        case 'array_set_key':
          const pySetKeyTarget = block.config.slots?.array ? generatePython([block.config.slots.array], true) : '[]';
          const pySetKeyValue = block.config.slots?.value ? generatePython([block.config.slots.value], true) : 'None';
          const pySetKeyKey = block.config.selectedKey ? `"${block.config.selectedKey}"` : (block.config.slots?.key ? generatePython([block.config.slots.key], true) : '0');
          return `${pySetKeyTarget}[${pySetKeyKey}] = ${pySetKeyValue}`;
        case 'while':
          const pyWhileCond = block.config.slots?.condition ? generatePython([block.config.slots.condition], true) : (block.config.condition || 'True');
          return `while ${pyWhileCond}:\n${indent(generatePython(block.children) || 'pass', 4)}`;
        case 'parameter':
          return block.config.selectedParam || '';
        case 'func_call':
        case 'function':
          const func = functions.value.find(f => f.id === block.config.functionId || f.id === block.config.property?.replace('func_', ''));
          const funcName = func?.name || block.config.name || block.config.property?.replace('func_', '') || 'unknown_function';

          const params: any[] = [];
          if (func) {
            const findParams = (bs: any[]) => {
              bs.forEach(b => {
                if (b.type === 'parameter' && b.config?.name && !b.config?.selectedParam) {
                  params.push(b.config.name);
                }
                if (b.children) findParams(b.children);
                if (b.config?.slots) {
                  Object.values(b.config.slots).forEach((s: any) => {
                    if (s) findParams(Array.isArray(s) ? s : [s]);
                  });
                }
              });
            };
            findParams(func.blocks || []);
          }

          const pythonArgs = params.map(p => {
            const argBlock = block.config.slots?.[`arg_${p}`];
            return argBlock ? generatePython([argBlock], true) : 'None';
          }).join(', ');

          const funcCallTarget = block.config.slots?.target ? generatePython([block.config.slots.target], true) : (block.config.slots?.source ? generatePython([block.config.slots.source], true) : null);
          return funcCallTarget ? `${funcCallTarget}.${funcName}(${pythonArgs})` : `${funcName}(${pythonArgs})`;
        case 'return':
          const retVal = block.config.slots?.value ? generatePython([block.config.slots.value], true) : formatLiteral(block.config.value, 'python');
          return `return ${retVal}`;
        case 'break':
          return 'break';
        case 'continue':
          return 'continue';
        default:
          if (block.type.startsWith('math-') || block.type.startsWith('compare-')) {
            const isCompare = block.type.startsWith('compare-');
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generatePython([block.config.slots.left], true) : (block.config.left || '0');
            const right = block.config.slots?.right ? generatePython([block.config.slots.right], true) : (block.config.right || '0');
            const res = `${left} ${op} ${right}`;
            const isInside = block.config.slots?.left?.type.startsWith(isCompare ? 'compare-' : 'math-') || block.config.slots?.right?.type.startsWith(isCompare ? 'compare-' : 'math-');
            return isNested && isInside ? `(${res})` : res;
          }
          return `# TODO: implement ${block.type}`;
      }
    }).filter(line => line.trim() !== '').join('\n');
  };

  const getPHPType = (type: string | any, isNullable: boolean = false): string => {
    const kind = typeof type === 'string' ? type : (type?.kind || 'mixed');
    let phpType;
    switch (kind) {
      case 'string': phpType = 'string'; break;
      case 'number': phpType = 'float'; break;
      case 'boolean': phpType = 'bool'; break;
      case 'object':
        const structId = type?.structId;
        const struct = structures.value.find(s => s.id === structId);
        phpType = struct?.name || 'object';
        break;
      case 'array':
        const itemType = type?.itemType || type?.elementType;
        if (itemType) {
          phpType = `${getPHPType(itemType)}[]`;
        } else {
          phpType = 'array';
        }
        break;
      case 'void': phpType = 'void'; break;
      default: phpType = 'mixed'; break;
    }
    if (isNullable && phpType !== 'mixed' && phpType !== 'void') {
      return '?' + phpType;
    }
    return phpType;
  };

  const getJavaType = (type: string | any): string => {
    const kind = typeof type === 'string' ? type : (type?.kind || 'Object');
    switch (kind) {
      case 'string': return 'String';
      case 'number': return 'double';
      case 'boolean': return 'boolean';
      case 'object':
        const structId = type?.structId;
        const struct = structures.value.find(s => s.id === structId);
        return struct?.name || 'Object';
      case 'array':
        const itemType = type?.itemType || type?.elementType;
        if (itemType) {
          return `List<${getJavaType(itemType)}>`;
        }
        return 'List<Object>';
      case 'void': return 'void';
      default: return 'Object';
    }
  };

  const getPythonType = (type: string | any, isNullable: boolean = false): string => {
    const kind = typeof type === 'string' ? type : (type?.kind || 'Any');
    let pythonType;
    switch (kind) {
      case 'string': pythonType = 'str'; break;
      case 'number': pythonType = 'float'; break;
      case 'boolean': pythonType = 'bool'; break;
      case 'object':
        const structId = type?.structId;
        const struct = structures.value.find(s => s.id === structId);
        pythonType = struct?.name || 'object';
        break;
      case 'array':
        const itemType = type?.itemType || type?.elementType;
        if (itemType) {
          return `list[${getPythonType(itemType)}]`;
        }
        return 'list';
      case 'void': return 'None';
      default: pythonType = 'Any'; break;
    }

    if (isNullable && pythonType !== 'None' && pythonType !== 'Any') {
      return `${pythonType} | None`;
    }
    return pythonType;
  };

  const getTypescriptType = (type: string | any): string => {
    const kind = typeof type === 'string' ? type : (type?.kind || 'any');
    switch (kind) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'object':
        const structId = type?.structId;
        const struct = structures.value.find(s => s.id === structId);
        return struct?.name || 'any';
      case 'array':
        const itemType = type?.itemType || type?.elementType;
        if (itemType) {
          return `${getTypescriptType(itemType)}[]`;
        }
        return 'any[]';
      case 'void': return 'void';
      default: return 'any';
    }
  };

  const getGoType = (type: string | any): string => {
    const kind = typeof type === 'string' ? type : (type?.kind || 'any');
    switch (kind) {
      case 'string': return 'string';
      case 'number': return 'int';
      case 'boolean': return 'bool';
      case 'object':
        const structId = type?.structId;
        const struct = structures.value.find(s => s.id === structId);
        return struct?.name ? `*${struct.name}` : 'interface{}';
      case 'array':
        const itemType = type?.itemType || type?.elementType;
        if (itemType) {
          return `[]${getGoType(itemType)}`;
        }
        return '[]interface{}';
      case 'void': return '';
      default: return 'interface{}';
    }
  };

  const generateGo = (blocks: BlockInstance[], isNested: boolean = false): string => {
    return blocks.map(block => {
      switch (block.type) {
        case 'var':
          if (block.config.selectedVar) {
            return block.config.selectedVar;
          }
          const goTypeConfig = block.config.typeConfig;
          const goVarName = block.config.name || 'v';

          if (block.config.slots?.value?.type === 'ternary') {
            const ternaryBlock = { ...block.config.slots.value, metadata: { ...block.config.slots.value.metadata, isVarInit: true, varName: goVarName } };
            return generateGo([ternaryBlock], false);
          }

          const hasInitialValue = block.config.slots?.value || (block.config.value !== undefined && block.config.value !== null && block.config.value !== '');

          if (!hasInitialValue) {
            return `var ${goVarName} ${getGoType(goTypeConfig)}`;
          }

          if ((typeof goTypeConfig === 'object' ? goTypeConfig?.kind : goTypeConfig) === 'object') {
            const structId = goTypeConfig?.structId;
            const struct = structures.value.find(s => s.id === structId);
            const structName = struct?.name || structId || 'struct{}';
            let fields = '';
            if (struct) {
              fields = struct.fields.map((f: any) => {
                const val = block.config.structValues?.[f.name];
                const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
                return `${f.name}: ${formatLiteral(val, 'go', fType)}`;
              }).join(', ');
            }
            return `${goVarName} := &${structName}{${fields}}`;
          }
          const goVarVal = block.config.slots?.value ? generateGo([block.config.slots.value], true) : formatLiteral(block.config.value, 'go', goTypeConfig || (typeof goTypeConfig === 'string' ? goTypeConfig : goTypeConfig?.kind));
          return `${goVarName} := ${goVarVal}`;
        case 'set_var':
          const goSetVarType = block.config.slots?.variable?.config?.typeConfig;
          const goSetVarKind = typeof goSetVarType === 'string' ? goSetVarType : (goSetVarType?.kind || 'any');
          const varSource = block.config.slots?.variable ? generateGo([block.config.slots.variable], true) : (block.config.name || 'nil');

          if (block.config.slots?.value?.type === 'ternary') {
            const ternaryBlock = { ...block.config.slots.value, metadata: { ...block.config.slots.value.metadata, isVarAssign: true, varName: varSource } };
            return generateGo([ternaryBlock], false);
          }
          const varValue = block.config.slots?.value ? generateGo([block.config.slots.value], true) : formatLiteral(block.config.value, 'go', goSetVarKind);
          return `${varSource} = ${varValue}`;
        case 'assign':
          return `${block.config.name} = ${formatLiteral(block.config.value, 'go')}`;
        case 'this':
          return 'this';
        case 'object_property':
          const goSource = block.config.slots?.target ? generateGo([block.config.slots.target], true) : (block.config.slots?.source ? generateGo([block.config.slots.source], true) : 'nil');
          let goProp = (block.config.property || '');
          if (goProp.startsWith('field_')) goProp = goProp.replace('field_', '');
          if (goProp.startsWith('func_')) {
            goProp = goProp.replace('func_', '');
          }
          // Capitalize for Go exported fields/methods if we want to be strict, but let's keep as is for now
          const goPropRes = `${goSource}.${goProp}`;
          return isNested ? goPropRes : `${goPropRes}`;
        case 'func_call':
        case 'function':
          const func = functions.value.find(f => f.id === block.config.functionId || f.id === block.config.property?.replace('func_', ''));
          const funcName = func?.name || block.config.name || block.config.property?.replace('func_', '') || 'unknownFunction';

          const params: any[] = [];
          if (func) {
            const findParams = (bs: any[]) => {
              bs.forEach(b => {
                if (b.type === 'parameter' && b.config?.name && !b.config?.selectedParam) {
                  params.push(b.config.name);
                }
                if (b.children) findParams(b.children);
                if (b.config?.slots) {
                  Object.values(b.config.slots).forEach((s: any) => {
                    if (s) findParams(Array.isArray(s) ? s : [s]);
                  });
                }
              });
            };
            findParams(func.blocks || []);
          }

          const goArgs = params.map(p => {
            const argBlock = block.config.slots?.[`arg_${p}`];
            return argBlock ? generateGo([argBlock], true) : 'nil';
          }).join(', ');

          const goFuncCallTarget = block.config.slots?.target ? generateGo([block.config.slots.target], true) : (block.config.slots?.source ? generateGo([block.config.slots.source], true) : null);
          const goCall = goFuncCallTarget ? `${goFuncCallTarget}.${funcName}(${goArgs})` : `${funcName}(${goArgs})`;
          return isNested ? goCall : `${goCall}`;
        case 'object':
          const structId = block.config.structId;
          const struct = structures.value.find(s => s.id === structId);
          const structName = struct?.name || structId;
          let fields = '';
          if (struct) {
            fields = struct.fields.map((f: any) => {
              const val = block.config.values?.[f.name];
              const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
              return `${f.name}: ${formatLiteral(val, 'go', fType)}`;
            }).join(', ');
            const res = `&${structName}{${fields}}`;
            return isNested ? res : `${res}`;
          } else {
            const entries = Object.entries(block.config.values || {}).map(([k, v]) => `${k}: ${formatLiteral(v, 'go')}`).join(', ');
            const res = `map[string]interface{}{${entries}}`;
            return isNested ? res : `${res}`;
          }
        case 'true':
          return isNested ? 'true' : 'true';
        case 'false':
          return isNested ? 'false' : 'false';
        case 'boolean':
          const goBool = block.config.value === true || block.config.value === 'true' ? 'true' : 'false';
          return isNested ? goBool : `${goBool}`;
        case 'string':
          const goStr = formatLiteral(block.config.value, 'go', 'string');
          return isNested ? goStr : `${goStr}`;
        case 'number':
          const goNum = formatLiteral(block.config.value, 'go', 'number');
          return isNested ? goNum : `${goNum}`;
        case 'ternary':
          // Go doesn't have ternary operator
          const goCond = block.config.slots?.condition ? generateGo([block.config.slots.condition], true) : (block.config.condition || 'true');
          const goTrue = block.config.slots?.isTrue ? generateGo([block.config.slots.isTrue], true) : 'nil';
          const goFalse = block.config.slots?.isFalse ? generateGo([block.config.slots.isFalse], true) : 'nil';

          if (block.metadata?.isReturn) {
            return `if ${goCond} {\n\treturn ${goTrue}\n}\nreturn ${goFalse}`;
          }
          if (block.metadata?.isVarInit) {
            return `var ${block.metadata.varName} interface{}\nif ${goCond} {\n\t${block.metadata.varName} = ${goTrue}\n} else {\n\t${block.metadata.varName} = ${goFalse}\n}`;
          }
          if (block.metadata?.isVarAssign) {
            return `if ${goCond} {\n\t${block.metadata.varName} = ${goTrue}\n} else {\n\t${block.metadata.varName} = ${goFalse}\n}`;
          }
          return `if ${goCond} {\n\t_ = ${goTrue}\n} else {\n\t_ = ${goFalse}\n}`;
        case 'equal':
          const goLeft = block.config.slots?.left ? generateGo([block.config.slots.left], true) : 'nil';
          const goRight = block.config.slots?.right ? generateGo([block.config.slots.right], true) : 'nil';
          const goEqual = `${goLeft} == ${goRight}`;
          return isNested ? goEqual : `${goEqual}`;
        case 'print':
          const printVal = block.config.slots?.value ? generateGo([block.config.slots.value], true) : formatLiteral(block.config.value, 'go');
          return `fmt.Println(${printVal})`;
        case 'if':
          const goCondIf = block.config.slots?.condition ? generateGo([block.config.slots.condition], true) : (block.config.condition || 'true');
          const children = generateGo(block.children, false);
          const elseifArr = block.config.elseifs?.map((ei: any) => {
            const eiCond = ei.slots?.condition ? generateGo([ei.slots.condition], true) : (ei.condition || 'true');
            const eiChildren = generateGo(ei.children || [], false);
            return ` else if ${eiCond} {\n${indent(eiChildren)}${eiChildren ? '\n' : ''}}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generateGo(block.config.else.children || [], false);
            return ` else {\n${indent(eChildren)}${eChildren ? '\n' : ''}}`;
          })() : '';
          return `if ${goCondIf} {\n${indent(children)}${children ? '\n' : ''}}${elseifArr}${elsePart}`;
        case 'elseif':
          const goCondElseIf = block.config.slots?.condition ? generateGo([block.config.slots.condition], true) : (block.config.condition || 'true');
          const elseifChildrenGo = generateGo(block.children, false);
          return `else if ${goCondElseIf} {\n${indent(elseifChildrenGo)}${elseifChildrenGo ? '\n' : ''}}`;
        case 'else':
          const elseChildrenGo = generateGo(block.children, false);
          return `else {\n${indent(elseChildrenGo)}${elseChildrenGo ? '\n' : ''}}`;
        case 'for':
          const forVar = block.config.varName || 'i';
          const forInit = `${forVar} := ${block.config.from || 0}`;
          const forCond = `${forVar} < ${block.config.to || 10}`;
          const forInc = `${forVar}++`;
          const forChildren = generateGo(block.children, false);
          return `for ${forInit}; ${forCond}; ${forInc} {\n${indent(forChildren)}${forChildren ? '\n' : ''}}`;
        case 'foreach':
          const feItem = (block.config.item || block.config.itemName || 'item');
          const feIndex = (block.config.key || block.config.indexName || 'i');
          const feList = block.config.slots?.list ? generateGo([block.config.slots.list], true) : (block.config.list || '[]');
          const feChildren = generateGo(block.children, false);
          return `for ${feIndex}, ${feItem} := range ${feList} {\n${indent(feChildren)}${feChildren ? '\n' : ''}}`;
        case 'array':
          const goArrayItems = (block.children || []).map(child => generateGo([child], true)).join(', ');
          const goArrayType = block.config.typeConfig || block.config.itemType || block.config.elementType;
          const goItemType = goArrayType ? getGoType(goArrayType) : 'interface{}';
          return `[]${goItemType}{${goArrayItems}}`;
        case 'array_push':
          const goPushTarget = block.config.slots?.array ? generateGo([block.config.slots.array], true) : '[]interface{}{}';
          const goPushValue = block.config.slots?.value ? generateGo([block.config.slots.value], true) : 'nil';
          return `${goPushTarget} = append(${goPushTarget}, ${goPushValue})`;
        case 'array_remove':
          const goRemoveTarget = block.config.slots?.array ? generateGo([block.config.slots.array], true) : '[]interface{}{}';
          const goRemoveIndex = block.config.slots?.index ? generateGo([block.config.slots.index], true) : '0';
          return `${goRemoveTarget} = append(${goRemoveTarget}[:${goRemoveIndex}], ${goRemoveTarget}[${goRemoveIndex}+1:]...)`;
        case 'array_set_key':
          const goSetKeyTarget = block.config.slots?.array ? generateGo([block.config.slots.array], true) : 'nil';
          const goSetKeyValue = block.config.slots?.value ? generateGo([block.config.slots.value], true) : 'nil';
          const goSetKeyKey = block.config.selectedKey ? `"${block.config.selectedKey}"` : (block.config.slots?.key ? generateGo([block.config.slots.key], true) : '0');
          return `${goSetKeyTarget}[${goSetKeyKey}] = ${goSetKeyValue}`;
        case 'while':
          const whileCond = block.config.slots?.condition ? generateGo([block.config.slots.condition], true) : (block.config.condition || 'true');
          const whileChildren = generateGo(block.children, false);
          return `for ${whileCond} {\n${indent(whileChildren)}${whileChildren ? '\n' : ''}}`;
        case 'return':
          if (block.config.slots?.value?.type === 'ternary') {
            const ternaryBlock = { ...block.config.slots.value, metadata: { ...block.config.slots.value.metadata, isReturn: true } };
            return generateGo([ternaryBlock], false);
          }
          const retVal = block.config.slots?.value ? generateGo([block.config.slots.value], true) : (block.config.value !== undefined ? formatLiteral(block.config.value, 'go') : '');
          return `return ${retVal}`;
        case 'break':
          return 'break';
        case 'continue':
          return 'continue';
        default:
          if (block.type.startsWith('math-') || block.type.startsWith('compare-')) {
            const isCompare = block.type.startsWith('compare-');
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generateGo([block.config.slots.left], true) : (block.config.left || '0');
            const right = block.config.slots?.right ? generateGo([block.config.slots.right], true) : (block.config.right || '0');
            const res = `${left} ${op} ${right}`;
            const isInside = block.config.slots?.left?.type.startsWith(isCompare ? 'compare-' : 'math-') || block.config.slots?.right?.type.startsWith(isCompare ? 'compare-' : 'math-');
            return isNested && isInside ? `(${res})` : res;
          }
          return `// TODO: implement ${block.type}`;
      }
    }).filter(line => line.trim() !== '').reduce((acc, line) => {
      if (acc === '') return line;
      if (line.startsWith('else if') || line.startsWith('else ')) {
        return acc + ' ' + line;
      }
      return acc + '\n' + line;
    }, '');
  };

  const generatePHP = (blocks: BlockInstance[], isNested: boolean = false): string => {
    return blocks.map(block => {
      switch (block.type) {
        case 'var':
          if (block.config.selectedVar) {
            const varName = `$${block.config.selectedVar}`;
            return isNested ? varName : `${varName};`;
          }
          const phpTypeConfig = typeof block.config.typeConfig === 'string' ? block.config.typeConfig : (block.config.typeConfig?.kind || 'any');
          const phpTypeName = getPHPType(block.config.typeConfig || phpTypeConfig);
          const phpDoc = `/** @var ${phpTypeName} $${block.config.name || 'v'} */\n`;
          if (phpTypeConfig === 'object') {
            const structId = block.config.typeConfig?.structId;
            const struct = structures.value.find(s => s.id === structId);
            const structName = struct?.name || structId || 'stdClass';
            let fields = '';
            if (struct) {
              fields = struct.fields.map((f: any) => {
                const val = block.config.structValues?.[f.name];
                const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
                // En PHP 8 on peut utiliser les arguments nommés pour le constructeur
                return `${f.name}: ${formatLiteral(val, 'php', fType)}`;
              }).join(', ');
            }
            return `${phpDoc}$${block.config.name || 'v'} = new ${structName}(${fields});`;
          }
          const phpVarVal = block.config.slots?.value ? generatePHP([block.config.slots.value], true) : formatLiteral(block.config.value, 'php', block.config.typeConfig || phpTypeConfig);
          return `${phpDoc}$${block.config.name || 'v'} = ${phpVarVal};`;
        case 'set_var':
          const varSource = block.config.slots?.variable ? generatePHP([block.config.slots.variable], true) : (block.config.name ? `$${block.config.name}` : 'null');
          const phpSetVarType = block.config.slots?.variable?.config?.typeConfig;
          const phpSetVarKind = typeof phpSetVarType === 'string' ? phpSetVarType : (phpSetVarType?.kind || 'any');
          const varValue = block.config.slots?.value ? generatePHP([block.config.slots.value], true) : formatLiteral(block.config.value, 'php', phpSetVarKind);
          return `${varSource} = ${varValue};`;
        case 'assign':
          return `$${block.config.name} = ${formatLiteral(block.config.value, 'php')};`;
        case 'this':
          return isNested ? '$this' : '$this;';
        case 'object_property':
          const phpSource = block.config.slots?.target ? generatePHP([block.config.slots.target], true) : (block.config.slots?.source ? generatePHP([block.config.slots.source], true) : 'null');
          let phpProp = (block.config.property || '');
          if (phpProp.startsWith('field_')) phpProp = phpProp.replace('field_', '');
          if (phpProp.startsWith('func_')) {
            phpProp = phpProp.replace('func_', '');
          }
          const phpPropRes = (phpSource === '$this' || phpSource === '$this;') ? `$this->${phpProp}` : `${phpSource.replace(/;$/, '')}->${phpProp}`;
          return isNested ? phpPropRes : `${phpPropRes};`;
        case 'object':
          const structId = block.config.structId;
          const struct = structures.value.find(s => s.id === structId);
          const structName = struct?.name || structId;
          let fields = '';
          if (struct) {
            fields = struct.fields.map((f: any) => {
              const val = block.config.values?.[f.name];
              const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
              return `${f.name}: ${formatLiteral(val, 'php', fType)}`;
            }).join(', ');
            const res = `new ${structName}(${fields})`;
            return isNested ? res : `${res};`;
          } else {
            // Objet générique en PHP (tableau associatif casté en objet)
            const entries = Object.entries(block.config.values || {}).map(([k, v]) => `'${k}' => ${formatLiteral(v, 'php')}`).join(', ');
            const res = `(object)[${entries}]`;
            return isNested ? res : `${res};`;
          }
        case 'true':
          return isNested ? 'true' : 'true;';
        case 'false':
          return isNested ? 'false' : 'false;';
        case 'boolean':
          const phpBool = block.config.value === true || block.config.value === 'true' ? 'true' : 'false';
          return isNested ? phpBool : `${phpBool};`;
        case 'string':
          const phpStr = formatLiteral(block.config.value, 'php', 'string');
          return isNested ? phpStr : `${phpStr};`;
        case 'number':
          const phpNum = formatLiteral(block.config.value, 'php', 'number');
          return isNested ? phpNum : `${phpNum};`;
        case 'ternary':
          const phpCond = block.config.slots?.condition ? generatePHP([block.config.slots.condition], true) : (block.config.condition || 'true');
          const phpTrue = block.config.slots?.isTrue ? generatePHP([block.config.slots.isTrue], true) : 'null';
          const phpFalse = block.config.slots?.isFalse ? generatePHP([block.config.slots.isFalse], true) : 'null';
          const phpTernary = `${phpCond} ? ${phpTrue} : ${phpFalse}`;
          return isNested ? phpTernary : `${phpTernary};`;
        case 'equal':
          const phpLeft = block.config.slots?.left ? generatePHP([block.config.slots.left], true) : 'null';
          const phpRight = block.config.slots?.right ? generatePHP([block.config.slots.right], true) : 'null';
          const phpEqual = `${phpLeft} === ${phpRight}`;
          return isNested ? phpEqual : `${phpEqual};`;
        case 'print':
          const printVal = block.config.slots?.value ? generatePHP([block.config.slots.value], true) : formatLiteral(block.config.value, 'php');
          return `echo ${printVal};`;
        case 'if':
          const phpCondIf = block.config.slots?.condition ? generatePHP([block.config.slots.condition], true).replace(';', '') : (block.config.condition || 'true').replace(';', '');
          const children = generatePHP(block.children);
          const elseifArr = block.config.elseifs?.map((ei: any) => {
            const eiCond = ei.slots?.condition ? generatePHP([ei.slots.condition], true).replace(';', '') : (ei.condition || 'true').replace(';', '');
            const eiChildren = generatePHP(ei.children || []);
            return ` else if (${eiCond}) {\n${indent(eiChildren, 4)}${eiChildren ? '\n' : ''}}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generatePHP(block.config.else.children || []);
            return ` else {\n${indent(eChildren, 4)}${eChildren ? '\n' : ''}}`;
          })() : '';
          return `if (${phpCondIf}) {\n${indent(children, 4)}${children ? '\n' : ''}}${elseifArr}${elsePart}`;
        case 'elseif':
          const phpCondElseIf = block.config.slots?.condition ? generatePHP([block.config.slots.condition], true).replace(';', '') : (block.config.condition || 'true').replace(';', '');
          const elseifChildrenPhp = generatePHP(block.children);
          return `else if (${phpCondElseIf}) {\n${indent(elseifChildrenPhp, 4)}${elseifChildrenPhp ? '\n' : ''}}`;
        case 'else':
          const elseChildrenPhp = generatePHP(block.children);
          return `else {\n${indent(elseChildrenPhp, 4)}${elseChildrenPhp ? '\n' : ''}}`;
        case 'for':
          const forVar = (block.config.varName || 'i').replace(';', '');
          const forInit = `$${forVar} = ${block.config.from || 0}`;
          const forCond = `$${forVar} < ${block.config.to || 10}`;
          const forInc = `$${forVar}++`;
          const forChildren = generatePHP(block.children);
          return `for (${forInit}; ${forCond}; ${forInc}) {\n${indent(forChildren, 4)}${forChildren ? '\n' : ''}}`;
        case 'foreach':
          const foreachList = (block.config.slots?.list ? generatePHP([block.config.slots.list], true) : (block.config.list || 'list')).replace(';', '');
          const foreachItem = (block.config.item || 'item').replace(';', '');
          const foreachKey = (block.config.key || '').replace(';', '');
          const foreachChildren = generatePHP(block.children);
          if (foreachKey) {
            return `foreach (${foreachList} as $${foreachKey} => $${foreachItem}) {\n${indent(foreachChildren, 4)}${foreachChildren ? '\n' : ''}}`;
          }
          return `foreach (${foreachList} as $${foreachItem}) {\n${indent(foreachChildren, 4)}${foreachChildren ? '\n' : ''}}`;
        case 'array':
          const phpArrayItems = (block.children || []).map(child => generatePHP([child], true).replace(';', '')).join(', ');
          const phpArrayRes = `[${phpArrayItems}]`;
          return isNested ? phpArrayRes : `${phpArrayRes};`;
        case 'array_push':
          const phpPushTarget = (block.config.slots?.array ? generatePHP([block.config.slots.array], true) : '[]').replace(';', '');
          const phpPushValue = generatePHP([block.config.slots.value], true).replace(';', '');
          return `${phpPushTarget}[] = ${phpPushValue};`;
        case 'array_remove':
          const phpRemoveTarget = (block.config.slots?.array ? generatePHP([block.config.slots.array], true) : '[]').replace(';', '');
          const phpRemoveIndex = block.config.slots?.index ? generatePHP([block.config.slots.index], true).replace(';', '') : null;
          return `unset(${phpRemoveTarget}[${phpRemoveIndex}]);`;
        case 'array_set_key':
          const phpSetKeyTarget = (block.config.slots?.array ? generatePHP([block.config.slots.array], true) : '[]').replace(';', '');
          const phpSetKeyValue = generatePHP([block.config.slots.value], true).replace(';', '');
          const phpSetKeyKey = block.config.selectedKey ? `"${block.config.selectedKey}"` : (block.config.slots?.key ? generatePHP([block.config.slots.key], true).replace(';', '') : '0');
          return `${phpSetKeyTarget}[${phpSetKeyKey}] = ${phpSetKeyValue};`;
        case 'while':
          const phpWhileCond = block.config.slots?.condition ? generatePHP([block.config.slots.condition], true).replace(';', '') : (block.config.condition || 'true').replace(';', '');
          const whileChildren = generatePHP(block.children);
          return `while (${phpWhileCond}) {\n${indent(whileChildren, 4)}${whileChildren ? '\n' : ''}}`;
        case 'parameter':
          const phpParamName = block.config.selectedParam ? `$${block.config.selectedParam}` : `$${block.config.name || 'param'}`;
          return isNested ? phpParamName : `${phpParamName};`;
        case 'func_call':
        case 'function':
          const func = functions.value.find(f => f.id === block.config.functionId || f.id === block.config.property?.replace('func_', ''));
          const funcName = func?.name || block.config.name || block.config.property?.replace('func_', '') || 'unknownFunction';

          const params: any[] = [];
          if (func) {
            const findParams = (bs: any[]) => {
              bs.forEach(b => {
                if (b.type === 'parameter' && b.config?.name && !b.config?.selectedParam) {
                  params.push(b.config.name);
                }
                if (b.children) findParams(b.children);
                if (b.config?.slots) {
                  Object.values(b.config.slots).forEach((s: any) => {
                    if (s) findParams(Array.isArray(s) ? s : [s]);
                  });
                }
              });
            };
            findParams(func.blocks || []);
          }

          const phpArgs = params.map(p => {
            const argBlock = block.config.slots?.[`arg_${p}`];
            return argBlock ? generatePHP([argBlock], true) : 'null';
          }).join(', ');

          const funcCallTarget = block.config.slots?.target ? generatePHP([block.config.slots.target], true) : (block.config.slots?.source ? generatePHP([block.config.slots.source], true) : null);
          const callTarget = funcCallTarget ? funcCallTarget.replace(/;$/, '') : null;
          const call = (callTarget === '$this' || callTarget === '$this;') ? `$this->${funcName}(${phpArgs})` : (callTarget ? `${callTarget}->${funcName}(${phpArgs})` : `${funcName}(${phpArgs})`);
          return isNested ? call : `${call};`;
        case 'return':
          const retVal = block.config.slots?.value ? generatePHP([block.config.slots.value], true) : formatLiteral(block.config.value, 'php');
          return `return ${retVal};`;
        case 'break':
          return 'break;';
        case 'continue':
          return 'continue;';
        default:
          if (block.type.startsWith('math-') || block.type.startsWith('compare-')) {
            const isCompare = block.type.startsWith('compare-');
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generatePHP([block.config.slots.left], true) : (block.config.left || '0');
            const right = block.config.slots?.right ? generatePHP([block.config.slots.right], true) : (block.config.right || '0');
            let actualOp = op;
            if (op === '!=') actualOp = '!==';
            const res = `${left} ${actualOp} ${right}`;
            const isInside = block.config.slots?.left?.type.startsWith(isCompare ? 'compare-' : 'math-') || block.config.slots?.right?.type.startsWith(isCompare ? 'compare-' : 'math-');
            if (isNested) {
              return isInside ? `(${res})` : res;
            }
            return `${res};`;
          }
          return `// TODO: implement ${block.type}`;
      }
    }).filter(line => line.trim() !== '').join('\n');
  };

  const generateJava = (blocks: BlockInstance[], isNested: boolean = false): string => {
    return blocks.map(block => {
      const getJavaType = (tpe: any): string => {
        if (!tpe) return 'Object';
        const kind = typeof tpe === 'object' ? (tpe.kind || 'object') : tpe;
        if (kind === 'string') return 'String';
        if (kind === 'number') return 'double';
        if (kind === 'boolean') return 'boolean';
        if (kind === 'array') {
          const el = typeof tpe === 'object' ? tpe.elementType : 'any';
          return `List<${getJavaType(el)}>`;
        }
        if (kind === 'object') {
          const structId = typeof tpe === 'object' ? tpe.structId : (typeof tpe === 'string' && tpe !== 'object' ? tpe : '');
          const struct = structures.value.find(s => s.id === structId || s.name === structId);
          if (struct) return struct.name;
          if (structId === 'req' || structId === 'Request') return 'Request';
          if (structId === 'res' || structId === 'Response') return 'Response';
          return 'Object';
        }
        return 'Object';
      };

      switch (block.type) {
        case 'var':
          if (block.config.selectedVar) {
            return block.config.selectedVar;
          }
          const jType = getJavaType(block.config.typeConfig);
          const javaKind = typeof block.config.typeConfig === 'string' ? block.config.typeConfig : (block.config.typeConfig?.kind || 'any');
          if (javaKind === 'object') {
            const structId = block.config.typeConfig?.structId;
            const struct = structures.value.find(s => s.id === structId);
            const structName = struct?.name || structId || 'Object';
            let javaFields = '';
            if (struct) {
              javaFields = struct.fields.map((f: any) => {
                const val = block.config.structValues?.[f.name];
                const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
                return formatLiteral(val, 'java', fType);
              }).join(', ');
            }
            return `${jType} ${block.config.name || 'v'} = new ${structName}(${javaFields});`;
          }
          const val = block.config.slots?.value ? generateJava([block.config.slots.value], true) : formatLiteral(block.config.value, 'java', block.config.typeConfig || javaKind);
          return `${jType} ${block.config.name || 'v'} = ${val};`;
        case 'set_var':
          const varSource = block.config.slots?.variable ? generateJava([block.config.slots.variable], true) : (block.config.name || 'null');
          const javaSetVarType = block.config.slots?.variable?.config?.typeConfig;
          const javaSetVarKind = typeof javaSetVarType === 'string' ? javaSetVarType : (javaSetVarType?.kind || 'any');
          const varValue = block.config.slots?.value ? generateJava([block.config.slots.value], true) : formatLiteral(block.config.value, 'java', javaSetVarKind);
          return `${varSource} = ${varValue};`;
        case 'assign':
          return `${block.config.name} = ${formatLiteral(block.config.value, 'java')};`;
        case 'this':
          return 'this';
        case 'object_property':
          const javaSource = block.config.slots?.target ? generateJava([block.config.slots.target], true) : (block.config.slots?.source ? generateJava([block.config.slots.source], true) : 'undefined');
          let javaProp = block.config.property || '';
          if (javaProp.startsWith('field_')) javaProp = javaProp.replace('field_', '');
          if (javaProp.startsWith('func_')) {
            javaProp = javaProp.replace('func_', '');
          }
          const javaPropRes = `${javaSource}.${javaProp}`;
          return isNested ? javaPropRes : `${javaPropRes};`;
        case 'object':
          const structId = block.config.structId;
          const struct = structures.value.find(s => s.id === structId);
          const structName = struct?.name || structId || 'Object';
          let fields = '';
          if (struct) {
            fields = struct.fields.map((f: any) => {
              const val = block.config.values?.[f.name];
              const fType = typeof f.type === 'string' ? f.type : f.type?.kind;
              return formatLiteral(val, 'java', fType);
            }).join(', ');
          }
          const res = `new ${structName}(${fields})`;
          return isNested ? res : `${res};`;
        case 'true':
          return isNested ? 'true' : 'true;';
        case 'false':
          return isNested ? 'false' : 'false;';
        case 'boolean':
          const javaBool = block.config.value === true || block.config.value === 'true' ? 'true' : 'false';
          return isNested ? javaBool : `${javaBool};`;
        case 'string':
          const javaStr = formatLiteral(block.config.value, 'java', 'string');
          return isNested ? javaStr : `${javaStr};`;
        case 'number':
          const javaNum = formatLiteral(block.config.value, 'java', 'number');
          return isNested ? javaNum : `${javaNum};`;
        case 'ternary':
          const javaCond = block.config.slots?.condition ? generateJava([block.config.slots.condition], true) : (block.config.condition || 'true');
          const javaTrue = block.config.slots?.isTrue ? generateJava([block.config.slots.isTrue], true) : 'null';
          const javaFalse = block.config.slots?.isFalse ? generateJava([block.config.slots.isFalse], true) : 'null';
          const javaTernary = `${javaCond} ? ${javaTrue} : ${javaFalse}`;
          return isNested ? javaTernary : `${javaTernary};`;
        case 'equal':
          const javaLeft = block.config.slots?.left ? generateJava([block.config.slots.left], true) : 'null';
          const javaRight = block.config.slots?.right ? generateJava([block.config.slots.right], true) : 'null';
          const javaEqual = `${javaLeft} == ${javaRight}`;
          return isNested ? javaEqual : `${javaEqual};`;
        case 'print':
          const printVal = block.config.slots?.value ? generateJava([block.config.slots.value], true) : formatLiteral(block.config.value, 'java');
          return `System.out.println(${printVal});`;
        case 'if':
          const javaCondIf = block.config.slots?.condition ? generateJava([block.config.slots.condition], true) : (block.config.condition || 'true');
          const children = generateJava(block.children);
          const elseifArr = block.config.elseifs?.map((ei: any) => {
            const eiCond = ei.slots?.condition ? generateJava([ei.slots.condition], true) : (ei.condition || 'true');
            const eiChildren = generateJava(ei.children || []);
            return ` else if (${eiCond}) {\n${indent(eiChildren)}${eiChildren ? '\n' : ''}}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generateJava(block.config.else.children || []);
            return ` else {\n${indent(eChildren)}${eChildren ? '\n' : ''}}`;
          })() : '';
          return `if (${javaCondIf}) {\n${indent(children)}${children ? '\n' : ''}}${elseifArr}${elsePart}`;
        case 'elseif':
          const javaCondElseIf = block.config.slots?.condition ? generateJava([block.config.slots.condition], true) : (block.config.condition || 'true');
          const elseifChildrenJava = generateJava(block.children);
          return `else if (${javaCondElseIf}) {\n${indent(elseifChildrenJava)}${elseifChildrenJava ? '\n' : ''}}`;
        case 'else':
          const elseChildrenJava = generateJava(block.children);
          return `else {\n${indent(elseChildrenJava)}${elseChildrenJava ? '\n' : ''}}`;
        case 'for':
          const forInit = `int ${block.config.varName || 'i'} = ${block.config.from || 0}`;
          const forCond = `${block.config.varName || 'i'} < ${block.config.to || 10}`;
          const forInc = `${block.config.varName || 'i'}++`;
          const forChildren = generateJava(block.children);
          return `for (${forInit}; ${forCond}; ${forInc}) {\n${indent(forChildren)}${forChildren ? '\n' : ''}}`;
        case 'foreach':
          const list = block.config.slots?.list ? generateJava([block.config.slots.list], true) : (block.config.list || 'list');
          const item = block.config.item || 'item';
          const key = (block.config.key || '').trim();
          const foreachChildren = generateJava(block.children);

          let itemType = 'Object';
          if (block.config?.slots?.list) {
            const listType = getBlockType(block.config.slots.list, blocks);
            if (listType && typeof listType === 'object' && listType.kind === 'array' && listType.elementType) {
              itemType = getJavaType(listType.elementType);
            }
          }

          if (key) {
            const body = `${itemType} ${item} = ${list}.get(${key});\n${foreachChildren}`.trimEnd();
            return `for (int ${key} = 0; ${key} < ${list}.size(); ${key}++) {\n${indent(body)}${body ? '\n' : ''}}`;
          }
          return `for (${itemType} ${item} : ${list}) {\n${indent(foreachChildren)}${foreachChildren ? '\n' : ''}}`;
        case 'array':
          const javaArrayItems = (block.children || []).map(child => generateJava([child], true)).join(', ');
          const javaArrayType = block.config.typeConfig || block.config.itemType || block.config.elementType;
          const javaArrayRes = `new ArrayList<${javaArrayType ? getJavaType(javaArrayType) : 'Object'}>(Arrays.asList(${javaArrayItems}))`;
          return isNested ? javaArrayRes : `${javaArrayRes};`;
        case 'array_push':
          const javaPushTarget = block.config.slots?.array ? generateJava([block.config.slots.array], true) : 'list';
          const javaPushValue = block.config.slots?.value ? generateJava([block.config.slots.value], true) : 'null';
          return `${javaPushTarget}.add(${javaPushValue});`;
        case 'array_remove':
          const javaRemoveTarget = block.config.slots?.array ? generateJava([block.config.slots.array], true) : 'list';
          const javaRemoveIndex = block.config.slots?.index ? generateJava([block.config.slots.index], true) : '0';
          return `${javaRemoveTarget}.remove((int)${javaRemoveIndex});`;
        case 'array_set_key':
          const javaSetKeyTarget = block.config.slots?.array ? generateJava([block.config.slots.array], true) : 'list';
          const javaSetKeyValue = block.config.slots?.value ? generateJava([block.config.slots.value], true) : 'null';
          const javaSetKeyKey = block.config.selectedKey ? `"${block.config.selectedKey}"` : (block.config.slots?.key ? generateJava([block.config.slots.key], true) : '0');
          // On suppose que si c'est une clé textuelle, c'est un Map ou un objet, sinon c'est un List.set()
          if (block.config.selectedKey || (block.config.slots?.key && getBlockType(block.config.slots.key, blocks) === 'string')) {
            return `${javaSetKeyTarget}.put(${javaSetKeyKey}, ${javaSetKeyValue});`;
          }
          return `${javaSetKeyTarget}.set((int)${javaSetKeyKey}, ${javaSetKeyValue});`;
        case 'while':
          const javaWhileCond = block.config.slots?.condition ? generateJava([block.config.slots.condition], true) : (block.config.condition || 'true');
          const whileChildren = generateJava(block.children);
          return `while (${javaWhileCond}) {\n${indent(whileChildren)}${whileChildren ? '\n' : ''}}`;
        case 'parameter':
          const javaParamName = block.config.selectedParam || '';
          return isNested ? javaParamName : (javaParamName ? `${javaParamName};` : '');
        case 'func_call':
        case 'function':
          const func = functions.value.find(f => f.id === block.config.functionId || f.id === block.config.property?.replace('func_', ''));
          const funcName = func?.name || block.config.name || block.config.property?.replace('func_', '') || 'unknownFunction';

          const params: any[] = [];
          if (func) {
            const findParams = (bs: any[]) => {
              bs.forEach(b => {
                if (b.type === 'parameter' && b.config?.name && !b.config?.selectedParam) {
                  params.push(b.config.name);
                }
                if (b.children) findParams(b.children);
                if (b.config?.slots) {
                  Object.values(b.config.slots).forEach((s: any) => {
                    if (s) findParams(Array.isArray(s) ? s : [s]);
                  });
                }
              });
            };
            findParams(func.blocks || []);
          }

          const javaArgs = params.map(p => {
            const argBlock = block.config.slots?.[`arg_${p}`];
            return argBlock ? generateJava([argBlock], true) : 'null';
          }).join(', ');

          const funcCallTarget = block.config.slots?.target ? generateJava([block.config.slots.target], true) : (block.config.slots?.source ? generateJava([block.config.slots.source], true) : null);
          const call = funcCallTarget ? `${funcCallTarget}.${funcName}(${javaArgs})` : `${funcName}(${javaArgs})`;
          return isNested ? call : `${call};`;
        case 'return':
          const retVal = block.config.slots?.value ? generateJava([block.config.slots.value], true) : formatLiteral(block.config.value, 'java');
          return `return ${retVal};`;
        case 'break':
          return 'break;';
        case 'continue':
          return 'continue;';
        default:
          if (block.type.startsWith('math-') || block.type.startsWith('compare-')) {
            const isCompare = block.type.startsWith('compare-');
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generateJava([block.config.slots.left], true) : (block.config.left || '0');
            const right = block.config.slots?.right ? generateJava([block.config.slots.right], true) : (block.config.right || '0');
            const res = `${left} ${op} ${right}`;
            const isInside = block.config.slots?.left?.type.startsWith(isCompare ? 'compare-' : 'math-') || block.config.slots?.right?.type.startsWith(isCompare ? 'compare-' : 'math-');
            return isNested && isInside ? `(${res})` : res;
          }
          return `// TODO: implement ${block.type}`;
      }
    }).filter(line => line.trim() !== '').join('\n');
  };

  const generateCode = (language: string): string => {
    let code = '';

    // Group functions by structure
    const globalFunctions = functions.value.filter(f => !f.metadata?.structureId);
    const structureFunctions: Record<string, FunctionDefinition[]> = {};

    functions.value.forEach(f => {
      if (f.metadata?.structureId) {
        if (!structureFunctions[f.metadata.structureId]) {
          structureFunctions[f.metadata.structureId] = [];
        }
        structureFunctions[f.metadata.structureId]?.push(f);
      }
    });

    // Generate Structures / Classes
    structures.value.forEach(struct => {
      // Skip default Request/Response structures if they have no fields and no associated functions
      const associatedFuncs = structureFunctions[struct.id] || [];
      if ((struct.id === 'req' || struct.id === 'res') && struct.fields.length === 0 && associatedFuncs.length === 0) {
        return;
      }

      if (language === 'nodejs') {
        code += `class ${struct.name} {\n`;
        struct.fields.forEach(field => {
          const tsType = getTypescriptType(field.type);
          const defaultValue = formatLiteral(field.defaultValue, 'nodejs');
          const assignDefault = !(!field.nullable && (field.defaultValue === null || field.defaultValue === undefined || field.defaultValue === ''));
          code += `  public ${field.name}${field.nullable ? '?' : ''}: ${tsType}${assignDefault ? ` = ${defaultValue}` : ''};\n\n`;
        });
        code += `  constructor(props = {}) {\n`;
        struct.fields.forEach(field => {
          code += `    this.${field.name} = props.${field.name} !== undefined ? props.${field.name} : this.${field.name};\n`;
        });
        code += `  }\n`;

        if (associatedFuncs.length > 0) {
          code += '\n';
          code += associatedFuncs.map(func => {
            const tsParams = func.blocks
                .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
                .map(b => `${b.config.name}${b.config.nullable ? '?' : ''}: ${getTypescriptType(b.config.type || 'any')}`)
                .join(', ');
            const hasReturn = hasReturnBlock(func.blocks);
            const tsRetType = getTypescriptType(hasReturn ? (func.metadata?.returnType || 'any') : 'void');
            const tsBody = generateNodeJS(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
            let methodCode = `  ${func.name}(${tsParams}): ${tsRetType} {\n`;
            methodCode += indent(indent(tsBody));
            methodCode += `${tsBody ? '\n' : ''}  }`;
            return methodCode;
          }).join('\n\n') + '\n';
        }
        code += `}\n\n`;
      } else if (language === 'python') {
        code += `class ${struct.name}:\n`;
        struct.fields.forEach(field => {
          const pyType = getPythonType(field.type, field.nullable);
          const defaultValue = formatLiteral(field.defaultValue, 'python');
          const assignDefault = !(!field.nullable && (field.defaultValue === null || field.defaultValue === undefined || field.defaultValue === ''));
          code += `    ${field.name}: ${pyType}${assignDefault ? ` = ${defaultValue}` : ''}\n\n`;
        });
        const params = struct.fields.map(field => {
          const pyType = getPythonType(field.type, field.nullable);
          return `${field.name}: ${pyType}${field.nullable ? ' = None' : ''}`;
        }).join(', ');
        code += `    def __init__(self, ${params}):\n`;
        struct.fields.forEach(field => {
          if (field.nullable) {
            code += `        if ${field.name} is not None: self.${field.name} = ${field.name}\n`;
          } else {
            code += `        self.${field.name} = ${field.name}\n`;
          }
        });
        if (struct.fields.length === 0) code += `        pass\n`;

        if (associatedFuncs.length > 0) {
          code += '\n';
          code += associatedFuncs.map(func => {
            const pyParams = func.blocks
                .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
                .map(b => `${b.config.name}: ${getPythonType(b.config.type || 'any', b.config.nullable)}${b.config.nullable ? ' = None' : ''}`)
                .join(', ');
            const hasReturn = hasReturnBlock(func.blocks);
            const pyRetType = getPythonType(hasReturn ? (func.metadata?.returnType || 'any') : 'void');
            const pyBody = generatePython(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
            let methodCode = `    def ${func.name}(self${pyParams ? ', ' + pyParams : ''}) -> ${pyRetType}:\n`;
            methodCode += indent(indent(pyBody || 'pass', 4), 4);
            return methodCode;
          }).join('\n\n') + '\n';
        }
        code += `\n`;
      } else if (language === 'php') {
        code += `class ${struct.name} {\n`;
        struct.fields.forEach(field => {
          const phpType = getPHPType(field.type, field.defaultValue === null);
          const defaultValue = formatLiteral(field.defaultValue, 'php');
          code += `    public ${phpType} $${field.name} = ${defaultValue};\n\n`;
        });
        const params = struct.fields.map(field => {
          const phpType = getPHPType(field.type, field.nullable || true);
          return `${phpType} $${field.name} = null`;
        }).join(', ');
        code += `    public function __construct(${params}) {\n`;
        struct.fields.forEach(field => {
          code += `        if ($${field.name} !== null) $this->${field.name} = $${field.name};\n`;
        });
        if (struct.fields.length === 0) code += `        // No fields\n`;
        code += `    }\n`;

        if (associatedFuncs.length > 0) {
          code += '\n';
          code += associatedFuncs.map(func => {
            const phpParams = func.blocks
                .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
                .map(b => `${getPHPType(b.config.type || 'mixed', b.config.nullable)} $${b.config.name}`)
                .join(', ');
            const hasReturn = hasReturnBlock(func.blocks);
            const phpRetType = getPHPType(hasReturn ? (func.metadata?.returnType || 'mixed') : 'void');
            const phpBody = generatePHP(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
            let methodCode = `    public function ${func.name}(${phpParams}): ${phpRetType} {\n`;
            methodCode += indent(phpBody, 8);
            methodCode += `${phpBody ? '\n' : ''}    }`;
            return methodCode;
          }).join('\n\n') + '\n';
        }
        code += `}\n\n`;
      } else if (language === 'java') {
        code += `class ${struct.name} {\n`;
        struct.fields.forEach(field => {
          const javaType = getJavaType(field.type);
          const defaultValue = formatLiteral(field.defaultValue, 'java');
          code += `    public ${javaType} ${field.name} = ${defaultValue};\n\n`;
        });
        const params = struct.fields.map(field => {
          const javaType = getJavaType(field.type);
          return `${javaType} ${field.name}`;
        }).join(', ');
        code += `    public ${struct.name}(${params}) {\n`;
        struct.fields.forEach(field => {
          code += `        this.${field.name} = ${field.name};\n`;
        });
        if (struct.fields.length === 0) code += `        // No fields\n`;
        code += `    }\n`;

        if (associatedFuncs.length > 0) {
          code += '\n';
          code += associatedFuncs.map(func => {
            const javaParams = func.blocks
                .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
                .map(b => `${getJavaType(b.config.type || 'Object')} ${b.config.name}`)
                .join(', ');
            const hasReturn = hasReturnBlock(func.blocks);
            const javaRetType = getJavaType(hasReturn ? (func.metadata?.returnType || 'Object') : 'void');
            const javaBody = generateJava(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
            let methodCode = `    public ${javaRetType} ${func.name}(${javaParams}) {\n`;
            methodCode += indent(javaBody, 8);
            methodCode += `${javaBody ? '\n' : ''}    }`;
            return methodCode;
          }).join('\n\n') + '\n';
        }
        code += `}\n\n`;
      } else if (language === 'go') {
        code += `type ${struct.name} struct {\n`;
        struct.fields.forEach(field => {
          const goType = getGoType(field.type);
          code += `\t${field.name} ${goType}\n`;
        });
        code += `}\n\n`;

        if (associatedFuncs.length > 0) {
          code += associatedFuncs.map(func => {
            const goParams = func.blocks
                .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
                .map(b => `${b.config.name} ${getGoType(b.config.type || 'interface{}')}`)
                .join(', ');
            const hasReturn = hasReturnBlock(func.blocks);
            const goRetType = getGoType(hasReturn ? (func.metadata?.returnType || 'interface{}') : 'void');
            const goBody = generateGo(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
            let methodCode = `func (this *${struct.name}) ${func.name}(${goParams})${goRetType ? ' ' + goRetType : ''} {\n`;
            methodCode += indent(goBody, 4);
            methodCode += `${goBody ? '\n' : ''}}`;
            return methodCode;
          }).join('\n\n') + '\n\n';
        }
      }
    });

    // Generate Global Functions
    let globalCode = '';
    let hasPythonMain = false;
    let hasPHPMain = false;
    let hasTSMain = false;
    if (language === 'java') {
      globalFunctions.forEach((func, index) => {
        const javaParams = func.blocks
            .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
            .map(b => `${getJavaType(b.config.type || 'Object')} ${b.config.name}`)
            .join(', ');
        const hasReturn = hasReturnBlock(func.blocks);
        const javaRetType = getJavaType(hasReturn ? (func.metadata?.returnType || 'Object') : 'void');
        const javaBody = generateJava(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
        globalCode += `public static ${javaRetType} ${func.name}(${javaParams}) {\n`;
        globalCode += indent(javaBody);
        globalCode += `${javaBody ? '\n' : ''}}`;
        if (index < globalFunctions.length - 1) {
          globalCode += '\n\n';
        }
      });
    } else {
      globalFunctions.forEach(func => {
        if (language === 'nodejs') {
          if (func.name === 'main') {
            hasTSMain = true;
          }
          const tsParams = func.blocks
              .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
              .map(b => `${b.config.name}${b.config.nullable ? '?' : ''}: ${getTypescriptType(b.config.type || 'any')}`)
              .join(', ');
          const hasReturn = hasReturnBlock(func.blocks);
          const tsRetType = getTypescriptType(hasReturn ? (func.metadata?.returnType || 'any') : 'void');
          const tsBody = generateNodeJS(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
          globalCode += `function ${func.name}(${tsParams}): ${tsRetType} {\n`;
          globalCode += indent(tsBody);
          globalCode += `${tsBody ? '\n' : ''}}\n\n`;
        } else if (language === 'python') {
          if (func.name === 'main') {
            hasPythonMain = true;
          }
          const pyParams = func.blocks
              .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
              .map(b => `${b.config.name}: ${getPythonType(b.config.type || 'any', b.config.nullable)}${b.config.nullable ? ' = None' : ''}`)
              .join(', ');
          const hasReturn = hasReturnBlock(func.blocks);
          const pyRetType = getPythonType(hasReturn ? (func.metadata?.returnType || 'any') : 'void');
          const pyBody = generatePython(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
          globalCode += `def ${func.name}(${pyParams}) -> ${pyRetType}:\n`;
          globalCode += indent(pyBody || 'pass', 4);
          globalCode += `\n\n`;
        } else if (language === 'php') {
          if (func.name === 'main') {
            hasPHPMain = true;
          }
          const phpParams = func.blocks
              .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
              .map(b => `${getPHPType(b.config.type || 'mixed', b.config.nullable)} $${b.config.name}`)
              .join(', ');
          const hasReturn = hasReturnBlock(func.blocks);
          const phpRetType = getPHPType(hasReturn ? (func.metadata?.returnType || 'mixed') : 'void');
          const phpBody = generatePHP(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
          globalCode += `function ${func.name}(${phpParams}): ${phpRetType} {\n`;
          globalCode += indent(phpBody, 4);
          globalCode += `${phpBody ? '\n' : ''}}\n\n`;
        } else if (language === 'go') {
          const goParams = func.blocks
              .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam)
              .map(b => `${b.config.name} ${getGoType(b.config.type || 'interface{}')}`)
              .join(', ');
          const hasReturn = hasReturnBlock(func.blocks);
          const goRetType = getGoType(hasReturn ? (func.metadata?.returnType || 'interface{}') : 'void');
          const goBody = generateGo(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
          globalCode += `func ${func.name}(${goParams})${goRetType ? ' ' + goRetType : ''} {\n`;
          globalCode += indent(goBody);
          globalCode += `${goBody ? '\n' : ''}}\n\n`;
        }
      });
    }

    if (language === 'go' && (code || globalCode)) {
      let header = 'package main\n\nimport "fmt"\n\n';
      code = header + code + globalCode;
    } else if (language === 'java') {
      if (globalCode || code) {
        let finalCode = '';
        if (code) {
          finalCode += code + '\n';
        }
        finalCode += `public class Main {\n${indent(globalCode)}\n}\n`;
        code = finalCode;
      }
    } else if (language === 'php' && (code || globalCode)) {
      code = '<?php\n\n' + code + globalCode;
      if (hasPHPMain) {
        code += 'main();\n';
      }
    } else if (language === 'python') {
      code += globalCode;
      if (hasPythonMain) {
        code += 'if __name__ == "__main__":\n    main()\n';
      }
    } else {
      code += globalCode;
      if (language === 'nodejs' && hasTSMain) {
        code += 'main();\n';
      }
    }

    return code || '';
  };

  return {
    generateCode
  };
};
