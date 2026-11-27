import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const m=JSON.parse(read('docs/launch/app-registration.draft.json'));
const pkg=JSON.parse(read('package.json'));
test('AIT 3.x config is tied to registered dajeongrok and has no unnecessary permissions',()=>{
  const config=read('apps-in-toss.config.ts');
  assert.match(config, /@apps-in-toss\/web-framework\/config/);
  assert.match(config,/appName: 'dajeongrok'/);
  assert.match(config,/webBundleDir: 'dist'/);
  assert.match(config,/permissions: \[\]/);
  assert.match(config,/withBackButton: true/);
  assert.ok(pkg.dependencies['@apps-in-toss/web-framework'].startsWith('^3.'));
  assert.ok(pkg.devDependencies['@apps-in-toss/devtools'].startsWith('^3.'));
  assert.ok(!fs.existsSync(new URL('../granite.config.ts',import.meta.url)));
});
test('release is fail-closed until every account, privacy and Toss QA gate is complete',()=>{
  assert.ok(pkg.scripts['bundle:ait:release'].includes('audit:ait:strict'));
  assert.equal(m.releaseEvidence.realTossCodeExchangeVerified,false);
  assert.equal(m.releaseEvidence.durableEntriesAndRecoveryTested,false);
  assert.equal(m.releaseEvidence.crossUserPrivacyTestsPassed,false);
});
test('review bundle is clearly marked, does not ship personal sample diaries or production signing secrets',()=>{
 const builder=read('scripts/build-ait-review.mjs');
 const app=read('src/screens/App.tsx');
 assert.match(builder,/VITE_AIT_REVIEW_BUILD: '1'/);
 assert.match(builder,/VITE_DEMO_DATE: ''/);
 assert.match(builder,/VITE_SNOWFLAKE_COMPLETION_REPLAY: ''/);
 assert.match(app,/실제 일기나 개인정보를 입력하지 마세요/);
 assert.match(app,/graniteEvent.addEventListener\('backEvent'/);
});
test('App-in-Toss name, subtitle and long description meet visible console limits',()=>{
 assert.equal(m.product.englishDisplayName,'Dajeongrok');
 assert.ok([...m.product.englishDisplayName].length<=15);
 assert.ok([...m.product.shortDescription].length<=20);
 assert.ok([...m.product.detailDescription].length<=500);
 assert.ok([...m.product.detailDescription].length>200);
 assert.equal(m.product.appNameRegistered,'dajeongrok');
 assert.ok(m.product.detailDescription.includes('작품'));
 assert.ok(m.product.detailDescription.includes('포춘쿠키'));
 assert.ok(m.product.detailDescription.includes('칭찬일기'));
});

test('the December sandbox QA uses real renderer and fictional 1/5/15 day fixture, never diary state', () => {
 const source=read('src/screens/SandboxSnowflakeQA.tsx');
 const app=read('src/screens/App.tsx');
 assert.match(source,/previewFor\(theme\)/);
 assert.match(source,/ArtworkSlot/);
 assert.match(source,/1, 5, 15/);
 assert.match(source,/preview.entries.slice\(0, days\)/);
 assert.doesNotMatch(source,/saveState|localStorage|sessionStorage/);
 assert.match(app,/aitReview && sandboxSnowflakeOpen/);
 assert.match(app,/sandboxSnowflakeOpen.*setSandboxSnowflakeOpen\(false\)/);
});
