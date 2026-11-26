import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=new URL('../src/',import.meta.url);
const bannedTags=new Set(['select','datalist','option','optgroup','dialog']);
const pickerTypes=new Set(['date','datetime-local','time','month','week','color','file']);
const bannedCalls=new Set(['alert','confirm','prompt','showPicker','reportValidity']);
const failures=[];
let scanned=0;
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const f=path.join(dir,item.name);
  if(item.isDirectory())walk(f);
  else if(/\.(?:tsx?|jsx?|mjs|cjs)$/.test(f)&&! /\.d\.(?:ts|mts)$/.test(f))check(f);
 }
}
function check(file){
 scanned++;
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const fail=(node,message)=>failures.push(path.relative(process.cwd(),file)+':'+(source.getLineAndCharacterOfPosition(node.getStart(source)).line+1)+' '+message);
 const literal=(node)=>node&&(ts.isStringLiteralLike(node)?node.text:ts.isJsxExpression(node)&&node.expression&&ts.isStringLiteralLike(node.expression)?node.expression.text:undefined);
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(source);
   if(bannedTags.has(tag))fail(node,'Use the shared CompactSelect / Dialog instead of <'+tag+'>.');
   if(/^[a-z]/.test(tag)){
    const attrs=node.attributes.properties.filter(ts.isJsxAttribute);
    const attr=n=>attrs.find(a=>a.name.getText(source)===n);
    if(attr('title'))fail(node,'Use an in-app tooltip instead of native title.');
    if(attr('list'))fail(node,'Use an in-app suggestion list instead of native datalist.');
    if(tag==='input'&&pickerTypes.has(literal(attr('type')?.initializer)))fail(node,'Use a themed picker or explicitly reviewed system handoff.');
    if(tag==='form'&&!attr('noValidate'))fail(node,'Use noValidate and in-app validation feedback.');
   }
  }
  if(ts.isCallExpression(node)){
   const callee=node.expression;
   const name=ts.isIdentifier(callee)?callee.text:ts.isPropertyAccessExpression(callee)?callee.name.text:ts.isElementAccessExpression(callee)?literal(callee.argumentExpression):undefined;
   if(bannedCalls.has(name))fail(node,'Use an in-app dialog/picker/validation instead of '+name+'().');
   if(name==='createElement'&&bannedTags.has(literal(node.arguments[0])))fail(node,'Native popup element creation.');
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
}
walk(root.pathname);
assert.equal(failures.length,0,'Native popup regression:\n'+failures.join('\n'));
console.log('PASS — native popup source contract ('+scanned+' files)');
