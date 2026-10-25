import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/assets/three.js';
import {createAnemone,createReef,sampleFishPath} from '../dist/reef-model.js';

test('anemone has separate tapered stems with fixed roots and a bounded shared shader',()=>{
 const {tentacles,count,time}=createAnemone();
 assert.equal(count,176);
 const g=tentacles.geometry,p=g.attributes.position,s=g.attributes.sway;
 assert.equal(p.count,176*21*9);
 for(const attribute of Object.values(g.attributes))assert(attribute.array.every(Number.isFinite));
 assert(g.index.array.every(i=>i<p.count));
 for(let stem=0;stem<count;stem++){
  assert.equal(s.getX(stem*21*9),0);
  assert.equal(s.getX(stem*21*9+20*9),1);
 }
 const shader={uniforms:{},vertexShader:T.ShaderLib.physical.vertexShader};
 tentacles.material.onBeforeCompile(shader);
 assert.equal(shader.uniforms.reefTime,time);
 assert(shader.vertexShader.includes('transformed.x+=sway.x*sway.x'));
 assert(!shader.vertexShader.includes('undefined'));
});

test('reef geometry and both swimming paths fit desktop and mobile camera bounds',()=>{
 const reef=createReef(),anemone=createAnemone();anemone.group.position.set(-.05,-.28,.23);reef.add(anemone.group);reef.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(reef);
 for(const aspect of [680/650,430/530,340/430]){
  const h=Math.max(1.65,1.48/aspect),camera=new T.OrthographicCamera(-h*aspect,h*aspect,h,-h,.1,30);
  camera.position.set(0,1.15,6);camera.lookAt(0,-.05,0);camera.updateMatrixWorld(true);
  const check=point=>{const projected=point.project(camera);assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,'object remains inside hero canvas');};
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])check(new T.Vector3(x,y,z));
  for(let i=0;i<2;i++)for(let t=0;t<120;t+=.05){
   const p=sampleFishPath(t,i),next=sampleFishPath(t+.001,i);
   assert(Object.values(p).every(Number.isFinite));
   const vx=next.x-p.x,vz=next.z-p.z,speed=Math.hypot(vx,vz);
   assert(speed>.00008,'both fish keep swimming');
   assert((-Math.cos(p.yaw)*vx+Math.sin(p.yaw)*vz)/speed>.99999,'fish face along their route');
   const angle=Math.atan2(Math.sin(next.yaw-p.yaw),Math.cos(next.yaw-p.yaw));
   assert(Math.abs(angle)<.001,'no abrupt 180-degree turns');
   for(const dx of [-.29,.29])for(const dy of [-.16,.16])check(new T.Vector3(p.x+dx,p.y+dy,p.z));
  }
 }
});
