import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch {
  // CI/normal dev should use the locally installed devDependency. Container fallback is testing only.
  ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
}
const root=new URL('./src/',import.meta.url);
function recursive(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?recursive(path.join(dir,e.name)):[path.join(dir,e.name)]).filter(p=>/\.(tsx?|jsx?)$/.test(p))}
let problems=0;const src=recursive(new URL(root).pathname);
for(const file of src){const source=fs.readFileSync(file,'utf8');const t=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});for(const d of t.diagnostics||[]){console.error(file,ts.flattenDiagnosticMessageText(d.messageText,'\n'));problems++}}
console.log(`Checked ${src.length} TypeScript/TSX source files; syntactic diagnostics: ${problems}.`);
if(problems)process.exitCode=1;
