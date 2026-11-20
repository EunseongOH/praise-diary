import fs from 'node:fs';
const css=fs.readFileSync(new URL('./src/styles/tokens.css',import.meta.url),'utf8');
const tokens=Object.fromEntries(Array.from(css.matchAll(/(--[a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)).map(m=>[m[1],m[2]]));
function relativeLum(s){const v=[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;}
function ratio(a,b){const x=relativeLum(a),y=relativeLum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const checks=[['--ink','--background',4.5],['--muted','--background',4.5],['--accent','--background',4.5],['--accent','--surface-green',4.5],['--hero-ink','--hero',4.5],['--hero-sky','--hero',4.5],['--accent-ink','--accent',4.5],['--ink','--surface',4.5],['--muted','--surface',4.5]];
let failed=false;
for(const [a,b,min] of checks){const value=ratio(tokens[a],tokens[b]);const okay=value>=min;console.log(`${okay?'PASS':'FAIL'} ${a} / ${b}: ${value.toFixed(2)}:1 (min ${min})`);if(!okay)failed=true;}
if(failed)process.exitCode=1;
