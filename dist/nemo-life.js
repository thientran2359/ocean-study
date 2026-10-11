const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class NemoLife{
 constructor(random=Math.random){this.random=random;this.time=0;this.state='observe';this.until=4;this.since=0;this.cooldown=0;this.nearTime=0;this.goal=[.35,.15,0];this.lastIdle='observe';}
 enter(state,duration,goal){this.state=state;this.since=this.time;this.until=this.time+duration;if(goal)this.goal=[...goal];}
 touch(){if(this.time<this.cooldown)return false;this.cooldown=this.time+6;this.enter('greet',3.2,[.15,.16,.55]);return true;}
 tick(dt,input={}){this.time+=dt;const p=input.pointer,near=p&&p.distance<1.7;this.nearTime=near?this.nearTime+dt:0;
  if(this.time>=this.until){const choices=['observe','wander','meet','hide'];let pool=choices.filter(s=>s!==this.lastIdle);const state=pool[Math.floor(this.random()*pool.length)];this.lastIdle=state;const goal=state==='meet'?[-.7,-.18,.12]:state==='hide'?[-1.24,-.52,-.34]:state==='wander'?[(this.random()-.5)*1.8,(this.random()-.5)*.5,.08]:[.3,.12,.05];this.enter(state,4+this.random()*3,goal);}
  if(this.time>=this.cooldown&&near&&p.speed>3.8){this.cooldown=this.time+5;this.enter('evade',1.3,[clamp(input.x+(input.x-p.x)*.45,-1.2,1.4),clamp(input.y+.2,-.35,.5),-.1]);}
  else if(this.time>=this.cooldown&&this.nearTime>.65&&!['curious','evade','greet'].includes(this.state)){this.cooldown=this.time+7;this.enter('curious',3.5,[clamp(p.x*.4,-.85,1.2),clamp(p.y*.4,-.2,.4),.22]);}
  const age=this.time-this.since,effort=this.state==='evade'?1.15:this.state==='wander'?.65:this.state==='hide'?.38:.3;
  let goal=[...this.goal];goal[1]+=Math.sin(this.time*.75)*.025;
  return {state:this.state,goal,effort:effort+.08*Math.sin(this.time*1.3),brake:['observe','curious','greet'].includes(this.state)?1:0,look:near?[p.x,p.y]:goal,greet:this.state==='greet',age};
 }
}
