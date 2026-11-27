import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deriveAppUserId} from './verified-user-id.mjs';
const pepper='never-use-this-example-secret-in-production-012345';
test('verified identity stays stable across providers but not users/apps',async()=>{
 const args={verifiedSubject:'verified-user-A',appId:'dajeongrok',secretPepper:pepper};
 const first=await deriveAppUserId(args),again=await deriveAppUserId(args);
 assert.equal(first,again);
 assert.match(first,/^u_[0-9a-f]{64}$/);
 assert.equal(first.includes('verified-user-A'),false);
 assert.notEqual(first,await deriveAppUserId({...args,verifiedSubject:'verified-user-B'}));
 assert.notEqual(first,await deriveAppUserId({...args,appId:'another-app'}));
});
test('weak secret or missing verified identity rejected',async()=>{
 await assert.rejects(deriveAppUserId({verifiedSubject:'x',appId:'app',secretPepper:'weak'}));
 await assert.rejects(deriveAppUserId({verifiedSubject:'',appId:'app',secretPepper:pepper}));
});
