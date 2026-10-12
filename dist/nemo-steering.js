const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Keep angular momentum continuous even when the goal crosses the ±pi seam.
export class NemoSteering {
 constructor(){this.yaw=.18;this.rate=0;this.speed=0;this.bank=0;this.bend=0;}
 tick(dt,desiredYaw,distance,{travel=true,effort=.5}={}){
  if(dt<=0)return this;
  const error=angleDelta(desiredYaw,this.yaw);
  const wanted=clamp(error*2,-1.05,1.05);
  this.rate+=clamp(wanted-this.rate,-2*dt,2*dt);
  this.yaw+=this.rate*dt;
  // Brake before a tight turn, retaining a small forward arc, then accelerate out.
  const alignment=.12+.88*Math.pow(Math.max(0,Math.cos(error)),2);
  const wantedSpeed=travel?Math.min(.62+effort*.18,distance*.95)*alignment:0;
  this.speed+=(wantedSpeed-this.speed)*(1-Math.exp(-dt*2.8));
  this.bend+=(clamp(this.rate/1.05,-1,1)-this.bend)*(1-Math.exp(-dt*5));
  this.bank+=(-this.rate*.07-this.bank)*(1-Math.exp(-dt*3));
  return this;
 }
}
