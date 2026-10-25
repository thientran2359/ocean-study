const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Keep angular momentum continuous even when the goal crosses the ±pi seam.
export class NemoSteering {
 constructor(){this.yaw=.18;this.bodyYaw=.18;this.rate=0;this.speed=0;this.bank=0;this.bend=0;this.tailBend=0;this.headLead=0;this.brake=0;this.kick=0;this.pectoralBias=0;this.stroke=0;this.turnLoaded=false;}
 tick(dt,desiredYaw,distance,{travel=true,effort=.5}={}){
  if(dt<=0)return this;
  const error=angleDelta(desiredYaw,this.yaw);
  const tight=clamp((Math.abs(error)-.22)/.9,0,1);
  this.brake+=(tight-this.brake)*(1-Math.exp(-dt*6));
  this.stroke+=dt*(3.4+effort*1.8);
  const paddle=.78+.22*(.5+.5*Math.sin(this.stroke));
  // A swimming turn has curvature: angular speed cannot exceed speed/radius.
  // Keep propulsion through the bend; slow for arrival only once facing the goal.
  const radius=.48;
  const arrival=Math.abs(error)<.65?Math.min(1,distance/.7):1;
  const wantedSpeed=travel?(.62+effort*.18+this.kick*.12)*(1-.22*this.brake)*paddle*arrival:0;
  this.speed+=(wantedSpeed-this.speed)*(1-Math.exp(-dt*(wantedSpeed<this.speed?6:2.8)));
  const limit=travel?Math.min(1.05,this.speed/radius):.28;
  const wanted=clamp(error*2,-limit,limit);
  this.rate+=clamp(wanted-this.rate,-2*dt,2*dt);
  this.rate=clamp(this.rate,-limit,limit);
  this.yaw+=this.rate*dt;
  this.bodyYaw=this.yaw;
  // Head anticipation is local mesh deformation, not a detached travel heading.
  this.headLead+=(clamp(error*.18,-.22,.22)-this.headLead)*(1-Math.exp(-dt*5));
  if(tight>.55)this.turnLoaded=true;
  this.kick*=Math.exp(-dt*3.5);
  if(this.turnLoaded&&Math.abs(error)<.22&&travel){this.kick=1;this.turnLoaded=false;}
  this.bend+=(clamp(this.rate/1.05,-1,1)-this.bend)*(1-Math.exp(-dt*5));
  this.tailBend+=(this.bend-this.tailBend)*(1-Math.exp(-dt*3.2));
  this.pectoralBias+=(clamp(Math.sign(error)*this.brake+this.rate*.2,-1,1)-this.pectoralBias)*(1-Math.exp(-dt*8));
  this.bank+=(-this.rate*.07-this.bank)*(1-Math.exp(-dt*3));
  return this;
 }
}

// Look ahead along an oval, starting at (0,0) facing left. Its far lane is
// behind the starting lane, keeping the demonstration away from the camera.
export function turnRouteTarget(x,z){
 const a=.8,b=.6;
 const angle=Math.atan2((z+b)/b,x/a)+.55;
 return {x:a*Math.cos(angle),z:-b+b*Math.sin(angle)};
}
