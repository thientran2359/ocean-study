import * as T from './assets/three.js';
import {createClownfish,loadMeshyAsset} from './nemo-meshy-model.js?v=arc-turn-4';
import {NemoLife} from './nemo-life.js';
import {NemoSteering,turnRouteTarget} from './nemo-steering.js?v=arc-turn-4';
import {NemoSwim} from './nemo-swim.js';
const canvas=document.querySelector('#fish'),stage=document.querySelector('#stage');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduce.matches,mode='inspect',speed=1,clock=0,modeStart=0;
const descriptions={inspect:'Xem ngoại hình đứng yên. Kéo để xoay cá, hoặc chọn góc nhìn bên dưới.',auto:'Quan sát, khám phá, gặp bạn cá và nghỉ bên hải quỳ. Đưa chuột gần để Nemo chú ý.',hover:'Cá dập dềnh lên xuống nhẹ, vây ngực đẩy rồi thả trôi theo nhịp.',cruise:'Cá bơi theo đường cong ngẫu nhiên, nhấp nhô và lướt giữa những nhịp quẫy.',turn:'Đầu dẫn hướng, thân uốn theo rồi đuôi hoàn tất vòng quay.'};
const pause=document.querySelector('#pause');function updatePause(){pause.textContent=paused?'Tiếp tục':'Tạm dừng';pause.setAttribute('aria-pressed',String(paused));}updatePause();pause.onclick=()=>{paused=!paused;updatePause();};reduce.addEventListener('change',e=>{paused=e.matches;updatePause();});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;modeStart=clock;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelector('#behavior').textContent=descriptions[mode];});
document.querySelector('#speed').oninput=e=>{speed=Number(e.target.value);document.querySelector('#speed-value').textContent=speed.toFixed(2)+'×';};
try{
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.1,100);
 scene.add(new T.HemisphereLight('#e6edf1','#314452',1.05));const sun=new T.DirectionalLight('#ffe5c9',1.4);sun.position.set(-3,5,5);scene.add(sun);const rim=new T.DirectionalLight('#91b8ca',.35);rim.position.set(2,1,-4);scene.add(rim);
 const skin=await loadMeshyAsset();
 const model=createClownfish(skin);scene.add(model.group);
 const life=new NemoLife(),companion=createClownfish(skin);companion.group.scale.setScalar(.32);scene.add(companion.group);
 const texture=await new T.TextureLoader().loadAsync('assets/anemone.png');texture.colorSpace=T.SRGBColorSpace;
 const reef=new T.Mesh(new T.PlaneGeometry(1.55,1.55*texture.image.height/texture.image.width),new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.2,side:T.DoubleSide}));reef.position.set(-1.3,-.6,.14);scene.add(reef);
 const pointer={active:false,x:0,y:0,speed:0,distance:99,stamp:0},ray=new T.Raycaster(),ndc=new T.Vector2(),point=new T.Vector3(),plane=new T.Plane(new T.Vector3(0,0,1),0);let gazeX=0,gazeY=0,lastReaction='';
 const reactions={observe:'Nemo đang quan sát',wander:'Nemo đi khám phá',meet:'Nemo ghé chào bạn cá',hide:'Nemo nghỉ sau hải quỳ',curious:'Nemo đang tò mò',evade:'Nemo né nhẹ rồi bình tĩnh lại',greet:'Nemo quay lại chào bạn'};
 function setReaction(v){if(v!==lastReaction){document.querySelector('#reaction').textContent=v;lastReaction=v;}}
 function greet(){if(paused)return;if(mode!=='auto'){document.querySelector('[data-mode="auto"]').click();}life.touch();}
 document.querySelector('#greet').onclick=greet;
 function track(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);if(!ray.ray.intersectPlane(plane,point))return;const now=performance.now();const dt=Math.max(.016,(now-pointer.stamp)/1000);pointer.speed=pointer.active?Math.min(12,Math.hypot(point.x-pointer.x,point.y-pointer.y)/dt):0;pointer.x=point.x;pointer.y=point.y;pointer.stamp=now;pointer.active=true;}
const steering=new NemoSteering(),swim=new NemoSwim(),targetPosition=new T.Vector3();let holding=false,baseY=0;
 let azimuth=.2,elevation=.13,distance=4,drag=null;
 function reset(){azimuth=.2;elevation=.13;distance=innerWidth<600?4.5:4;}reset();azimuth=0;elevation=0;document.querySelector('#reset').onclick=reset;
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{document.querySelector('[data-mode="inspect"]').click();azimuth=Number(b.dataset.view);elevation=0;distance=innerWidth<600?4.5:4;});
 canvas.addEventListener('pointerdown',e=>{track(e);drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{track(e);if(!drag)return;drag.moved=drag.moved||Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6;azimuth-=(e.clientX-drag.x)*.007;elevation=T.MathUtils.clamp(elevation+(e.clientY-drag.y)*.006,-.85,.85);drag.x=e.clientX;drag.y=e.clientY;});
 canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){track(e);scene.updateMatrixWorld(true);ray.setFromCamera(ndc,camera);if(ray.intersectObject(model.group,true).length)greet();}drag=null;if(e.pointerType==='touch')pointer.active=false;});
 for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{drag=null;pointer.active=false;});canvas.addEventListener('pointerleave',()=>pointer.active=false);
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.004,3.2,8);},{passive:false});
 const ro=new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();});ro.observe(stage);
 let previous=performance.now(),phase=0;
 function render(now){requestAnimationFrame(render);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;
  reef.visible=companion.group.visible=mode==='auto';
  if(mode==='inspect'){model.group.position.set(0,0,0);model.group.rotation.set(0,0,0);model.group.scale.setScalar(1);model.animate(0,0,0,{delta:1,breathTime:0,static:true});steering.yaw=steering.bodyYaw=0;steering.rate=steering.speed=steering.bend=steering.tailBend=steering.bank=steering.brake=steering.kick=steering.headLead=steering.pectoralBias=0;steering.turnLoaded=false;baseY=0;setReaction('Nemo · model Meshy đã duyệt');}
  else if(!paused){clock+=dt*speed;const t=clock-modeStart;let yaw=.18,roll=0,effort=.42,brake=0;let look=null,greeting=false,quiet=false;reef.visible=companion.group.visible=mode==='auto';targetPosition.set(0,Math.sin(clock*.85)*.045,0);
   if(mode==='auto'){
    pointer.distance=Math.hypot(pointer.x-model.group.position.x,pointer.y-model.group.position.y);if(now-pointer.stamp>150)pointer.speed=0;
    const result=life.tick(dt*speed,{pointer:pointer.active&&!drag?pointer:null,x:model.group.position.x,y:model.group.position.y});targetPosition.set(...result.goal);effort=result.effort;brake=result.brake;look=result.look;
    const dx=targetPosition.x-model.group.position.x,dz=targetPosition.z-model.group.position.z;
    const gap=Math.hypot(dx,dz);holding=holding?gap<.2:gap<.085;greeting=result.greet;quiet=result.state==='hide';
    yaw=greeting?Math.PI/2:!holding?Math.atan2(dz,-dx):steering.yaw;
    if(result.state==='curious')yaw+=T.MathUtils.clamp((pointer.x-model.group.position.x)*.15,-.2,.2);
    companion.group.position.set(-1.33+Math.sin(clock*.48)*.12,-.32+Math.sin(clock*.7)*.055,.34);companion.group.rotation.y=Math.PI+.18+Math.sin(clock*.35)*.17;companion.animate(phase+2.3,.32,.1,{breathTime:clock+2,gazeX:.3,delta:dt*speed});
    setReaction(reactions[result.state]);
   }else setReaction(descriptions[mode]);
   if(mode==='hover'){yaw=.18+Math.sin(clock*.32)*.12;roll=Math.sin(clock*.75)*.025;}
   if(mode==='cruise'){const a=t*.42;targetPosition.set(Math.sin(a)*1.05,Math.sin(a*1.6)*.12,Math.cos(a)*.35);const vx=Math.cos(a)*1.05*.42,vz=-Math.sin(a)*.35*.42;yaw=Math.atan2(vz,-vx);roll=Math.sin(a)*.06;effort=.62+.32*(.5+.5*Math.sin(clock*1.5));}
   if(mode==='turn'){const next=turnRouteTarget(model.group.position.x,model.group.position.z);targetPosition.set(next.x,Math.sin(t*.45)*.04,next.z);effort=.55;}
   if(mode==='turn'||mode==='cruise'){const dx=targetPosition.x-model.group.position.x,dz=targetPosition.z-model.group.position.z;if(Math.hypot(dx,dz)>.08)yaw=Math.atan2(dz,-dx);else yaw=steering.yaw;}
   const step=dt*speed,gap=targetPosition.distanceTo(model.group.position);
   const travel=mode!=='hover'&&!greeting&&!(mode==='auto'&&holding);
   const drift=swim.tick(step,{travel,distance:gap,quiet});
   const motion=steering.tick(step,yaw+(mode==='turn'?0:drift.yaw),mode==='turn'?2:gap,{travel,effort:effort*drift.pulse});
   model.group.rotation.set(0,motion.bodyYaw,roll+motion.bank+drift.pitch,'YXZ');
   model.group.position.x-=Math.cos(motion.bodyYaw)*motion.speed*step;
   model.group.position.z+=Math.sin(motion.bodyYaw)*motion.speed*step;
   baseY+=(targetPosition.y-baseY)*(1-Math.exp(-step*1.6));
   model.group.position.y=baseY+drift.bob;
   brake=Math.max(brake,motion.brake);effort*=(1-Math.abs(motion.bend)*.25)*drift.pulse;effort+=motion.kick*.35;
   phase+=step*(.65+effort*.7);const hasLook=!!look||(pointer.active&&!drag);const localLook=look?model.group.worldToLocal(new T.Vector3(look[0],look[1],.35)):pointer.active&&!drag?model.group.worldToLocal(new T.Vector3(pointer.x,pointer.y,.35)):new T.Vector3();gazeX+=((hasLook?T.MathUtils.clamp((localLook.x+.8)*1.3,-1,1):0)-gazeX)*(1-Math.exp(-dt*5));gazeY+=((hasLook?T.MathUtils.clamp((localLook.y-.1)*1.8,-1,1):0)-gazeY)*(1-Math.exp(-dt*5));model.animate(phase,effort,motion.tailBend,{breathTime:clock,gazeX,gazeY,brake,headLead:motion.headLead,tailDrive:motion.kick,pectoralBias:motion.pectoralBias,stroke:motion.stroke,delta:step});const size=mode==='auto'?.65:1;model.group.scale.lerp(new T.Vector3(size,size,size),1-Math.exp(-dt*3));
  }
  camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*distance,Math.sin(elevation)*distance,Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(0,0,0);renderer.render(scene,camera);
 }model.group.scale.setScalar(.65);companion.group.position.set(-1.33,-.32,.34);model.animate(0,.4,0);requestAnimationFrame(render);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#error').hidden=false;});
}catch(e){console.error(e);document.querySelector('#error').hidden=false;}
