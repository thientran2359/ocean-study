import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../dist/assets/three.js';
import {parseMeshyGLB,createClownfish} from '../dist/nemo-meshy-model.js';

const bytes=await readFile(new URL('../dist/assets/nemo-meshy-colored.glb',import.meta.url));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
test('approved GLB retains texture, full geometry and separate inferred nose',()=>{
 const asset=parseMeshyGLB(buffer);
 assert.equal(asset.parts.length,2);
 assert.equal(asset.parts.reduce((n,p)=>n+p.geometry.index.count/3,0),274042);
 assert.deepEqual([...asset.image.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(asset.parts[0].colored,false);assert.equal(asset.parts[1].colored,true);
 for(const {geometry} of asset.parts){
  assert.equal(geometry.attributes.position.count,137023);
  for(const v of geometry.attributes.position.array)assert.ok(Number.isFinite(v));
  for(const i of geometry.index.array)assert.ok(i<137023);
 }
 assert.throws(()=>parseMeshyGLB(new ArrayBuffer(28)),/GLB/);
});
test('main fish and companion share assets but keep independent motion; inspection restores exact rest',()=>{
 const asset={...parseMeshyGLB(buffer),texture:new T.Texture()};
 const a=createClownfish(asset),b=createClownfish(asset);
 assert.equal(a.group.children[0].geometry,b.group.children[0].geometry);
 assert.notEqual(a.group.children[0].material,b.group.children[0].material);
 assert.equal(a.group.children[0].material.map,asset.texture);
 assert.equal(a.group.children[0].material.toneMapped,false);
 a.animate(10,.8,.5);assert.equal(b.motion.effort.value,0);assert.ok(a.motion.turn.value>0&&a.motion.turn.value<.5);
 a.animate(20,1,1,{static:true});assert.equal(a.motion.effort.value,0);assert.equal(a.motion.turn.value,0);
 a.animate(NaN,Infinity,Infinity);assert.equal(a.motion.phase.value,0);assert.equal(a.motion.effort.value,0);assert.equal(a.motion.turn.value,0);
});

test('fin and facial weights cover all intended regions and remain finite and bounded',()=>{
 const asset={...parseMeshyGLB(buffer),texture:new T.Texture()};
 createClownfish(asset);
 const g=asset.parts[0].geometry,fin=g.attributes.nemoFinWeights,face=g.attributes.nemoFaceWeights,pectoral=g.attributes.nemoPectoralWeight;
 for(const attr of [fin,face,pectoral])for(const weight of attr.array)assert.ok(Number.isFinite(weight)&&weight>=0&&weight<=1);
 for(let channel=0;channel<4;channel++){
  let maxFin=0,maxFace=0;
  for(let i=0;i<fin.count;i++){maxFin=Math.max(maxFin,fin.array[i*4+channel]);maxFace=Math.max(maxFace,face.array[i*4+channel]);}
  assert.ok(maxFin>.25,`fin region ${channel} missing`);assert.ok(maxFace>.25,`face region ${channel} missing`);
 }
 for(const sign of [-1,1]){
  let moving=0;
  for(let i=0;i<pectoral.count;i++)if(g.attributes.position.getZ(i)*sign>0&&pectoral.getX(i)>.25)moving++;
  assert.ok(moving>100,`pectoral ${sign} missing`);
 }
});

test('live motion has independent fin phases, breath and gaze; inspection resets every accessory',()=>{
 const a=createClownfish({...parseMeshyGLB(buffer),texture:new T.Texture()});
 a.animate(.7,.8,.5,{breathTime:.8,gazeX:1,gazeY:-1,brake:.5,headLead:.3,tailDrive:1,pectoralBias:1,stroke:2,delta:1/60});
 assert.equal(a.mouth.visible,true);assert.ok(a.motion.breath.value>0);
 assert.notEqual(a.motion.pectorals.value.x,a.motion.pectorals.value.y);
 assert.equal(new Set(a.motion.fins.value.toArray()).size,4);
 assert.ok(a.motion.gaze.value.x>0&&a.motion.gaze.value.y<0);
 assert.ok(a.motion.headLead.value>0);assert.ok(a.motion.tailDrive.value>0&&a.motion.tailDrive.value<1);
 assert.equal(a.motion.stroke.value,2);
 a.animate(0,0,0,{static:true});
 assert.equal(a.mouth.visible,false);assert.equal(a.motion.active.value,0);assert.equal(a.motion.breath.value,0);
 assert.equal(a.motion.headLead.value,0);assert.equal(a.motion.tailDrive.value,0);
 assert.equal(a.motion.stroke.value,0);
 assert.deepEqual(a.motion.fins.value.toArray(),[0,0,0,0]);assert.deepEqual(a.motion.pectorals.value.toArray(),[0,0]);assert.deepEqual(a.motion.gaze.value.toArray(),[0,0]);
 for(const child of a.group.children){
  const shader={uniforms:{},vertexShader:T.ShaderLib.basic.vertexShader};child.material.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes('transformed=nemoBend(p);'));
  assert.equal(shader.uniforms.nemoFins,a.motion.fins);assert.equal(shader.uniforms.nemoGaze,a.motion.gaze);
 }
});

test('frame rates give consistent smooth turn/gaze response and safe numeric states',()=>{
 for(const fps of [30,60,144]){
  const a=createClownfish({...parseMeshyGLB(buffer),texture:new T.Texture()});
  for(let i=0;i<fps;i++)a.animate(i/fps,.8,.7,{breathTime:i/fps,gazeX:1,gazeY:-1,delta:1/fps});
  assert.ok(Math.abs(a.motion.turn.value-.7)<.00005);
  assert.ok(Math.abs(a.motion.gaze.value.x-1)<.00005);
  a.animate(NaN,Infinity,NaN,{breathTime:Infinity,gazeX:NaN,gazeY:Infinity,brake:NaN,delta:NaN});
  for(const key of ['phase','effort','turn','active','breath'])assert.ok(Number.isFinite(a.motion[key].value));
  for(const key of ['fins','pectorals','gaze'])assert.ok(a.motion[key].value.toArray().every(Number.isFinite));
 }
});
