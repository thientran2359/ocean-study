const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*t*(t*(t*6-15)+10);
// Random destinations are interpolated over seconds, never sampled per frame.
class Current {
 constructor(random){let seed=Math.floor(random()*4294967296);this.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);this.from=0;this.to=this.random()*2-1;this.age=0;this.duration=1.8+this.random()*1.8;}
 tick(dt){this.age+=dt;while(this.age>=this.duration){this.age-=this.duration;this.from=this.to;this.to=this.random()*2-1;this.duration=1.8+this.random()*1.8;}return this.from+(this.to-this.from)*smooth(this.age/this.duration);}
}
export class NemoSwim {
 constructor(random=Math.random){this.side=new Current(random);this.lift=new Current(random);this.rhythm=new Current(random);this.phase=0;this.weight=0;this.bob=0;this.pitch=0;this.output={yaw:0,bob:0,pitch:0,pulse:1};}
 tick(dt,{travel=false,distance=0,quiet=false}={}){
  if(dt<=0)return this.output;
  const side=this.side.tick(dt),lift=this.lift.tick(dt),rhythm=this.rhythm.tick(dt);
  const envelope=travel?smooth(clamp((distance-.12)/.75,0,1)):0;
  this.weight+=(envelope-this.weight)*(1-Math.exp(-dt*2));
  this.phase+=dt*(2.1+rhythm*.4);
  // Rise on the fin stroke, sink softly between strokes. Keep bob independent of path height.
  const amplitude=(quiet?.035:.065)+this.weight*.035;
  const bob=amplitude*(Math.sin(this.phase)+.18*Math.sin(this.phase*2+.7))+this.weight*lift*.12;
  const vy=(bob-this.bob)/dt;this.bob=bob;
  this.pitch+=(clamp(-vy*.38,-.12,.12)-this.pitch)*(1-Math.exp(-dt*4));
  this.output={yaw:this.weight*(side*.65+Math.sin(this.phase*.65)*.2),bob,pitch:this.pitch,pulse:1+.14*Math.cos(this.phase)};
  return this.output;
 }
}
