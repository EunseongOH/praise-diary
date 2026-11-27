import test from 'node:test';
import assert from 'node:assert/strict';
import {assessLaunch} from '../scripts/audit-ait-launch.mjs';
import fs from 'node:fs';
const result=assessLaunch();
test('draft app info is within 20 characters with a valid immutable slug candidate',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../docs/launch/app-registration.draft.json',import.meta.url),'utf8'));
 assert.equal(m.product.displayName,'다정록');
 assert.ok([...m.product.shortDescription].length<=20);
 assert.ok(!/[.!。！]$/.test(m.product.shortDescription));
 assert.match(m.product.appNameCandidate,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
 assert.ok(m.product.detailDescription.includes('다정록을 열고'));
 assert.ok(m.product.detailDescription.includes('칭찬일기'));
});
test('real launch remains blocked until real Toss SDK, backend and privacy proof exist',()=>{
 assert.equal(result.status,'NOT_READY');
 for(const key of ['ait_sdk','production_repository','toss_verification','auth_and_cross_user','legal_urls','marketing_assets']) {
  assert.ok(result.issues.some(x=>x.key===key && x.level==='blocker'),'expected blocker '+key);
 }
});
test('never treat GitHub QA or a mock auth exchange as release proof',()=>{
 assert.equal(result.info.includes('never a live Toss/DB security guarantee.'),true);
 assert.ok(result.blockerCount>=8);
});

test('user confirmed appName registration without falsely claiming inspected private console',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../docs/launch/app-registration.draft.json',import.meta.url),'utf8'));
 assert.equal(m.product.appNameRegistered,'dajeongrok');
 assert.equal(m.releaseEvidence.consoleAppRegistered,true);
 assert.equal(m.releaseEvidence.verifiedAvailableAppName,true);
 assert.equal(m.registrationEvidence.consoleContentIndependentlyInspected,false);
 assert.ok(!m.publisher.workspaceId);
});
