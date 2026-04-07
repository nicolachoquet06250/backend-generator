import type { BlockInstance } from '../useFunctions';
import { useGeneratorUtils } from './useGeneratorUtils';
import { useFunctions } from '../useFunctions';

export const getGoType = (type: any): string => {
  const { structures } = useGeneratorUtils();

  if (typeof type === 'string') {
    if (type === 'string') return 'string';
    if (type === 'number') return 'int';
    if (type === 'boolean') return 'bool';
    if (type === 'array') return '[]interface{}';
  } else if (type && typeof type === 'object') {
    if (type.kind === 'array') return `[]${getGoType(type.itemType || type.elementType || 'interface{}')}`;
    if (type.kind === 'object') {
      const struct = structures.value.find(s => s.id === type.structId);
      return struct ? '*' + struct.name : 'interface{}';
    }
  }
  return 'interface{}';
};

export const useGoGenerator = () => {
  const { 
    indent,
    formatLiteral, 
    structures 
  } = useGeneratorUtils();
  const { functions } = useFunctions();

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
            if (!argBlock) {
              if (p.toLowerCase().includes('res') || p.toLowerCase().includes('response')) return 'res';
              if (p.toLowerCase().includes('req') || p.toLowerCase().includes('request')) return 'req';
            }
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
        case 'new_route':
          const goPath = block.config.path || '/';
          const goHandlerBlock = block.config.slots?.value;
          const goHandler = goHandlerBlock ? generateGo([goHandlerBlock], true) : 'nil';
          const goMethod = block.config.method || 'GET';

          return `mux := http.NewServeMux()\nmux.HandleFunc("${goMethod} ${goPath}", func(res http.ResponseWriter, req *http.Request) {\n\t${goHandler}\n})\n\nfmt.Println("Server starting on :8080...")\nerr := http.ListenAndServe(":8080", mux)\nif err != nil {\n\tlog.Fatal(err)\n}`;
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

  return {
    generateGo,
    getGoType
  };
};
