import type {BlockInstance, FunctionDefinition} from './useFunctions';

export const useGenerator = () => {
  const { structures } = useDataStructures();
  const { functions } = useFunctions();

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

  const formatLiteral = (value: any, language: string, typeHint?: string): string => {
    if (value === undefined || value === null || value === '') {
      if (typeHint === 'number') return '0';
      if (typeHint === 'string') return language === 'python' ? '""' : "''";
      if (typeHint === 'boolean') return 'false';
      
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
            return `${decl} ${varName} = new ${structName}(${fields});`;
          }
          const val = block.config.slots?.value ? generateNodeJS([block.config.slots.value], true, reassigned) : formatLiteral(block.config.value, 'nodejs', type);
          return `${decl} ${varName} = ${val};`;
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
          const condition = block.config.condition || 'true';
          const children = generateNodeJS(block.children, false, reassigned);
          const elseifArr = block.config.elseifs?.map((ei: any) => {
            const eiChildren = generateNodeJS(ei.children || [], false, reassigned);
            return ` else if (${ei.condition}) {\n${indent(eiChildren)}${eiChildren ? '\n' : ''}}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generateNodeJS(block.config.else.children || [], false, reassigned);
            return ` else {\n${indent(eChildren)}${eChildren ? '\n' : ''}}`;
          })() : '';
          return `if (${condition}) {\n${indent(children)}${children ? '\n' : ''}}${elseifArr}${elsePart}`;
        case 'for':
          const forVar = block.config.varName || 'i';
          const forDecl = reassigned.has(forVar) ? 'let' : 'const';
          const forInit = `${forDecl} ${forVar} = ${block.config.from || 0}`;
          const forCond = `${forVar} < ${block.config.to || 10}`;
          const forInc = `${forVar}++`;
          const forChildren = generateNodeJS(block.children, false, reassigned);
          return `for (${forInit}; ${forCond}; ${forInc}) {\n${indent(forChildren)}${forChildren ? '\n' : ''}}`;
        case 'foreach':
          const foreachChildren = generateNodeJS(block.children, false, reassigned);
          return `${block.config.list || 'list'}.forEach(${block.config.item || 'item'} => {\n${indent(foreachChildren)}${foreachChildren ? '\n' : ''}});`;
        case 'while':
          const whileChildren = generateNodeJS(block.children, false, reassigned);
          return `while (${block.config.condition || 'true'}) {\n${indent(whileChildren)}${whileChildren ? '\n' : ''}}`;
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
          if (block.type.startsWith('math-')) {
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generateNodeJS([block.config.slots.left], true, reassigned) : (block.config.left || '0');
            const right = block.config.slots?.right ? generateNodeJS([block.config.slots.right], true, reassigned) : (block.config.right || '0');
            const res = `${left} ${op} ${right}`;
            const isInsideMath = block.config.slots?.left?.type.startsWith('math-') || block.config.slots?.right?.type.startsWith('math-');
            return isNested && isInsideMath ? `(${res})` : res;
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
          if (pyTypeName.startsWith('object') || (pyTypeConfig?.kind === 'object' && !isNullable)) {
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
          const pythonVarVal = block.config.slots?.value ? generatePython([block.config.slots.value], true) : formatLiteral(block.config.value, 'python', typeof pyTypeConfig === 'string' ? pyTypeConfig : pyTypeConfig?.kind);
          const assignDefault = !(!isNullable && (block.config.value === null || block.config.value === undefined || block.config.value === ''));
          return `${block.config.name || 'v'}: ${pyTypeName}${assignDefault ? ` = ${pythonVarVal}` : ''}`;
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
          const children = generatePython(block.children);
          const elifs = block.config.elseifs?.map((ei: any) => {
            const eiChildren = generatePython(ei.children || []);
            return `\nelif ${ei.condition}:\n${indent(eiChildren || 'pass', 4)}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generatePython(block.config.else.children || []);
            return `\nelse:\n${indent(eChildren || 'pass', 4)}`;
          })() : '';
          return `if ${block.config.condition || 'True'}:\n${indent(children || 'pass', 4)}${elifs}${elsePart}`;
        case 'for':
          return `for ${block.config.varName || 'i'} in range(${block.config.from || 0}, ${block.config.to || 10}):\n${indent(generatePython(block.children) || 'pass', 4)}`;
        case 'foreach':
          return `for ${block.config.item || 'item'} in ${block.config.list || 'list'}:\n${indent(generatePython(block.children) || 'pass', 4)}`;
        case 'while':
          return `while ${block.config.condition || 'True'}:\n${indent(generatePython(block.children) || 'pass', 4)}`;
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
          if (block.type.startsWith('math-')) {
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generatePython([block.config.slots.left], true) : (block.config.left || '0');
            const right = block.config.slots?.right ? generatePython([block.config.slots.right], true) : (block.config.right || '0');
            const res = `${left} ${op} ${right}`;
            const isInsideMath = block.config.slots?.left?.type.startsWith('math-') || block.config.slots?.right?.type.startsWith('math-');
            return isNested && isInsideMath ? `(${res})` : res;
          }
          return `# TODO: implement ${block.type}`;
      }
    }).filter(line => line.trim() !== '').join('\n');
  };

  const getPHPType = (type: string | any, isNullable: boolean = false): string => {
    const kind = typeof type === 'string' ? type : (type?.kind || 'mixed');
    let phpType = 'mixed';
    switch (kind) {
      case 'string': phpType = 'string'; break;
      case 'number': phpType = 'float'; break;
      case 'boolean': phpType = 'bool'; break;
      case 'object':
        const structId = type?.structId;
        const struct = structures.value.find(s => s.id === structId);
        phpType = struct?.name || 'object';
        break;
      case 'array': phpType = 'array'; break;
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
      case 'array': return 'List<Object>';
      case 'void': return 'void';
      default: return 'Object';
    }
  };

  const getPythonType = (type: string | any, isNullable: boolean = false): string => {
    const kind = typeof type === 'string' ? type : (type?.kind || 'Any');
    let pythonType = 'Any';
    switch (kind) {
      case 'string': pythonType = 'str'; break;
      case 'number': pythonType = 'float'; break;
      case 'boolean': pythonType = 'bool'; break;
      case 'object':
        const structId = type?.structId;
        const struct = structures.value.find(s => s.id === structId);
        pythonType = struct?.name || 'object';
        break;
      case 'array': pythonType = 'list'; break;
      case 'void': pythonType = 'None'; break;
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
      case 'array': return 'any[]';
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
      case 'array': return '[]interface{}';
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
          const goTypeConfig = typeof block.config.typeConfig === 'string' ? block.config.typeConfig : (block.config.typeConfig?.kind || 'any');
          const goVarName = block.config.name || 'v';
          
          if (block.config.slots?.value?.type === 'ternary') {
            const ternaryBlock = { ...block.config.slots.value, metadata: { ...block.config.slots.value.metadata, isVarInit: true, varName: goVarName } };
            return generateGo([ternaryBlock], false);
          }
          if (goTypeConfig === 'object') {
            const structId = block.config.typeConfig?.structId;
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
          const goVarVal = block.config.slots?.value ? generateGo([block.config.slots.value], true) : formatLiteral(block.config.value, 'go', goTypeConfig);
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
          const condition = (block.config.condition || 'true');
          const children = generateGo(block.children, false);
          const elseifArr = block.config.elseifs?.map((ei: any) => {
            const eiChildren = generateGo(ei.children || [], false);
            return ` else if ${ei.condition} {\n${indent(eiChildren)}${eiChildren ? '\n' : ''}}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generateGo(block.config.else.children || [], false);
            return ` else {\n${indent(eChildren)}${eChildren ? '\n' : ''}}`;
          })() : '';
          return `if ${condition} {\n${indent(children)}${children ? '\n' : ''}}${elseifArr}${elsePart}`;
        case 'for':
          const forVar = block.config.varName || 'i';
          const forInit = `${forVar} := ${block.config.from || 0}`;
          const forCond = `${forVar} < ${block.config.to || 10}`;
          const forInc = `${forVar}++`;
          const forChildren = generateGo(block.children, false);
          return `for ${forInit}; ${forCond}; ${forInc} {\n${indent(forChildren)}${forChildren ? '\n' : ''}}`;
        case 'foreach':
          const feItem = block.config.itemName || 'item';
          const feIndex = block.config.indexName || 'i';
          const feList = block.config.slots?.list ? generateGo([block.config.slots.list], true) : (block.config.list || '[]');
          const feChildren = generateGo(block.children, false);
          return `for ${feIndex}, ${feItem} := range ${feList} {\n${indent(feChildren)}${feChildren ? '\n' : ''}}`;
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
          if (block.type.startsWith('math-')) {
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generateGo([block.config.slots.left], true) : (block.config.left || '0');
            const right = block.config.slots?.right ? generateGo([block.config.slots.right], true) : (block.config.right || '0');
            const res = `${left} ${op} ${right}`;
            const isInsideMath = block.config.slots?.left?.type.startsWith('math-') || block.config.slots?.right?.type.startsWith('math-');
            return isNested && isInsideMath ? `(${res})` : res;
          }
          return `// TODO: implement ${block.type}`;
      }
    }).filter(line => line.trim() !== '').join('\n');
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
          const phpVarVal = block.config.slots?.value ? generatePHP([block.config.slots.value], true) : formatLiteral(block.config.value, 'php', phpTypeConfig);
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
          const condition = (block.config.condition || 'true').replace(';', '');
          const children = generatePHP(block.children);
          const elseifArr = block.config.elseifs?.map((ei: any) => {
            const eiCondition = (ei.condition || 'true').replace(';', '');
            const eiChildren = generatePHP(ei.children || []);
            return ` else if (${eiCondition}) {\n${indent(eiChildren, 4)}${eiChildren ? '\n' : ''}}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generatePHP(block.config.else.children || []);
            return ` else {\n${indent(eChildren, 4)}${eChildren ? '\n' : ''}}`;
          })() : '';
          return `if (${condition}) {\n${indent(children, 4)}${children ? '\n' : ''}}${elseifArr}${elsePart}`;
        case 'for':
          const forVar = (block.config.varName || 'i').replace(';', '');
          const forInit = `$${forVar} = ${block.config.from || 0}`;
          const forCond = `$${forVar} < ${block.config.to || 10}`;
          const forInc = `$${forVar}++`;
          const forChildren = generatePHP(block.children);
          return `for (${forInit}; ${forCond}; ${forInc}) {\n${indent(forChildren, 4)}${forChildren ? '\n' : ''}}`;
        case 'foreach':
          const foreachList = (block.config.list || 'list').replace(';', '');
          const foreachItem = (block.config.item || 'item').replace(';', '');
          const foreachChildren = generatePHP(block.children);
          return `foreach (${foreachList} as $${foreachItem}) {\n${indent(foreachChildren, 4)}${foreachChildren ? '\n' : ''}}`;
        case 'while':
          const whileCond = (block.config.condition || 'true').replace(';', '');
          const whileChildren = generatePHP(block.children);
          return `while (${whileCond}) {\n${indent(whileChildren, 4)}${whileChildren ? '\n' : ''}}`;
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
          if (block.type.startsWith('math-')) {
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generatePHP([block.config.slots.left], true) : (block.config.left || '0');
            const right = block.config.slots?.right ? generatePHP([block.config.slots.right], true) : (block.config.right || '0');
            const res = `${left} ${op} ${right}`;
            const isInsideMath = block.config.slots?.left?.type.startsWith('math-') || block.config.slots?.right?.type.startsWith('math-');
            if (isNested) {
              return isInsideMath ? `(${res})` : res;
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
          const val = block.config.slots?.value ? generateJava([block.config.slots.value], true) : formatLiteral(block.config.value, 'java', javaKind);
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
          const condition = block.config.condition || 'true';
          const children = generateJava(block.children);
          const elseifArr = block.config.elseifs?.map((ei: any) => {
            const eiChildren = generateJava(ei.children || []);
            return ` else if (${ei.condition}) {\n${indent(eiChildren)}${eiChildren ? '\n' : ''}}`;
          }).join('') || '';
          const elsePart = block.config.else ? (() => {
            const eChildren = generateJava(block.config.else.children || []);
            return ` else {\n${indent(eChildren)}${eChildren ? '\n' : ''}}`;
          })() : '';
          return `if (${condition}) {\n${indent(children)}${children ? '\n' : ''}}${elseifArr}${elsePart}`;
        case 'for':
          const forInit = `int ${block.config.varName || 'i'} = ${block.config.from || 0}`;
          const forCond = `${block.config.varName || 'i'} < ${block.config.to || 10}`;
          const forInc = `${block.config.varName || 'i'}++`;
          const forChildren = generateJava(block.children);
          return `for (${forInit}; ${forCond}; ${forInc}) {\n${indent(forChildren)}${forChildren ? '\n' : ''}}`;
        case 'foreach':
          const list = block.config.list || 'list';
          const item = block.config.item || 'item';
          const foreachChildren = generateJava(block.children);
          return `for (Object ${item} : ${list}) {\n${indent(foreachChildren)}${foreachChildren ? '\n' : ''}}`;
        case 'while':
          const whileChildren = generateJava(block.children);
          return `while (${block.config.condition || 'true'}) {\n${indent(whileChildren)}${whileChildren ? '\n' : ''}}`;
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
          if (block.type.startsWith('math-')) {
            const op = block.type.split('-')[1];
            const left = block.config.slots?.left ? generateJava([block.config.slots.left], true) : (block.config.left || '0');
            const right = block.config.slots?.right ? generateJava([block.config.slots.right], true) : (block.config.right || '0');
            const res = `${left} ${op} ${right}`;
            const isInsideMath = block.config.slots?.left?.type.startsWith('math-') || block.config.slots?.right?.type.startsWith('math-');
            return isNested && isInsideMath ? `(${res})` : res;
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
      const associatedFuncs = structureFunctions[struct.id] || [];

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
          globalCode += indent(goBody, 4);
          globalCode += `${goBody ? '\n' : ''}}\n\n`;
        }
      });
    }

    if (language === 'go' && (code || globalCode)) {
      let header = 'package main\n\nimport "fmt"\n\n';
      code = header + code + globalCode;
    } else if (language === 'java') {
      if (globalCode) {
        code += `public class Main {\n${indent(globalCode)}\n}\n\n`;
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

    return code || '// No code generated';
  };

  return {
    generateCode
  };
};
