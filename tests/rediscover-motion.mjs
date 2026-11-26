import assert from 'node:assert/strict';
import {stackCount,notePositions,pileOrder,settlePose,paperCurve,jarMarkup,DRAW_DURATION} from '../src/graphics/rediscover-motion.mjs';
assert.equal(DRAW_DURATION,2700);
for(const [count,n] of [[0,0],[1,1],[2,1],[3,3],[9,3],[10,5],[100,5]]){
 assert.equal(stackCount(count),n);assert.equal(notePositions(n).length,n);assert.equal(pileOrder(n).length,n);
 const svg=jarMarkup(n,-1,'test');assert.equal((svg.match(/data-note-index=/g)||[]).length,n);assert.ok(!svg.includes('data-moving-surface'));
}
for(const n of [1,3,5])for(let pick=0;pick<n;pick++)for(let i=0;i<n;i++){
 const initial=notePositions(n)[i];assert.deepEqual(settlePose(n,pick,i,0),initial);
 const end=settlePose(n,pick,i,1100);
 assert.ok(end.every(Number.isFinite));
 if(i===pick||pick>=n-2&&n===5||n===1)assert.deepEqual(end,initial);
}
assert.ok(settlePose(5,0,2,900)[1]>notePositions(5)[2][1]);
assert.ok(settlePose(5,1,2,900)[1]>notePositions(5)[2][1]);
assert.deepEqual(settlePose(5,4,2,900),notePositions(5)[2]);
const flat=paperCurve(1);assert.ok(Math.abs(flat.at(-1).y-48)<1e-8);assert.ok(Math.abs(flat.at(-1).z)<1e-8);
assert.ok(jarMarkup(5,0,'unique').includes('data-moving-surface'));assert.ok(!jarMarkup(5,0,'unique').includes('id="movingSurface"'));
console.log('PASS — V10 stack counts, support poses, fixed sheet length and scoped SVG IDs');
