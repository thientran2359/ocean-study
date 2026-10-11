import * as THREE from './assets/three.js';
const $=s=>document.querySelector(s), data={fish:{name:'Cá hề',description:'Sắc cam, những dải trắng và một dáng bơi quen thuộc giữa các xúc tu hải quỳ.',detail:'Quan sát những dải trắng viền đen, chiếc vây nhỏ và cách cá hề di chuyển quanh hải quỳ. Đây là bản thử hình ảnh và chuyển động; hồ sơ sinh vật đầy đủ sẽ được bổ sung ở giai đoạn tiếp theo.'},anemone:{name:'Hải quỳ',description:'Những xúc tu mềm tạo thành một điểm nhấn yên bình trên rạn đá.',detail:'Trong khung cảnh này, hải quỳ là một đối tượng riêng, có chuyển động nhẹ độc lập với hai chú cá. Hồ sơ sinh vật đầy đủ sẽ được bổ sung ở giai đoạn tiếp theo.'}};
let selected='fish';const dialog=$('#detail');function show(title,body){$('#detail-title').textContent=title;$('#detail-body').textContent=body;dialog.showModal();}
document.querySelectorAll('[data-species]').forEach(b=>b.onclick=()=>{selected=b.dataset.species;$('#species-name').textContent=data[selected].name;$('#species-desc').textContent=data[selected].description;document.querySelectorAll('[data-species]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.species===selected)));});
$('#profile').onclick=()=>show(data[selected].name,data[selected].detail);
for(const id of ['about','about-hero'])$('#'+id).onclick=()=>show('Nhỏ bé nhưng diệu kỳ','Đại Dương Tí Hon là ý tưởng về một không gian café thủy sinh mini, nơi những câu chuyện về biển bắt đầu từ một bể cá nhỏ. Bản trải nghiệm này giới thiệu hai cảnh đầu của hành trình.');
dialog.querySelectorAll('.close,.close-bottom').forEach(b=>b.onclick=()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches;const motion=$('#motion');function syncMotion(){motion.textContent=paused?'Bật chuyển động':'Tạm dừng chuyển động';motion.setAttribute('aria-pressed',String(paused));}syncMotion();motion.onclick=()=>{paused=!paused;syncMotion();};reduced.addEventListener('change',e=>{paused=e.matches;syncMotion();});
let lastScroll=performance.now();addEventListener('scroll',()=>{lastScroll=performance.now();},{passive:true});
try{
 const renderer=new THREE.WebGLRenderer({canvas:$('#ocean'),alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,innerWidth,0,innerHeight,-100,100);camera.position.z=10;
 const loader=new THREE.TextureLoader();const [fishTexture,anemoneTexture]=await Promise.all([loader.loadAsync('assets/fish.png'),loader.loadAsync('assets/anemone.png')]);fishTexture.colorSpace=anemoneTexture.colorSpace=THREE.SRGBColorSpace;
 function actor(texture,kind){const geometry=new THREE.PlaneGeometry(1,1,40,24);const base=geometry.attributes.position.array.slice();const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false});const mesh=new THREE.Mesh(geometry,material);mesh.userData={base,kind};scene.add(mesh);return mesh;}
 const anemone=actor(anemoneTexture,'anemone'),resident=actor(fishTexture,'fish'),hero=actor(fishTexture,'fish');anemone.renderOrder=1;resident.renderOrder=2;hero.renderOrder=3;
 const progress={value:0};if(window.gsap&&window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);gsap.to(progress,{value:1,ease:'none',scrollTrigger:{trigger:'#encounter',start:'top bottom',end:'top top',scrub:.65}});}
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.right=innerWidth;camera.bottom=innerHeight;camera.updateProjectionMatrix();}resize();addEventListener('resize',resize);
 // A traveling body wave: head held steady, energy grows toward the tail.
 function deform(mesh,phase,effort){
  const a=mesh.geometry.attributes.position,b=mesh.userData.base;
  for(let i=0;i<a.count;i++){
   const x=b[i*3],y=b[i*3+1];
   if(mesh.userData.kind==='fish'){
    const u=Math.max(0,Math.min(1,(x+.36)/.86));
    const amplitude=(.004+.045*u*u)*effort;
    const wave=Math.sin(phase-u*5.1),fin=Math.exp(-((x+.07)**2/.014+(y+.12)**2/.022));
    const finBeat=Math.sin(phase*1.7+.9)*.012*fin;
    a.setXYZ(i,x+Math.cos(phase-u*4)*.009*u*u*effort,y+wave*amplitude+finBeat,Math.cos(phase-u*5.1)*.055*u*u*effort);
   }else{
    const top=Math.max(0,y+.4);
    a.setXYZ(i,x+Math.sin(phase*1.15+y*6+x*5)*.012*top,y,0);
   }
  }a.needsUpdate=true;
 }
 const swimmers=[{phase:0,yaw:0,pitch:0,effort:.5},{phase:2.4,yaw:Math.PI,pitch:0,effort:.45}];
 function swim(mesh,state,width,x,y,vx,vy,dt,effort,depth){
  if(!paused){
   state.effort+=(effort-state.effort)*(1-Math.exp(-dt*3));
   // Slow turns into the new heading instead of reversing the image instantly.
   if(Math.abs(vx)>1.5){const target=vx>0?Math.PI:0;state.yaw+=(target-state.yaw)*(1-Math.exp(-dt*2.5));}
   const targetPitch=Math.max(-.16,Math.min(.16,Math.atan2(vy,Math.abs(vx)+18)*(vx>0?1:-1)));
   state.pitch+=(targetPitch-state.pitch)*(1-Math.exp(-dt*3));
   state.phase+=dt*(3.2+state.effort*4.5);
  }
  mesh.position.set(x,y,2+depth);
  // Smooth foreshortening through each turn; the source remains a painted plane.
  const facing=Math.cos(state.yaw),turn=Math.sin(state.yaw);
  const sx=facing;
  mesh.scale.set(width*sx,-width*fishTexture.image.height/fishTexture.image.width*(1-.045*turn),1);
  mesh.rotation.z=state.pitch;
  deform(mesh,state.phase,state.effort);
 }
 let time=0,prev=performance.now(),idle=0,lastP=0,initialized=false;
 function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-prev)/1000,.05);prev=now;if(document.hidden)return;
  if(!paused)time+=dt;
  const w=innerWidth,h=innerHeight,mobile=w<701,rect=$('#encounter').getBoundingClientRect(),sh=rect.height;
  let p=window.ScrollTrigger?progress.value:Math.min(1,Math.max(0,(h-rect.top)/h));p=p*p*(3-2*p);
  if(!initialized){lastP=p;initialized=true;}
  const scrollSpeed=(p-lastP)/Math.max(dt,.001);lastP=p;
  if(!paused){const targetIdle=now-lastScroll>6500?1:0;idle+=(targetIdle-idle)*(1-Math.exp(-dt*1.4));}
  const ax=w*(mobile?.29:.25),ay=rect.top+(mobile?195:sh*.58),aw=w*(mobile?.43:.25);
  anemone.position.set(ax,ay,0);anemone.scale.set(aw,-aw*anemoneTexture.image.height/anemoneTexture.image.width,1);
  const rt=time*.32+1.1,rx=ax+aw*.17+Math.sin(rt)*aw*.09,ry=ay-aw*.13+Math.sin(rt*1.7)*aw*.035;
  const rvx=Math.cos(rt)*aw*.09*.32,rvy=Math.cos(rt*1.7)*aw*.035*.32*1.7;
  const rw=w*(mobile?.12:.074);swim(resident,swimmers[1],rw,rx,ry,rvx,rvy,dt,.35+.28*(.5+.5*Math.sin(time*.8+2)),0);
  const startX=w*(mobile?.72:.76),startY=h*(mobile?.76:.53),endX=ax+aw*.49,endY=ay+aw*.06;
  // A curved approach stays in the open water to the right, then eases toward the reef.
  const arc=Math.sin(Math.PI*p),hx=startX+(endX-startX)*p+w*.075*arc,hy=startY+(endY-startY)*p-h*.09*arc;
  const t=time*.34,range=w*(mobile?.035:.028),ox=range*Math.sin(t+.28*Math.sin(t*.7))*idle,oy=(Math.sin(t*1.7)*13+Math.sin(t*.67)*5)*idle;
  const vx=range*.34*Math.cos(t+.28*Math.sin(t*.7))*(1+.196*Math.cos(t*.7))*idle+((endX-startX)+w*.075*Math.PI*Math.cos(Math.PI*p))*scrollSpeed;
  const vy=13*.34*1.7*Math.cos(t*1.7)*idle;
  const burst=.5+.5*Math.sin(time*1.05+.6*Math.sin(time*.31));
  const effort=.28+.35*burst+Math.min(.65,Math.abs(scrollSpeed)*1.6);
  const hw=w*((mobile?.24:.15)+(mobile?-.09:-.05)*p)*(1+.025*Math.sin(t*.8)*idle);
  swim(hero,swimmers[0],hw,hx+ox,hy+oy,vx,vy,dt,effort,1);
  deform(anemone,time,1);renderer.render(scene,camera);
 }
 requestAnimationFrame(frame);$('#ocean').addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.add('no-webgl');});
}catch(error){console.warn('Static ocean fallback',error);document.body.classList.add('no-webgl');}
