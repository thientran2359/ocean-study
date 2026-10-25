import * as T from './assets/three.js';
import {buildMotionWeights,MOTION_DECLARATIONS,MOTION_VERTEX} from './nemo-meshy-motion.js?v=arc-turn-4';

// Reader for our exported GLB (embedded PNG, float attributes, uint32 indices).
export function parseMeshyGLB(buffer){
 const view=new DataView(buffer);
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw new Error('GLB Nemo khÃ´ng há»£p lá»‡');
 const jsonSize=view.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonSize))),binStart=28+jsonSize;
 function attribute(index){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],offset=binStart+(v.byteOffset||0)+(a.byteOffset||0),size={VEC2:2,VEC3:3,VEC4:4,SCALAR:1}[a.type];
  if(!size||![5125,5126].includes(a.componentType)||v.byteStride)throw new Error('Thuá»™c tÃ­nh GLB chÆ°a há»— trá»£');
  return new T.BufferAttribute(a.componentType===5125?new Uint32Array(buffer,offset,a.count*size):new Float32Array(buffer,offset,a.count*size),size);
 }
 const parts=doc.meshes[0].primitives.map(p=>{
  const geometry=new T.BufferGeometry();
  for(const [source,target] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',COLOR_0:'color'}))if(p.attributes[source]!==undefined)geometry.setAttribute(target,attribute(p.attributes[source]));
  geometry.setIndex(attribute(p.indices));geometry.computeBoundingSphere();geometry.boundingSphere.radius+=1;
  return {geometry,colored:p.attributes.COLOR_0!==undefined};
 });
 const imageView=doc.bufferViews[doc.images[0].bufferView];
 return {parts,image:new Uint8Array(buffer,binStart+imageView.byteOffset,imageView.byteLength)};
}

export async function loadMeshyAsset(){
 const response=await fetch('assets/nemo-meshy-colored.glb?v=original-reference-4');
 if(!response.ok)throw new Error(`KhÃ´ng táº£i Ä‘Æ°á»£c Nemo GLB (${response.status})`);
 const asset=parseMeshyGLB(await response.arrayBuffer()),url=URL.createObjectURL(new Blob([asset.image],{type:'image/png'}));
 try{asset.texture=await new T.TextureLoader().loadAsync(url);}finally{URL.revokeObjectURL(url);}
 asset.texture.flipY=false;asset.texture.colorSpace=T.SRGBColorSpace;asset.texture.anisotropy=8;
 return asset;
}

export function createClownfish(asset){
 const group=new T.Group();group.name='Nemo-Meshy-approved';
 const motion={phase:{value:0},stroke:{value:0},effort:{value:0},turn:{value:0},active:{value:0},breath:{value:0},headLead:{value:0},tailDrive:{value:0},fins:{value:new T.Vector4()},pectorals:{value:new T.Vector2()},gaze:{value:new T.Vector2()}};
 function movingMaterial(options,cavity=false){
  const material=new T.MeshBasicMaterial({side:T.DoubleSide,toneMapped:false,...options});
  material.onBeforeCompile=shader=>{
   shader.uniforms.nemoPhase=motion.phase;shader.uniforms.nemoEffort=motion.effort;shader.uniforms.nemoTurn=motion.turn;
   shader.uniforms.nemoActive=motion.active;shader.uniforms.nemoBreath=motion.breath;shader.uniforms.nemoFins=motion.fins;shader.uniforms.nemoPectorals=motion.pectorals;shader.uniforms.nemoGaze=motion.gaze;shader.uniforms.nemoCavity={value:cavity?1:0};
   shader.uniforms.nemoHeadLead=motion.headLead;shader.uniforms.nemoTailDrive=motion.tailDrive;
   shader.uniforms.nemoStroke=motion.stroke;
   shader.vertexShader=MOTION_DECLARATIONS+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',MOTION_VERTEX);
  };
  material.customProgramCacheKey=()=>`mesh-arc-turn-4-${cavity?'oral':options.vertexColors?'cap':'reference'}`;
  return material;
 }
 for(const part of asset.parts){
  if(!part.geometry.hasAttribute('nemoFinWeights')){
   const weights=buildMotionWeights(part.geometry.attributes.position,part.geometry.attributes.uv);
   part.geometry.setAttribute('nemoFinWeights',weights.fins);part.geometry.setAttribute('nemoFaceWeights',weights.face);part.geometry.setAttribute('nemoPectoralWeight',weights.pectoral);
  }
  const material=movingMaterial({map:part.colored?null:asset.texture,vertexColors:part.colored});
  group.add(new T.Mesh(part.geometry,material));
 }
 const mouthGeometry=new T.SphereGeometry(1,24,12);mouthGeometry.scale(.004,.014,.026);mouthGeometry.translate(-1.003,-.024,0);
 mouthGeometry.setAttribute('nemoFinWeights',new T.BufferAttribute(new Float32Array(mouthGeometry.attributes.position.count*4),4));mouthGeometry.setAttribute('nemoFaceWeights',new T.BufferAttribute(new Float32Array(mouthGeometry.attributes.position.count*4),4));mouthGeometry.setAttribute('nemoPectoralWeight',new T.BufferAttribute(new Float32Array(mouthGeometry.attributes.position.count),1));
 mouthGeometry.computeBoundingSphere();mouthGeometry.boundingSphere.radius+=1;
 const mouth=new T.Mesh(mouthGeometry,movingMaterial({color:'#28120b'},true));mouth.name='oral-interior';group.add(mouth);
 let breathPhase=0;
 function animate(phase,effort=1,turn=0,life={}){
  const still=!!life.static;
  const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
  const delta=T.MathUtils.clamp(finite(life.delta,1/60),0,.1),blend=1-Math.exp(-delta*10);
  motion.phase.value=Number.isFinite(phase)?phase:0;
  motion.stroke.value=still?0:finite(life.stroke,motion.phase.value*8);
  motion.effort.value=still?0:T.MathUtils.lerp(motion.effort.value,T.MathUtils.clamp(finite(effort),0,1.4),blend);
  motion.turn.value=still?0:T.MathUtils.lerp(motion.turn.value,T.MathUtils.clamp(finite(turn),-1,1),blend);
  motion.headLead.value=still?0:T.MathUtils.lerp(motion.headLead.value,T.MathUtils.clamp(finite(life.headLead),-.45,.45),blend);
  motion.tailDrive.value=still?0:T.MathUtils.lerp(motion.tailDrive.value,T.MathUtils.clamp(finite(life.tailDrive),0,1),blend);
  motion.active.value=still?0:1;mouth.visible=!still;
  // Integrate breathing phase: changing effort must not jump the mouth/gills
  // to a different phase after the scene has run for a long time.
  breathPhase=still?0:breathPhase+delta*(2.6+motion.effort.value*.8);
  const breath=.5+.5*Math.sin(breathPhase);
  motion.breath.value=still?0:breath;
  const t=motion.phase.value,e=motion.effort.value,brake=T.MathUtils.clamp(finite(life.brake),0,1),activity=.65+.35*Math.min(e,1);
  motion.fins.value.set(still?0:.036*Math.sin(t*4.6)*activity,still?0:.055*Math.sin(t*5.2-.9)*activity,still?0:.052*Math.sin(t*5.0-1.8)*activity,still?0:.048*Math.sin(t*7.5+1.2)*activity);
  const bias=T.MathUtils.clamp(finite(life.pectoralBias),-1,1);
  const stroke=motion.stroke.value;
  motion.pectorals.value.set(still?0:T.MathUtils.clamp(.16+bias*.15+(.30+brake*.20)*Math.sin(stroke)*activity*(1+bias*.35),-.4,.8),still?0:T.MathUtils.clamp(.16-bias*.15+(.30+brake*.20)*Math.sin(stroke+.9)*activity*(1-bias*.35),-.4,.8));
  motion.gaze.value.set(still?0:T.MathUtils.lerp(motion.gaze.value.x,T.MathUtils.clamp(finite(life.gazeX),-1,1),blend),still?0:T.MathUtils.lerp(motion.gaze.value.y,T.MathUtils.clamp(finite(life.gazeY),-1,1),blend));
 }
 animate(0,0,0,{static:true});
 return {group,animate,motion,mouth};
}
