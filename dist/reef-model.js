import * as T from './assets/three.js';

function randomSource(seed=41){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}

// One merged mesh: separate soft stems, with anchored roots and phased tip motion.
export function createAnemone(){
 const random=randomSource(),positions=[],colors=[],weights=[],indices=[];
 const purple=new T.Color('#9771b4'),peach=new T.Color('#f2ae9e'),cream=new T.Color('#ffdbbb');
 const rings=20,sides=8,count=176;
 for(let i=0;i<count;i++){
  const angle=i*2.3999632297,radial=Math.sqrt((i+.5)/count);
  const rootRadius=.12+radial*.49,spread=.12+radial*.32;
  const length=.30+radial*.29+random()*.19;
  const root=new T.Vector3(Math.cos(angle)*rootRadius,-.13*radial,Math.sin(angle)*rootRadius*.72);
  const direction=new T.Vector3(Math.cos(angle),0,Math.sin(angle));
  const curve=new T.CubicBezierCurve3(root,
   root.clone().add(new T.Vector3(-direction.x*.06,length*.4,-direction.z*.06)),
   root.clone().add(new T.Vector3(direction.x*spread*.38,length*.92,direction.z*spread*.5)),
   root.clone().add(new T.Vector3(direction.x*spread,length*(1-radial*.20),direction.z*spread)));
  const frames=curve.computeFrenetFrames(rings,false),offset=positions.length/3,phase=random()*Math.PI*2;
  const thickness=.017+random()*.009;
  for(let j=0;j<=rings;j++){
   const u=j/rings,center=curve.getPointAt(u);
   // Small integrated bulb, then a rounded closed tip. Not a sphere on a rod.
   let radius=thickness*(1-.47*u)+thickness*.48*Math.exp(-(((u-.88)/.075)**2));
   if(j===rings)radius=.0005;
   const pigment=purple.clone().lerp(peach,T.MathUtils.smoothstep(u,0,.68)).lerp(cream,T.MathUtils.smoothstep(u,.75,1)*.85);
   for(let k=0;k<=sides;k++){
    const a=k/sides*Math.PI*2;
    const p=center.clone().addScaledVector(frames.normals[j],radius*Math.cos(a)).addScaledVector(frames.binormals[j],radius*Math.sin(a));
    positions.push(p.x,p.y,p.z);colors.push(pigment.r,pigment.g,pigment.b);weights.push(u,phase,radial);
    if(j<rings&&k<sides){const v=offset+j*(sides+1)+k;indices.push(v,v+sides+1,v+1,v+1,v+sides+1,v+sides+2);}
   }
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('sway',new T.Float32BufferAttribute(weights,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.18;
 const time={value:0};
 const material=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.48,metalness:0,clearcoat:.12,clearcoatRoughness:.6,side:T.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.uniforms.reefTime=time;
  shader.vertexShader='uniform float reefTime; attribute vec3 sway;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float flow=sin(reefTime*.72+sway.z*.7);
   float flutter=sin(reefTime*1.13+sway.y);
   transformed.x+=sway.x*sway.x*(.050*flow+.019*flutter);
   transformed.z+=sway.x*sway.x*(.034*cos(reefTime*.64+sway.z)+.012*cos(reefTime+sway.y));
   transformed.y+=.012*sway.x*sway.x*sin(reefTime*.83+sway.y);
  `);
 };
 material.customProgramCacheKey=()=> 'reef-anemone-1';
 const group=new T.Group();group.name='anemone';const tentacles=new T.Mesh(geometry,material);tentacles.name='176-soft-tentacles';group.add(tentacles);
 const base=new T.Mesh(new T.SphereGeometry(1,32,16),new T.MeshStandardMaterial({color:'#ac84b1',roughness:.8}));base.scale.set(.61,.16,.46);base.position.y=-.10;group.add(base);
 return {group,time,tentacles,count};
}

export function createReef(){
 const group=new T.Group();group.name='reef-rock';const random=randomSource(92);
 const rockMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.98,metalness:0});
 // A rising back wall and a low shelf; the anemone roots sit on the shelf.
 const rocks=[[-.25,-.96,.02,.93,.28,.58],[.52,-.78,-.36,.47,.49,.43],[.70,-.36,-.45,.34,.61,.34],[-.54,-.77,-.20,.47,.39,.42],[.08,-.52,-.04,.62,.32,.42],[-.80,-1.03,.35,.34,.17,.27],[.59,-1.04,.37,.37,.18,.28]];
 for(const [x,y,z,sx,sy,sz] of rocks){
  const geometry=new T.IcosahedronGeometry(1,4),p=geometry.attributes.position,pigment=[];
  for(let i=0;i<p.count;i++){
   const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i);
   const n=Math.sin(vx*13+vz*8)*Math.sin(vy*17-vx*5)*Math.cos(vz*19+vy*6);
   const fine=Math.sin(vx*57+vy*33)*Math.sin(vz*53-vy*29);
   const bump=1+.16*n+.035*fine;
   p.setXYZ(i,vx*bump*sx,vy*bump*sy,vz*bump*sz);
   const c=new T.Color('#526673').lerp(new T.Color('#a4acb3'),T.MathUtils.clamp(.45+vy*.22+n*.24,0,1));
   if(n>.40)c.lerp(new T.Color('#aa8296'),.30);
   pigment.push(c.r,c.g,c.b);
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(pigment,3));geometry.computeVertexNormals();
  const rock=new T.Mesh(geometry,rockMaterial);rock.position.set(x,y,z);group.add(rock);
 }
 // Smaller encrusting growths interrupt the large rock silhouette.
 const pebbleGeometry=new T.IcosahedronGeometry(1,1),pebbleMaterial=new T.MeshStandardMaterial({color:'#8f7e95',roughness:.95});
 const pebbles=new T.InstancedMesh(pebbleGeometry,pebbleMaterial,32),dummy=new T.Object3D();
 for(let i=0;i<32;i++){const a=random()*Math.PI*2,r=.30+random()*.50;dummy.position.set(Math.cos(a)*r,-.98+random()*.13,.20+Math.sin(a)*r*.5);dummy.scale.setScalar(.035+random()*.06);dummy.rotation.set(random()*3,random()*3,0);dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);}group.add(pebbles);
 return group;
}

// Tangent heading gives an actual swimming arc, never an in-place reversal.
export function sampleFishPath(time,index){
 const outer=index===0,a=time*(outer?.23:-.31)+(outer?2.3:.5);
 const rx=outer?1.06:.50,rz=outer?.70:.27,rate=outer?.23:-.31;
 const x=(outer?-.04:.10)+rx*Math.cos(a),z=(outer?.06:.52)+rz*Math.sin(a);
 const y=(outer?.58:.12)+(outer?.15:.065)*Math.sin(a*2+.4);
 const vx=-rx*Math.sin(a)*rate,vz=rz*Math.cos(a)*rate;
 const yaw=Math.atan2(vz,-vx);
 const turn=-rx*rz*rate/(rx*rx*Math.sin(a)**2+rz*rz*Math.cos(a)**2);
 return {x,y,z,yaw,turn};
}
