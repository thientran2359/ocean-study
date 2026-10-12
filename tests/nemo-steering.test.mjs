import assert from 'node:assert/strict';
import {NemoSteering,angleDelta} from '../dist/nemo-steering.js';
for(const fps of [30,60,144]){
 const s=new NemoSteering(),dt=1/fps;let prevRate=0;
 for(let i=0;i<fps*20;i++){
  const yaw=i<fps*5?Math.PI:i<fps*10?-Math.PI+.02:0,prevYaw=s.yaw;
  s.tick(dt,yaw,1);
  assert(Math.abs(s.rate)<=1.05+1e-9);
  assert(Math.abs(s.rate-prevRate)<=2*dt+1e-9);
  assert(Math.abs(s.yaw-prevYaw)<=1.05*dt+1e-9);
  assert([s.yaw,s.speed,s.bank,s.bend].every(Number.isFinite));prevRate=s.rate;
 }
 assert(Math.abs(angleDelta(0,s.yaw))<.01);
 const old=s.speed;for(let i=0;i<fps*3;i++)s.tick(dt,s.yaw,0,{travel:false});assert(s.speed<old*.001);
}
const seam=new NemoSteering();seam.yaw=Math.PI-.01;seam.tick(1/60,-Math.PI+.01,1);assert(seam.rate>0&&seam.rate<.05);
// A stationary destination must be reachable without circling or leaving the stage.
const s=new NemoSteering();let x=0,z=0,holding=false;
for(let i=0;i<3600;i++){
 const gx=i<1800?1:-1,gz=.2,dx=gx-x,dz=gz-z,gap=Math.hypot(dx,dz);
 holding=holding?gap<.2:gap<.085;
 s.tick(1/60,holding?s.yaw:Math.atan2(dz,-dx),gap,{travel:!holding});
 x-=Math.cos(s.yaw)*s.speed/60;z+=Math.sin(s.yaw)*s.speed/60;
 assert(Math.abs(x)<2&&Math.abs(z)<2);
 if(i===1799||i===3599)assert(Math.hypot(gx-x,gz-z)<.2);
}
console.log('PASS: bounded turn speed/acceleration, angle seam, braking, arrival, 30/60/144fps');
