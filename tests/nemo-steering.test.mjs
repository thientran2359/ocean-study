import assert from 'node:assert/strict';
import {NemoSteering,angleDelta,turnRouteTarget} from '../dist/nemo-steering.js';
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
 x-=Math.cos(s.bodyYaw)*s.speed/60;z+=Math.sin(s.bodyYaw)*s.speed/60;
 assert(Math.abs(x)<2&&Math.abs(z)<2);
 if(i===1799||i===3599)assert(Math.hypot(gx-x,gz-z)<.2);
}
// Reversal must translate through a visible arc, never pivot while travelling.
const trajectories=[];
for(const fps of [30,60,144]){
 const turn=new NemoSteering();turn.yaw=turn.bodyYaw=0;turn.speed=.7;
 let x=0,z=0,length=0,hadLead=false,hadTailLag=false,hadKick=false;
 for(let i=0;i<fps*7;i++){
  const previous=turn.bodyYaw;
  turn.tick(1/fps,Math.PI,1,{effort:.6});
  x-=Math.cos(turn.bodyYaw)*turn.speed/fps;z+=Math.sin(turn.bodyYaw)*turn.speed/fps;
  length+=turn.speed/fps;
  const angle=Math.abs(angleDelta(turn.bodyYaw,previous));
  assert(angle<=turn.speed/fps/.48+1e-9,'heading change must obey a minimum swimming radius');
  assert(turn.speed>.42,'keep forward propulsion during the U-turn');
  hadLead ||= Math.abs(turn.headLead)>.08;
  hadTailLag ||= Math.abs(turn.bend)-Math.abs(turn.tailBend)>.08;
  hadKick ||= turn.kick>.8;
 }
 assert(z>.9,'reversal needs lateral displacement, not a pivot');
 assert(length>3,'fish keeps swimming through reversal');
 assert(hadLead&&hadTailLag&&hadKick);
 assert(Math.abs(angleDelta(Math.PI,turn.bodyYaw))<.01);
 trajectories.push({x,z});
 // Actual demo target, integrated for two minutes: loops remain on stage.
 const demo=new NemoSteering();demo.yaw=demo.bodyYaw=0;x=0;z=0;
 let minX=0,maxX=0,minZ=0;
 for(let i=0;i<fps*120;i++){
  const goal=turnRouteTarget(x,z);
  demo.tick(1/fps,Math.atan2(goal.z-z,x-goal.x),2);
  x-=Math.cos(demo.bodyYaw)*demo.speed/fps;z+=Math.sin(demo.bodyYaw)*demo.speed/fps;
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);
  assert(Math.abs(x)<1.05&&z>-1.45&&z<.2,'demo stays in a bounded swimming loop');
 }
 assert(minX<-.7&&maxX>.7&&minZ<-1,'demo traverses both sides and the far lane');
 assert(Math.abs(demo.yaw)>Math.PI*20,'complete repeated swimming laps');
}
for(const point of trajectories)assert(Math.hypot(point.x-trajectories[1].x,point.z-trajectories[1].z)<.04,'same arc at 30/60/144 fps');
console.log('PASS: forward U-turn radius, displacement, continuous propulsion, bounded demo laps, arrival and frame-rate consistency');
