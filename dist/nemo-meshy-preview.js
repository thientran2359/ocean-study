import * as T from './assets/three.js';
const canvas=document.querySelector('canvas'),status=document.querySelector('#status');
try {
 const buffer=await (await fetch('assets/nemo-meshy-colored.glb?v=original-reference-4')).arrayBuffer(),dv=new DataView(buffer);
 const jsonSize=dv.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonSize)));
 const binStart=28+jsonSize,primitives=doc.meshes[0].primitives;
 function attr(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],offset=binStart+(v.byteOffset||0)+(a.byteOffset||0),size={VEC2:2,VEC3:3,VEC4:4,SCALAR:1}[a.type];return new T.BufferAttribute(a.componentType===5125?new Uint32Array(buffer,offset,a.count*size):new Float32Array(buffer,offset,a.count*size),size);}
 const imageView=doc.bufferViews[doc.images[0].bufferView],url=URL.createObjectURL(new Blob([new Uint8Array(buffer,binStart+imageView.byteOffset,imageView.byteLength)],{type:'image/png'}));
 const texture=await new T.TextureLoader().loadAsync(url);URL.revokeObjectURL(url);texture.flipY=false;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
 const fish=new T.Group();let triangleCount=0;
 for(const primitive of primitives){const geo=new T.BufferGeometry();geo.setAttribute('position',attr(primitive.attributes.POSITION));geo.setAttribute('uv',attr(primitive.attributes.TEXCOORD_0));geo.setAttribute('normal',attr(primitive.attributes.NORMAL));geo.setIndex(attr(primitive.indices));triangleCount+=geo.index.count/3;
 const colored=primitive.attributes.COLOR_0!==undefined;if(colored)geo.setAttribute('color',attr(primitive.attributes.COLOR_0));
 fish.add(new T.Mesh(geo,new T.MeshBasicMaterial({map:colored?null:texture,side:T.DoubleSide,vertexColors:colored,toneMapped:false})));}
 const scene=new T.Scene();scene.add(fish);scene.add(new T.HemisphereLight(0xffffff,0x718294,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(-2,3,5);scene.add(light);
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
 const camera=new T.PerspectiveCamera(35,1,.01,100);let az=0,el=0,distance=3.2,drag;
 document.querySelectorAll('button').forEach(b=>b.onclick=()=>{az=Number(b.dataset.angle);el=0;});
 canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=()=>{drag=null;};canvas.onpointercancel=()=>{drag=null;};canvas.onpointermove=e=>{if(drag){az-=(e.clientX-drag[0])*.008;el=T.MathUtils.clamp(el+(e.clientY-drag[1])*.008,-1.3,1.3);drag=[e.clientX,e.clientY];}};
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.003,2.4,7);},{passive:false});
 function draw(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();camera.position.set(Math.sin(az)*Math.cos(el)*distance,Math.sin(el)*distance,Math.cos(az)*Math.cos(el)*distance);camera.lookAt(0,0,0);renderer.render(scene,camera);requestAnimationFrame(draw);}draw();
 status.textContent=`${doc.accessors[primitives[0].attributes.POSITION].count.toLocaleString('vi-VN')} đỉnh · ${triangleCount.toLocaleString('vi-VN')} tam giác · texture gốc nhúng trong GLB`;
}catch(error){status.textContent='Không tải được model: '+error.message;console.error(error);}
