import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** QR sandbox ONLY. The live app still persists entries in sessionStorage.
 * Both Vite and ait build inherit the review env; no secrets are compiled.
 * The production release command is deliberately blocked by audit:ait:strict.
 */
const env = {
  ...process.env,
  VITE_AIT_REVIEW_BUILD: '1',
  VITE_AIT_NATIVE_NAV: '1',
  VITE_SNOWFLAKE_ARTWORK: '1',
  // Do not allow test URLs or fake diary entries from a caller's local env.
  VITE_DEMO_DATE: '',
  VITE_SNOWFLAKE_COMPLETION_REPLAY: '',
};
function run(command, args) {
  const result=spawnSync(command,args,{
    stdio:'inherit',env,
    shell:process.platform==='win32',
  });
  if (result.error || result.status!==0) {
    throw Error('AIT review build failed: '+command+' '+args.join(' '));
  }
}
run(process.platform==='win32'?'npm.cmd':'npm',['run','build']);
run(process.platform==='win32'?'npx.cmd':'npx',['--no-install','ait','build']);
const roots=['.','build','dist'];
const bundles=roots.filter(existsSync).flatMap(dir=>
  readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.ait'))
    .map(e=>path.join(dir,e.name)));
if(!bundles.length) throw Error('.ait bundle not found; inspect SDK build output before uploading.');
console.log('AIT sandbox-only bundle created:',bundles.join(', '));
console.log('DO NOT submit this bundle for production review until server storage/privacy QA pass.');
