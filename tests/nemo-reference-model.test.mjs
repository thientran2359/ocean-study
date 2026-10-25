import assert from 'node:assert/strict';
import {Vector3,Box3} from '../dist/assets/three.js';
import {createClownfish} from '../dist/nemo-reference-model.js';

const model=createClownfish();
let triangles=0;
model.group.traverse(object=>{
  if(!object.geometry)return;
  const g=object.geometry;
  for(const attribute of Object.values(g.attributes))
    assert([...attribute.array].every(Number.isFinite),'Finite geometry and UVs');
  for(const index of g.index?.array??[])
    assert(index<g.attributes.position.count,'Valid triangle indices');
  triangles+=(g.index?.count??0)/3;
});
assert(triangles<85000,'Keep the rebuild within a practical WebGL mesh budget');

const weights=model.body.geometry.getAttribute('skinWeight');
const positions=model.body.geometry.getAttribute('position');
for(let i=0;i<weights.count;i++)
  assert(Math.abs(weights.getX(i)+weights.getY(i)-1)<1e-6,'Normalized skin weights');
for(let i=0;i<weights.count;i++){
  const imageX=positions.getX(i)/.0018+630;
  if(imageX<329)assert(weights.getY(i)===0,'Face remains on the rigid head with its eyes');
}

// Explicit proportions of the source drawing, independent of model helpers.
model.body.geometry.computeBoundingBox();
const box=model.body.geometry.boundingBox;
assert(Math.abs(box.min.x-(-1.0332))<1e-5);
assert(Math.abs(box.max.x-1.062)<1e-5);
assert(box.max.y>.44 && box.max.y<.47,'Dorsal shoulder height follows source');
assert(box.min.y<-.40 && box.min.y>-.43,'Ventral contour is tucked rather than swollen');
assert(box.max.z>.17 && box.max.z<.185,'Slimmer body retains real volume');

const v=new Vector3();
const finRoots=[];
model.group.traverse(o=>{if(o.userData.anchor)finRoots.push(o);});
assert(finRoots.length===7,'All independent fins have skin-following roots');
const expectedRoot=new Vector3(),actualRoot=new Vector3();
for(const fps of [30,60,144]){
  for(let frame=0;frame<fps*10;frame++){
    const t=frame/fps;
    model.animate(t,.8,Math.sin(t),{delta:1/fps,gazeX:Math.sin(t),gazeY:.3});
    model.group.updateMatrixWorld(true);model.body.skeleton.update();
    for(const fin of finRoots){
      expectedRoot.copy(fin.userData.anchor);
      model.body.applyBoneTransform(fin.userData.skinVertex,expectedRoot);
      model.body.localToWorld(expectedRoot);fin.getWorldPosition(actualRoot);
      assert(actualRoot.distanceTo(expectedRoot)<1e-5,'Fin root follows skin during turns');
    }
    for(let i=0;i<model.body.geometry.attributes.position.count;i+=211){
      model.body.getVertexPosition(i,v);
      assert([v.x,v.y,v.z].every(Number.isFinite),'Finite deformed vertices');
      assert(v.length()<2,'Bounded skin deformation during turns');
    }
  }
}
model.animate(0,0,0,{static:true,delta:1});
for(const bone of model.bones)assert(bone.rotation.toArray().slice(0,3).every(x=>x===0));
model.group.updateMatrixWorld(true);
assert(new Box3().setFromObject(model.group).getSize(v).z>.34);
console.log(`PASS: reference silhouette, ${triangles} triangles, volume, skinning, static pose, 30/60/144 fps`);
