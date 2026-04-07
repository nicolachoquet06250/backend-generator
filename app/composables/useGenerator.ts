import type {FunctionDefinition} from './useFunctions';
import {useNodeJSGenerator} from "~/composables/generators/useNodeJSGenerator";
import {usePythonGenerator} from "~/composables/generators/usePythonGenerator";
import {useJavaGenerator} from "~/composables/generators/useJavaGenerator";
import {useGoGenerator} from "~/composables/generators/useGoGenerator";
import {usePHPGenerator} from "~/composables/generators/usePHPGenerator";
import {useGeneratorUtils} from "~/composables/generators/useGeneratorUtils";

export const useGenerator = () => {
  const { structures } = useDataStructures();
  const { functions } = useFunctions();

  const { indent, hasReturnBlock, formatLiteral } = useGeneratorUtils();

  const { generateNodeJS, getTypescriptType } = useNodeJSGenerator();
  const { generatePython, getPythonType } = usePythonGenerator();
  const { generateJava, getJavaType } = useJavaGenerator();
  const { generatePHP, getPHPType } = usePHPGenerator();
  const { generateGo, getGoType } = useGoGenerator();

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
          const goParamsArr = func.blocks
              .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam);

          let goParams;
          const resParam = goParamsArr.find(b => {
            const t = (typeof b.config.type === 'string' ? b.config.type : b.config.type?.kind) || '';
            return t.toLowerCase().includes('response');
          });
          const reqParam = goParamsArr.find(b => {
            const t = (typeof b.config.type === 'string' ? b.config.type : b.config.type?.kind) || '';
            return t.toLowerCase().includes('request');
          });

          if (resParam || reqParam) {
            const otherParams = goParamsArr.filter(b => b !== resParam && b !== reqParam);
            const formattedParams = [];
            if (resParam) formattedParams.push(`${resParam.config.name} ${getGoType(resParam.config.type)}`);
            if (reqParam) formattedParams.push(`${reqParam.config.name} ${getGoType(reqParam.config.type)}`);
            otherParams.forEach(b => {
              formattedParams.push(`${b.config.name} ${getGoType(b.config.type || 'interface{}')}`);
            });
            goParams = formattedParams.join(', ');
          } else {
            goParams = goParamsArr
                .map(b => `${b.config.name} ${getGoType(b.config.type || 'interface{}')}`)
                .join(', ');
          }
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
          const goParamsArr = func.blocks
              .filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam);

          let goParams;
          const resParam = goParamsArr.find(b => {
            const t = (typeof b.config.type === 'string' ? b.config.type : b.config.type?.kind) || '';
            return t.toLowerCase().includes('response');
          });
          const reqParam = goParamsArr.find(b => {
            const t = (typeof b.config.type === 'string' ? b.config.type : b.config.type?.kind) || '';
            return t.toLowerCase().includes('request');
          });

          if (resParam || reqParam) {
            const otherParams = goParamsArr.filter(b => b !== resParam && b !== reqParam);
            const formattedParams = [];
            if (resParam) formattedParams.push(`${resParam.config.name} ${getGoType(resParam.config.type)}`);
            if (reqParam) formattedParams.push(`${reqParam.config.name} ${getGoType(reqParam.config.type)}`);
            otherParams.forEach(b => {
              formattedParams.push(`${b.config.name} ${getGoType(b.config.type || 'interface{}')}`);
            });
            goParams = formattedParams.join(', ');
          } else {
            goParams = goParamsArr
                .map(b => `${b.config.name} ${getGoType(b.config.type || 'interface{}')}`)
                .join(', ');
          }
          const hasReturn = hasReturnBlock(func.blocks);
          const goRetType = getGoType(hasReturn ? (func.metadata?.returnType || 'interface{}') : 'void');
          let goBody = generateGo(func.blocks.filter(b => b.type !== 'parameter' || b.config?.selectedParam));
          
          if (func.name === 'main') {
            const httpFuncs = globalFunctions.filter(f => {
              const params = f.blocks.filter(b => b.type === 'parameter' && b.config?.name && !b.config?.selectedParam);
              return params.some(b => {
                const t = (typeof b.config.type === 'string' ? b.config.type : b.config.type?.kind) || '';
                return t.toLowerCase().includes('response') || t.toLowerCase().includes('request');
              });
            });

            if (httpFuncs.length > 0) {
              let serverCode = '\n\nmux := http.NewServeMux()\n';
              httpFuncs.forEach(f => {
                const route = f.name === 'index' ? '/' : `/${f.name}`;
                serverCode += `mux.HandleFunc("GET ${route}", func(res http.ResponseWriter, req *http.Request) {\n\t${f.name}(res, req)\n})\n`;
              });
              serverCode += '\nfmt.Println("Server starting on :8080...")\n';
              serverCode += 'err := http.ListenAndServe(":8080", mux)\n';
              serverCode += 'if err != nil {\n';
              serverCode += '\tlog.Fatal(err)\n';
              serverCode += '}\n';
              goBody += serverCode;
            }
          }
          
          globalCode += `func ${func.name}(${goParams})${goRetType ? ' ' + goRetType : ''} {\n`;
          globalCode += indent(goBody);
          globalCode += `${goBody ? '\n' : ''}}\n\n`;
        }
      });
    }

    if (language === 'go' && (code || globalCode)) {
      const combined = code + globalCode;
      const hasHttp = combined.includes('http.');
      const hasLog = combined.includes('log.');
      const hasFmt = combined.includes('fmt.');
      
      let imports = [];
      if (hasFmt) imports.push('"fmt"');
      if (hasHttp) imports.push('"net/http"');
      if (hasLog) imports.push('"log"');
      
      let header = `package main\n\n`;
      if (imports.length > 0) {
        header += `import (\n\t${imports.join('\n\t')}\n)\n\n`;
      }
      code = header + code + globalCode;
    }
    else if (language === 'java') {
      if (globalCode || code) {
        let finalCode = '';
        if (code) {
          finalCode += code + '\n';
        }
        finalCode += `public class Main {\n${indent(globalCode)}\n}\n`;
        code = finalCode;
      }
    }
    else if (language === 'php' && (code || globalCode)) {
      code = '<?php\n\n' + code + globalCode;
      if (hasPHPMain) {
        code += 'main();\n';
      }
    }
    else if (language === 'python') {
      code += globalCode;
      if (hasPythonMain) {
        code += 'if __name__ == "__main__":\n    main()\n';
      }
    }
    else {
      code += globalCode;
      if (language === 'nodejs' && hasTSMain) {
        code += 'main();\n';
      }
    }

    return code || '';
  };

  return {generateCode};
};
