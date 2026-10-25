import * as T from './assets/three.js';
const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const window=(a,b,c,d,x)=>smooth(a,b,x)*(1-smooth(c,d,x));
const ellipse=(x,y,cx,cy,rx,ry)=>1-smooth(.55,1.25,Math.hypot((x-cx)/rx,(y-cy)/ry));

// Soft attachment weights derived from the approved image and mesh depth.
// Fin roots stay attached; only the outer pectoral layers move off the torso.
export function buildMotionWeights(position,uv){
 const fins=new Float32Array(position.count*4),face=new Float32Array(position.count*4),pectoral=new Float32Array(position.count);
 for(let i=0;i<position.count;i++){
  const px=uv.getX(i)*562,py=uv.getY(i)*378,z=position.getZ(i),side=smooth(.065,.105,Math.abs(z));
  fins[i*4]=window(152,177,252,271,px)*smooth(0,50,107-.13*(px-190)-py);
  fins[i*4+1]=window(275,301,399,413,px)*smooth(0,57,152-.06*(px-330)-py);
  fins[i*4+2]=window(265,289,389,406,px)*smooth(0,55,py-(232-.05*(px-330)));
  fins[i*4+3]=window(145,166,226,244,px)*smooth(0,55,py-255);
  pectoral[i]=ellipse(px,py,199,207,42,37)*smooth(.102,.127,Math.abs(z))*smooth(161,199,px);
  // The pupil moves inside the iris; the larger painted socket stays anchored.
  face[i*4]=ellipse(px,py,76,156,10,11)*side;
  face[i*4+1]=ellipse(px,py,151,209,15,44)*side;
  face[i*4+2]=ellipse(px,py,31,190,23,29)*(1-smooth(.025,.07,Math.abs(z)));
  face[i*4+3]=smooth(184,198,py);
 }
 return {fins:new T.BufferAttribute(fins,4),face:new T.BufferAttribute(face,4),pectoral:new T.BufferAttribute(pectoral,1)};
}

export const MOTION_DECLARATIONS=`
uniform float nemoPhase, nemoEffort, nemoTurn, nemoActive, nemoBreath, nemoCavity, nemoHeadLead, nemoTailDrive, nemoStroke;
uniform vec4 nemoFins;
uniform vec2 nemoPectorals, nemoGaze;
attribute vec4 nemoFinWeights, nemoFaceWeights;
attribute float nemoPectoralWeight;
vec3 nemoBend(vec3 p) {
 float q=clamp((p.x+1.0)*0.5,0.0,1.0);
 float wave=nemoPhase*6.0-q*4.0;
 float amplitude=(0.025+0.21*q*q)*nemoEffort;
 float curve=amplitude*sin(wave)-0.42*nemoTurn*q*q+0.20*nemoHeadLead*(1.0-q)*(1.0-q);
 float slope=0.21*q*nemoEffort*sin(wave)-2.0*amplitude*cos(wave)-0.42*nemoTurn*q-0.20*nemoHeadLead*(1.0-q);
 float angle=atan(slope);
 p.x-=sin(angle)*p.z + 0.08*nemoTurn*nemoTurn*q*q;
 p.z=cos(angle)*p.z+curve;
 return p;
}
`;

export const MOTION_VERTEX=`
#include <begin_vertex>
vec3 p=position;
float side=position.z<0.0?-1.0:1.0;
// Median fins ripple independently rather than moving as one rigid silhouette.
float flutter=dot(nemoFinWeights,nemoFins);
p.z+=flutter;
p.x+=dot(nemoFinWeights,vec4(nemoFins.y,-nemoFins.x,nemoFins.w,-nemoFins.z))*0.22;
// Two pectoral hinges: different phases, softer distal bend, fixed roots.
float opening=side<0.0?nemoPectorals.x:nemoPectorals.y;
float angle=side*opening*nemoPectoralWeight;
vec2 wing=vec2(p.x+0.46,p.z-side*0.108);
p.x=-0.46+cos(angle)*wing.x-sin(angle)*wing.y;
p.z=side*0.108+sin(angle)*wing.x+cos(angle)*wing.y;
p.y+=0.016*nemoPectoralWeight*sin(nemoStroke+side*0.7)*nemoActive;
// The caudal hinge adds a delayed flick on top of the travelling body wave.
float tail= smoothstep(0.50,0.72,position.x);
float tailAngle=((0.26*nemoEffort+0.22*nemoTailDrive)*sin(nemoPhase*6.0-4.6)-0.16*nemoTurn)*tail;
vec2 caudal=vec2(p.x-0.53,p.z);
p.x=0.53+cos(tailAngle)*caudal.x-sin(tailAngle)*caudal.y;
p.z=sin(tailAngle)*caudal.x+cos(tailAngle)*caudal.y;
// Move the painted eye with its local surface; preserve the surrounding cheek.
p.x+=nemoFaceWeights.x*nemoGaze.x*0.011;
p.y+=nemoFaceWeights.x*nemoGaze.y*0.009;
p.z+=side*nemoFaceWeights.y*nemoBreath*0.008;
float jaw=nemoFaceWeights.z*nemoBreath;
p.y+=jaw*mix(0.004,-0.012,nemoFaceWeights.w);
p.x-=jaw*0.004;
// The dark oral interior is an accessory, hidden in the approved static pose.
if(nemoCavity>0.5){p.y=-0.024+(position.y+0.024)*(0.12+0.88*nemoBreath);}
transformed=nemoBend(p);
`;
