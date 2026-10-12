import assert from 'node:assert/strict';
import {NemoSwim} from '../dist/nemo-swim.js';
import {NemoSteering} from '../dist/nemo-steering.js';
function seeded(){let seed=27;return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);}
const endpoints=[];
for(const fps of [30,60,144]){
 const swim=new NemoSwim(seeded());let prev=0,min=0,max=0;
 for(let i=0;i<fps*30;i++){const r=swim.tick(1/fps);assert(r.yaw===0);assert(Math.abs(r.bob-prev)<.015);assert(Math.abs(r.pitch)<=.12);min=Math.min(min,r.bob);max=Math.max(max,r.bob);prev=r.bob;}
 assert(max-min>.1);endpoints.push(swim.output.bob);
 const move=new NemoSwim(seeded()),steer=new NemoSteering();let x=0,z=0,hold=false,excursion=0;
 for(let i=0;i<fps*30;i++){
  const gap=Math.hypot(-1-x,-z);hold=hold?gap<.2:gap<.085;
  const drift=move.tick(1/fps,{travel:!hold,distance:gap});
  const r=steer.tick(1/fps,(hold?steer.yaw:Math.atan2(-z,1+x))+drift.yaw,gap,{travel:!hold});
  x-=Math.cos(r.yaw)*r.speed/fps;z+=Math.sin(r.yaw)*r.speed/fps;excursion=Math.max(excursion,Math.abs(z));
  assert(Math.abs(x)<2&&Math.abs(z)<1);assert(Math.abs(drift.bob)<.25);
 }
 assert(Math.hypot(-1-x,z)<.2);assert(excursion>.03);
 const frozen=move.output;assert.equal(move.tick(0,{travel:true,distance:2}),frozen);
}
assert(Math.max(...endpoints)-Math.min(...endpoints)<.004);
console.log('PASS: visible idle bob, smooth bounded drift, curved route arrival, pause, 30/60/144fps');
