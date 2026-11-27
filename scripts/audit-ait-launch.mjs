#!/usr/bin/env node
/** Conservative launch-readiness audit. Passing Vite/Playwright checks ≠ AIT release ready.
 * This script NEVER deploys, touches secrets, or creates a live user account.
 * Usage: npm run audit:ait            (nonblocking report)
 *        npm run audit:ait:strict     (exit nonzero until every release gate passes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=p=>path.join(root,p);
const read=p=>fs.existsSync(file(p))?fs.readFileSync(file(p),'utf8'):'';
const json=p=>JSON.parse(read(p));
export function assessLaunch(rootPath=root){
 const exists=p=>fs.existsSync(path.join(rootPath,p));
 const load=p=>exists(p)?fs.readFileSync(path.join(rootPath,p),'utf8'):'';
 const manifest=JSON.parse(load('docs/launch/app-registration.draft.json'));
 const pkg=JSON.parse(load('package.json'));
 const deps={...pkg.dependencies,...pkg.devDependencies};
 const evidence=manifest.releaseEvidence;
 const issues=[];
 const gate=(key,passed,reason,level='blocker')=>{
   if(!passed)issues.push({key,level,reason});
 };
 const short=manifest.product.shortDescription??'';
 const appName=manifest.product.appNameCandidate??'';
 const shortPass=short.length>0 && [...short].length<=20 && !/[.!。！]$/.test(short);
 const slugPass=/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(appName);
 gate('registration_copy',shortPass && slugPass && manifest.product.displayName==='다정록',
   '20자 이하 앱 설명·고유 appName·앱 이름 초안을 검토하세요.');
 gate('registration_confirmed',evidence.consoleAppRegistered && evidence.verifiedAvailableAppName,
   '콘솔 appName 사용 가능 확인 및 앱 등록 미완료');
 gate('publisher_contacts',Boolean(manifest.publisher.makerDisplayName && manifest.publisher.supportEmail && manifest.publisher.supportContactOrUrl),
   '제작자·고객 문의 연락처 미입력');
 gate('legal_urls',Boolean(manifest.publisher.privacyPolicyUrl && manifest.publisher.termsUrl && manifest.publisher.dataControllerLegalName && evidence.privacyTermsPublished),
   '개인정보처리방침/이용약관 실제 게시 URL 및 개인정보처리자 미확정');
 const assets=manifest.assets;
 gate('marketing_assets',Boolean(assets.appIcon && assets.squareThumbnail && assets.wideThumbnail &&
   assets.portraitScreenshots.length>=3), '앱 아이콘/대표 썸네일/실제 화면 캡처 미준비');
 gate('ait_sdk',Boolean(deps['@apps-in-toss/web-framework'] && exists('granite.config.ts') &&
   (pkg.scripts['build:ait'] || pkg.scripts['bundle:ait'])), '앱인토스 SDK·granite.config.ts·.ait 빌드 스크립트 없음');
 const app=load('src/screens/App.tsx'),store=load('src/data/store.ts');
 gate('production_repository',evidence.durableEntriesAndRecoveryTested &&
   !(app.includes('loadState, saveState') && store.includes('sessionStorage')),
   '현재 UI는 sessionStorage 데모 데이터를 사용하고, 영구 사용자 저장 연결이 없음');
 gate('toss_verification',evidence.realTossCodeExchangeVerified,
   '실제 Apps-in-Toss SDK 인증코드 → 서버 mTLS 교환 미검증');
 gate('auth_and_cross_user',evidence.firebaseOrSupabaseAuthAndRulesVerified && evidence.crossUserPrivacyTestsPassed,
   '실 DB 보안 규칙/RLS 및 서로 다른 사용자 교차접근 검증 필요');
 gate('data_controls',evidence.accountDeletionAndExportTested, '계정 탈퇴/전체 기록 삭제/내보내기·복원 미검증');
 const graphics=load('src/graphics/snowflake/flags.ts'),themes=load('src/data/themes.ts');
 gate('artwork_production',evidence.currentReleaseArtworkApproved &&
   !graphics.includes('Production default: OFF'), '월간 눈꽃은 현재 리뷰 플래그 중심이고 출시 빌드/완성 목표 미확정');
 gate('future_months',!themes.includes("release: 'planned'") && evidence.currentReleaseArtworkApproved,
   '달력 월별 출시 일정과 실제 제작된 작품을 일치시키세요', 'warning');
 gate('native_and_a11y',evidence.mobileTossSandboxQATested && evidence.accessibilityNavigationQAVerified,
   '토스 실기기 네비게이션/키보드/텍스트 확대/스크린리더 미검증');
 gate('production_configuration',evidence.productionFlagsAndNoDemoDataVerified,
   'VITE_DEMO_DATE/연구용 URL 파라미터/디버그 플래그 비활성화 및 번들 검수 필요');
 gate('support',evidence.supportChannelReady, '토스 고객센터와 앱 내 지원 경로 준비 필요');
 return {status:issues.some(x=>x.level==='blocker')?'NOT_READY':'REVIEW_REQUIRED',
  app:manifest.product.displayName,appNameCandidate:appName,blockerCount:issues.filter(x=>x.level==='blocker').length,
  issues,info:'Static audit + operator attestations; never a live Toss/DB security guarantee.'};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=assessLaunch();
 if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
 else{
  console.log('AIT release readiness:',result.status,'/ blockers',result.blockerCount);
  for(const issue of result.issues)console.log(' -',issue.level.toUpperCase(),issue.key+':',issue.reason);
  console.log(result.info);
 }
 if(process.argv.includes('--strict') && result.blockerCount)process.exitCode=1;
}
