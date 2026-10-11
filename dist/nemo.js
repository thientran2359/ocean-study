import * as T from './assets/three.js';
import {createClownfish} from './nemo-model.js';
const canvas=document.querySelector('#fish'),stage=document.querySelector('#stage');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduce.matches,mode='hover',speed=1,clock=0,modeStart=0;
const descriptions={hover:'Vây ngực giữ thăng bằng. Đuôi quẫy nhẹ, thân trôi theo nước.',cruise:'Quẫy đuôi, tăng tốc rồi lướt. Cá nghiêng thân theo đường bơi.',turn:'Đầu dẫn hướng, thân uốn theo rồi đuôi hoàn tất vòng quay.'};
const pause=document.querySelector('#pause');function updatePause(){pause.textContent=paused?'Tiếp tục':'Tạm dừng';pause.setAttribute('aria-pressed',String(paused));}updatePause();pause.onclick=()=>{paused=!paused;updatePause();};reduce.addEventListener('change',e=>{paused=e.matches;updatePause();});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;modeStart=clock;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelector('#behavior').textContent=descriptions[mode];});
document.querySelector('#speed').oninput=e=>{speed=Number(e.target.value);document.querySelector('#speed-value').textContent=speed.toFixed(2)+'×';};
try{
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.1,100);
 scene.add(new T.HemisphereLight('#d4eaff','#183446',2));const sun=new T.DirectionalLight('#ffdfb7',3);sun.position.set(-3,5,5);scene.add(sun);const rim=new T.DirectionalLight('#7eb2d3',1.5);rim.position.set(2,1,-4);scene.add(rim);
 const model=createClownfish();scene.add(model.group);const targetQuaternion=new T.Quaternion(),targetPosition=new T.Vector3();
 let azimuth=.2,elevation=.13,distance=5.5,drag=null;
 function reset(){azimuth=.2;elevation=.13;distance=innerWidth<600?6.5:5.5;}reset();document.querySelector('#reset').onclick=reset;
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;azimuth-=(e.clientX-drag.x)*.007;elevation=T.MathUtils.clamp(elevation+(e.clientY-drag.y)*.006,-.85,.85);drag={x:e.clientX,y:e.clientY};});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>drag=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.004,3.2,8);},{passive:false});
 const ro=new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();});ro.observe(stage);
 let previous=performance.now(),phase=0;
 function render(now){requestAnimationFrame(render);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;
  if(!paused){clock+=dt*speed;const t=clock-modeStart;let yaw=.18,roll=0,effort=.42;targetPosition.set(0,Math.sin(clock*.85)*.045,0);
   if(mode==='hover'){yaw=.18+Math.sin(clock*.32)*.12;roll=Math.sin(clock*.75)*.025;}
   if(mode==='cruise'){const a=t*.42;targetPosition.set(Math.sin(a)*1.05,Math.sin(a*1.6)*.12,Math.cos(a)*.35);const vx=Math.cos(a)*1.05*.42,vz=-Math.sin(a)*.35*.42;yaw=Math.atan2(vz,-vx);roll=Math.sin(a)*.06;effort=.62+.32*(.5+.5*Math.sin(clock*1.5));}
   if(mode==='turn'){const a=t*.55;yaw=.18+Math.PI*(1-Math.cos(a));targetPosition.set(Math.sin(a)*.3,Math.sin(a*1.4)*.09,Math.sin(a)*.15);roll=Math.sin(a)*.11;effort=.65+.2*Math.abs(Math.sin(a));}
   targetQuaternion.setFromEuler(new T.Euler(0,yaw,roll,'YXZ'));model.group.quaternion.slerp(targetQuaternion,1-Math.exp(-dt*2.8));model.group.position.lerp(targetPosition,1-Math.exp(-dt*2));phase+=dt*speed*(.65+effort*.7);model.animate(phase,effort,mode==='turn'?Math.sin(t*.55):0);
  }
  camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*distance,Math.sin(elevation)*distance,Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(0,0,0);renderer.render(scene,camera);
 }model.animate(0,.4,0);requestAnimationFrame(render);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#error').hidden=false;});
}catch(e){console.error(e);document.querySelector('#error').hidden=false;}
