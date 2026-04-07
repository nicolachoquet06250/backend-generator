import type { BlockInstance } from '../useFunctions';
import { useGeneratorUtils } from './useGeneratorUtils';
import { useFunctions } from '../useFunctions';

export const useNodeJSGenerator = () => {
  const { 
    indent, 
    getReassignedVars, 
    hasBreakOrContinue,
    formatLiteral, 
    structures 
  } = useGeneratorUtils();
  const { functions } = useFunctions();

  const getTypescriptType = (type: any): string => {
    if (typeof type === 'string') {
      if (type === 'string') return 'string';
      if (type === 'number') return 'number';
      if (type === 'boolean') return 'boolean';
      if (type === 'array') return 'any[]';
    } else if (type && typeof type === 'object') {
      if (type.kind === 'array') return `${getTypescriptType(type.itemType || type.elementType || 'any')}[]`;
      if (type.kind === 'object') {
        const struct = structures.value.find(s => s.id === type.structId);
        return struct ? struct.name : 'any';
      }
    }
    return 'any';
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
        case 'new_route':
          const nodeJsPath = block.config.path || '/';
          const nodeJsHandler = block.config.slots?.value ? generateNodeJS([block.config.slots.value], true, reassigned) : '() => {}';
          return `app.get("${nodeJsPath}", ${nodeJsHandler});`;
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
          return '';
      }
    }).join('\n');
  };

  return {
    generateNodeJS,
    getTypescriptType
  };
};
