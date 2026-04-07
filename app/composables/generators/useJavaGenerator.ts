import type { BlockInstance } from '../useFunctions';
import { useGeneratorUtils } from './useGeneratorUtils';
import { useFunctions } from '../useFunctions';
import { useDataStructures } from "~/composables/useDataStructures";

export const getJavaType = (type: any): string => {
  const { structures } = useDataStructures();

  if (typeof type === 'string') {
    if (type === 'string') return 'String';
    if (type === 'number') return 'int';
    if (type === 'boolean') return 'boolean';
    if (type === 'array') return 'ArrayList<Object>';
  } else if (type && typeof type === 'object') {
    if (type.kind === 'array') return `ArrayList<${getJavaType(type.itemType || type.elementType || 'Object')}>`;
    if (type.kind === 'object') {
      const struct = structures.value.find(s => s.id === type.structId);
      return struct ? struct.name : 'Object';
    }
  }
  return 'Object';
};

export const useJavaGenerator = () => {
  const { 
    indent,
    formatLiteral, 
    structures,
    getBlockType
  } = useGeneratorUtils();
  const { functions } = useFunctions();

  const generateJava = (blocks: BlockInstance[], isNested: boolean = false): string => {
    return blocks.map(block => {
      // Local getJavaType helper for specific needs if different from utils
      // But looking at the code, it's very similar to utils' getJavaType
      const localGetJavaType = (tpe: any): string => {
        if (!tpe) return 'Object';
        const kind = typeof tpe === 'object' ? (tpe.kind || 'object') : tpe;
        if (kind === 'string') return 'String';
        if (kind === 'number') return 'double';
        if (kind === 'boolean') return 'boolean';
        if (kind === 'array') {
          const el = typeof tpe === 'object' ? tpe.elementType : 'any';
          return `List<${localGetJavaType(el)}>`;
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
          const jType = localGetJavaType(block.config.typeConfig);
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
              itemType = localGetJavaType(listType.elementType);
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
          const javaArrayRes = `new ArrayList<${javaArrayType ? localGetJavaType(javaArrayType) : 'Object'}>(Arrays.asList(${javaArrayItems}))`;
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

  return {
    generateJava,
    getJavaType
  };
};
