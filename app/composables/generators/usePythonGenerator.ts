import type { BlockInstance } from '../useFunctions';
import { useGeneratorUtils } from './useGeneratorUtils';
import { useFunctions } from '../useFunctions';

export const usePythonGenerator = () => {
  const { 
    indent,
    formatLiteral, 
    structures 
  } = useGeneratorUtils();
  const { functions } = useFunctions();

  const getPythonType = (type: any, isNullable: boolean = false): string => {
    let pyType = 'Any';
    if (typeof type === 'string') {
      if (type === 'string') pyType = 'str';
      else if (type === 'number') pyType = 'int';
      else if (type === 'boolean') pyType = 'bool';
      else if (type === 'array') pyType = 'List';
    } else if (type && typeof type === 'object') {
      if (type.kind === 'array') pyType = `List[${getPythonType(type.itemType || type.elementType || 'Any')}]`;
      else if (type.kind === 'object') {
        const struct = structures.value.find(s => s.id === type.structId);
        pyType = struct ? struct.name : 'Any';
      }
    }
    return isNullable ? `Optional[${pyType}]` : pyType;
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
        case 'new_route':
          const pyPath = block.config.path || '/';
          const pyHandler = block.config.slots?.value ? generatePython([block.config.slots.value], true) : 'lambda: None';
          return `@app.route("${pyPath}")\ndef route_${Math.random().toString(36).substring(7)}():\n    return ${pyHandler}()`;
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

  return {
    generatePython,
    getPythonType
  };
};
