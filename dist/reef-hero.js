import * as T from './assets/three.js';
import {createClownfish,loadMeshyAsset} from './nemo-meshy-model.js?v=arc-turn-4';
import {createAnemone,createReef,sampleFishPath} from './reef-model.js?v=reef-hero-1';

export async function mountReefHero({stage,canvas,button,status}){
 let renderer,stopped=false,frameId=0,resize,observer,renderRequested=true;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,visible=true;
 const sync=()=>{button.textContent=paused?'Bật chuyển động':'Tạm dừng';button.setAttribute('aria-pressed',String(paused));};sync();
 function fallback(error){stopped=true;cancelAnimationFrame(frameId);stage.classList.remove('reef-ready');status.hidden=false;status.textContent='Góc đại dương đang hiển thị bằng ảnh tĩnh.';button.disabled=true;resize?.disconnect();observer?.disconnect();renderer?.dispose();console.warn('Reef hero fallback',error);}
 try{
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.20;renderer.setClearColor(0,0);
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1.8,1.8,1.8,-1.8,.1,30);
  camera.position.set(0,1.15,6);camera.lookAt(0,-.05,0);
  scene.add(new T.HemisphereLight('#fff1e8','#637b99',2.2));
  const key=new T.DirectionalLight('#fff0df',3.0);key.position.set(-3,5,4);scene.add(key);
  const fill=new T.DirectionalLight('#c3d6ff',1.8);fill.position.set(3,2,-2);scene.add(fill);
  const reef=createReef(),anemone=createAnemone();anemone.group.position.set(-.05,-.28,.23);scene.add(reef,anemone.group);
  // Transparent radial contact shadow, not a flat opaque floor under the scene.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(65,79,106,.24)');gradient.addColorStop(.6,'rgba(65,79,106,.10)');gradient.addColorStop(1,'rgba(65,79,106,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadow=new T.Mesh(new T.PlaneGeometry(3.2,1.7),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-1.23,.1);scene.add(shadow);
  const asset=await loadMeshyAsset();if(stopped)return;
  const fish=[createClownfish(asset),createClownfish(asset)];fish.forEach((f,i)=>{f.group.scale.setScalar(i===0?.25:.21);scene.add(f.group);});
  function fit(){const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height,halfHeight=Math.max(1.65,1.48/aspect);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();renderRequested=true;}
  resize=new ResizeObserver(fit);resize.observe(stage);fit();
  observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'80px'});observer.observe(stage);
  button.disabled=false;button.onclick=()=>{paused=!paused;sync();};
  reduced.addEventListener('change',e=>{paused=e.matches;sync();});
  let time=0,previous=performance.now(),dirty=true;
  const pointer=new T.Vector2();
  stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);});stage.addEventListener('pointerleave',()=>pointer.set(0,0));
  function draw(now){
   if(stopped)return;frameId=requestAnimationFrame(draw);const dt=Math.min(.04,(now-previous)/1000);previous=now;
   if(document.hidden||!visible)return;
   if(paused&&!dirty&&!renderRequested)return;
   if(!paused)time+=dt;
   if(!paused||dirty){
    anemone.time.value=time;
    fish.forEach((f,i)=>{const p=sampleFishPath(time,i);f.group.position.set(p.x,p.y,p.z);f.group.rotation.set(0,p.yaw,.035*Math.sin(time*.7+i),'YXZ');f.animate(time*(i===0?.83:.74)+i*2.6,.43+i*.04,p.turn*.55,{delta:dirty?0:dt,gazeX:pointer.x*.45,gazeY:pointer.y*.45,pectoralBias:p.turn*.4});});
    dirty=false;
   }
   renderer.render(scene,camera);renderRequested=false;
  }
  // Force shader compile/render before removing the static loading image.
  fish.forEach((f,i)=>{const p=sampleFishPath(0,i);f.group.position.set(p.x,p.y,p.z);f.group.rotation.y=p.yaw;});
  await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  stage.classList.add('reef-ready');status.hidden=true;frameId=requestAnimationFrame(draw);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback(new Error('WebGL context lost'));},{once:true});
 }catch(error){fallback(error);}
}
