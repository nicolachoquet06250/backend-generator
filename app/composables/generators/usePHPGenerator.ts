import type { BlockInstance } from '../useFunctions';
import { useGeneratorUtils } from './useGeneratorUtils';
import { useFunctions } from '../useFunctions';

export const usePHPGenerator = () => {
  const { 
    indent,
    formatLiteral, 
    structures 
  } = useGeneratorUtils();
  const { functions } = useFunctions();

  const getPHPType = (type: any, isNullable: boolean = false): string => {
    let phpType = 'mixed';
    if (typeof type === 'string') {
      if (type === 'string') phpType = 'string';
      else if (type === 'number') phpType = 'int';
      else if (type === 'boolean') phpType = 'bool';
      else if (type === 'array') phpType = 'array';
    } else if (type && typeof type === 'object') {
      if (type.kind === 'array') phpType = 'array';
      else if (type.kind === 'object') {
        const struct = structures.value.find(s => s.id === type.structId);
        phpType = struct ? struct.name : 'object';
      }
    }
    return isNullable ? '?' + phpType : phpType;
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
        case 'new_route':
          const phpPath = block.config.path || '/';
          const phpHandler = block.config.slots?.value ? generatePHP([block.config.slots.value], true).replace(';', '') : 'function() {}';
          return `$router->get("${phpPath}", ${phpHandler});`;
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

  return {
    generatePHP,
    getPHPType
  };
};
