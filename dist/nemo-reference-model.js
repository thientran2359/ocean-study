import * as T from './assets/three.js';
import {REFERENCE,BODY_SECTIONS,FIN_TRACES,imagePoint,sectionAt,surfaceAt} from './nemo-reference-shape.js?v=5';

const clamp=T.MathUtils.clamp;
const bonePixels=[56,420,660,850,1030,1193];
const boneX=bonePixels.map(x=>imagePoint(x,530)[0]);
const TORSO_LENGTH_STEPS=176,TORSO_RING_STEPS=80;

export async function loadReferenceTextures(){
  const details=await new T.TextureLoader().loadAsync('assets/fish.png');
  details.colorSpace=T.SRGBColorSpace;details.anisotropy=8;
  return {details};
}

function material(map,options={}){
  // Preserve the illustration's pigment; diffuse light supplies the turn's volume.
  return new T.MeshStandardMaterial({map:map??null,roughness:1,metalness:0,
    toneMapped:false,emissive:'#ffffff',emissiveMap:map??null,
    emissiveIntensity:.42,...options});
}

function torsoMaterial(map){
  const result=material(map);
  // The source pectoral is painted over the torso. Resample only that pigment
  // from the adjacent orange patch so the separate 3D fin has no baked twin.
  // This changes GPU sampling, not the original reference image on disk.
  result.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D(map, vMapUv);
        vec2 pixel = vec2(vMapUv.x*1536.0,(1.0-vMapUv.y)*1024.0);
        float r = length((pixel-vec2(593.0,596.0))/vec2(138.0,145.0));
        float repair = 1.0-smoothstep(0.98,1.08,r);
        vec2 pigmentUv = vec2(475.0+(pixel.x-480.0)*0.75,
          333.0+(pixel.y-470.0)*0.26);
        vec4 pigment = texture2D(map,vec2(pigmentUv.x/1536.0,1.0-pigmentUv.y/1024.0));
        sampledDiffuseColor = mix(sampledDiffuseColor,pigment,repair);
        diffuseColor *= sampledDiffuseColor;
      #endif
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`
      #ifdef USE_EMISSIVEMAP
        vec4 paintGlow=texture2D(emissiveMap,vEmissiveMapUv);
        vec2 ep=vec2(vEmissiveMapUv.x*1536.0,(1.0-vEmissiveMapUv.y)*1024.0);
        float er=length((ep-vec2(593.0,596.0))/vec2(138.0,145.0));
        vec2 glowUv=vec2(475.0+(ep.x-480.0)*0.75,333.0+(ep.y-470.0)*0.26);
        paintGlow=mix(paintGlow,texture2D(emissiveMap,
          vec2(glowUv.x/1536.0,1.0-glowUv.y/1024.0)),1.0-smoothstep(0.98,1.08,er));
        totalEmissiveRadiance *= paintGlow.rgb;
      #endif
    `);
  };
  result.customProgramCacheKey=()=> 'reference-pigment-v2';
  return result;
}

function geometry(positions,uvs,indices){
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();
  return g;
}

function addSkinWeights(g,pixelXs){
  const indices=[],weights=[];
  for(const x of pixelXs){
    let i=0;while(i<bonePixels.length-2 && x>bonePixels[i+1])i++;
    // Keep painted facial features on the same rigid head as the eye/mouth.
    const mix=i===0?clamp((x-330)/(bonePixels[1]-330),0,1):
      clamp((x-bonePixels[i])/(bonePixels[i+1]-bonePixels[i]),0,1);
    indices.push(i,i+1,0,0);weights.push(1-mix,mix,0,0);
  }
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
  g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
}

function buildTorso(map,bones){
  const p=[],uv=[],tri=[],xs=[],lengthSteps=TORSO_LENGTH_STEPS,ringSteps=TORSO_RING_STEPS;
  const front=BODY_SECTIONS[0][0],back=BODY_SECTIONS.at(-1)[0];
  for(let i=0;i<=lengthSteps;i++){
    const px=front+(back-front)*i/lengthSteps;
    const [top,bottom,rawWidth]=sectionAt(px),width=Math.max(0,rawWidth);
    const mid=(top+bottom)/2,half=(bottom-top)/2;
    for(let j=0;j<=ringSteps;j++){
      const angle=j/ringSteps*Math.PI*2,sy=Math.cos(angle),sz=Math.sin(angle);
      const py=mid-half*sy,z=width*Math.sign(sz)*Math.abs(sz)**1.1;
      p.push(...imagePoint(px,py,z));xs.push(px);
      // Stay inside the torso silhouette, away from the background pixels.
      // Project inside the pigment, not onto the image's antialiased edge or
      // the background underneath the painted chin and attached ventral fins.
      const paintY=mid-(Math.max(0,half-15))*sy;
      uv.push(clamp(px/REFERENCE.width,0,1),1-paintY/REFERENCE.height);
      if(i<lengthSteps&&j<ringSteps){
        const a=i*(ringSteps+1)+j,b=a+ringSteps+1;
        tri.push(a,a+1,b,b,a+1,b+1);
      }
    }
  }
  const g=geometry(p,uv,tri);addSkinWeights(g,xs);
  const torso=new T.SkinnedMesh(g,torsoMaterial(map));torso.name='reference-torso';
  torso.add(bones[0]);torso.bind(new T.Skeleton(bones));
  return torso;
}

// Fin surfaces are lofted from traced contours, with a closed thin underside.
// The outline, UV coordinates and ray roots all come from the same painting.
function buildFin(trace,map,bones,{sign=0,spread=0}={}){
  const root=trace.root,rootWorld=imagePoint(...root);
  const baseZ=sign?surfaceAt(root[0],root[1],sign)-sign*.004:0;
  const pivot=new T.Group();pivot.position.set(rootWorld[0]-boneX[trace.bone],rootWorld[1],baseZ);
  bones[trace.bone].add(pivot);
  const curve=new T.CatmullRomCurve3(trace.edge.map(([x,y])=>new T.Vector3(x,y,0)),false,'centripetal');
  const rays=80,rings=16,p=[],uv=[],indices=[],layers=2,layerSize=(rings+1)*(rays+1);
  for(let layer=0;layer<layers;layer++)for(let r=0;r<=rings;r++)for(let j=0;j<=rays;j++){
    const f=r/rings,t=j/rays,edge=curve.getPoint(t);
    const px=root[0]+(edge.x-root[0])*f,py=root[1]+(edge.y-root[1])*f;
    // Small corrugations follow fin rays, and taper to the black painted rim.
    const relief=Math.sin(Math.PI*f)*(.003+Math.cos(t*Math.PI*26)*.001);
    const thickness=(layer===0?1:-1)*(.0007+relief);
    p.push((px-root[0])*REFERENCE.scale,(root[1]-py)*REFERENCE.scale,thickness);
    const texF=f*(1-.026*f**4);
    uv.push((root[0]+(edge.x-root[0])*texF)/REFERENCE.width,
      1-(root[1]+(edge.y-root[1])*texF)/REFERENCE.height);
    if(r<rings&&j<rays){const a=layer*layerSize+r*(rays+1)+j,b=a+rays+1;
      if(layer===0)indices.push(a,b,a+1,b,b+1,a+1);
      else indices.push(a,a+1,b,b,a+1,b+1);
    }
  }
  const first=rings*(rays+1);
  for(let j=0;j<rays;j++){const a=first+j,b=a+layerSize;indices.push(a,a+1,b,b,a+1,b+1);}
  for(const j of [0,rays])for(let r=0;r<rings;r++){
    const a=r*(rays+1)+j,b=a+rays+1,c=a+layerSize,d=b+layerSize;
    indices.push(a,c,b,b,c,d);
  }
  const mesh=new T.Mesh(geometry(p,uv,indices),material(map,{side:T.DoubleSide}));
  pivot.add(mesh);pivot.rotation.y=-sign*spread;
  const section=Math.round((root[0]-BODY_SECTIONS[0][0])/
    (BODY_SECTIONS.at(-1)[0]-BODY_SECTIONS[0][0])*TORSO_LENGTH_STEPS);
  pivot.userData={sign,spread,anchor:new T.Vector3(rootWorld[0],rootWorld[1],baseZ),
    skinVertex:clamp(section,0,TORSO_LENGTH_STEPS)*(TORSO_RING_STEPS+1)};
  return pivot;
}

function buildEyes(parent,map){
  const eyes=[];
  const eyeCenter=[207,455],radius=53;
  for(const sign of [-1,1]){
    const eye=new T.Group();eye.name=`eye-${sign}`;
    const center=imagePoint(...eyeCenter,surfaceAt(...eyeCenter,sign));
    eye.position.set(...center);parent.add(eye);
    const p=[],uv=[],indices=[],rings=12,slices=64;
    for(let r=0;r<=rings;r++)for(let j=0;j<=slices;j++){
      const f=r/rings,a=j/slices*Math.PI*2;
      const px=eyeCenter[0]+Math.cos(a)*radius*f,py=eyeCenter[1]-Math.sin(a)*radius*f;
      const v=imagePoint(px,py,surfaceAt(px,py,sign)+sign*(.002+.013*(1-f*f)));
      p.push(v[0]-center[0],v[1]-center[1],v[2]-center[2]);
      uv.push(px/REFERENCE.width,1-py/REFERENCE.height);
      if(r<rings&&j<slices){const a=r*(slices+1)+j,b=a+slices+1;indices.push(a,b,a+1,b,b+1,a+1);}
    }
    eye.add(new T.Mesh(geometry(p,uv,indices),material(map,{side:T.DoubleSide})));
    eye.userData.rest=eye.position.clone();eyes.push(eye);
  }
  return eyes;
}

function buildMouth(parent,map){
  const mouth=new T.Group();mouth.name='sculpted-mouth';
  mouth.position.set(...imagePoint(62,523));parent.add(mouth);
  // Tapered, downturned lip curves. Front-facing pigment is sampled from the
  // painted muzzle, with side corners ending on the cheek's real surface.
  const lips=[];
  for(const lower of [false,true]){
    const p=[],uv=[],ix=[],segments=48,sides=12;
    for(let i=0;i<=segments;i++){
      const q=-1+2*i/segments,z=q*.049;
      const x=-.004+.028*Math.abs(q)**1.5;
      const y=(lower?-.013:.012)-.022*Math.abs(q)**1.7;
      const taper=.45+.55*(1-q*q);
      for(let j=0;j<=sides;j++){
        const a=j/sides*Math.PI*2,dx=Math.cos(a)*.009*taper,dy=Math.sin(a)*.006*taper;
        p.push(x+dx,y+dy,z);
        uv.push((78+(x+dx)/REFERENCE.scale)/REFERENCE.width,
          1-((lower?546:508)-(y+dy)/REFERENCE.scale)/REFERENCE.height);
        if(i<segments&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,a+1,b,b,a+1,b+1);}
      }
    }
    const lip=new T.Mesh(geometry(p,uv,ix),material(map,{side:T.DoubleSide}));
    mouth.add(lip);lips.push(lip);
  }
  const cavity=new T.Mesh(new T.SphereGeometry(1,24,12),new T.MeshBasicMaterial({color:'#442516'}));
  cavity.position.set(-.007,-.004,0);cavity.scale.set(.003,.007,.040);mouth.add(cavity);
  return {mouth,lips,cavity};
}

export function createClownfish(textures={}){
  const group=new T.Group();group.name='Nemo-reference-rebuild';
  const bones=boneX.map((x,i)=>{const b=new T.Bone();b.name=`spine-${i}`;b.position.x=i?x-boneX[i-1]:x;return b;});
  for(let i=1;i<bones.length;i++)bones[i-1].add(bones[i]);
  const map=textures.details,body=buildTorso(map,bones);group.add(body);
  const head=new T.Group();head.position.x=-boneX[0];bones[0].add(head);
  const eyes=buildEyes(head,map),{mouth,lips,cavity}=buildMouth(head,map);
  const fins={};
  for(const [name,trace] of Object.entries(FIN_TRACES)){
    if(name==='pectoral')continue;
    fins[name]=buildFin(trace,map,bones);fins[name].name=name;
  }
  const pectorals=[-1,1].map(sign=>buildFin(FIN_TRACES.pectoral,map,bones,{sign,spread:.16}));
  const gills=[-1,1].map(sign=>{
    const path=[];
    for(let i=0;i<=32;i++){
      const t=i/32,py=425+t*254,px=400+25*Math.sin(t*Math.PI);
      path.push(new T.Vector3(...imagePoint(px,py,surfaceAt(px,py,sign)+sign*.0025)));
    }
    const line=new T.Line(new T.BufferGeometry().setFromPoints(path),
      new T.LineBasicMaterial({color:'#75391b',transparent:true,opacity:.19}));
    head.add(line);return {line,sign};
  });
  const lag=new Float64Array(6);
  const attachments=[...Object.values(fins),...pectorals],anchorPoint=new T.Vector3();
  function animate(t,effort=1,turn=0,life={}){
    const delta=life.delta??1/60,still=!!life.static;
    for(let i=1;i<bones.length;i++){
      lag[i]+=((i===1?turn:lag[i-1])-lag[i])*(1-Math.exp(-delta*12));
      const strength=[0,.015,.038,.075,.13,.2][i];
      bones[i].rotation.y=still?0:Math.sin(t*6-i*.7)*strength*effort-lag[i]*[0,.06,.1,.14,.17,.19][i];
      bones[i].rotation.z=still?0:Math.sin(t*2-i*.6)*.008;
    }
    fins.tail.rotation.y=still?0:Math.sin(t*6-4.4)*.2*effort-lag[5]*.12;
    for(const [name,phase] of [['dorsal',0],['rearDorsal',.3],['anal',1]])
      fins[name].rotation.x=still?0:Math.sin(t*4+phase)*.035;
    pectorals.forEach((fin,i)=>{
      const {sign,spread}=fin.userData;
      const opening=still?spread:clamp(.34+Math.sin(t*9+i*.6)*.20+(life.brake??0)*.25+turn*.12,.10,.80);
      fin.rotation.y=-sign*opening;
      fin.rotation.x=still?0:Math.sin(t*9+i*.6)*.09;
    });
    const breath=still?0:.5+.5*Math.sin((life.breathTime??t)*(2.3+Math.min(effort,1)*1.1));
    lips[1].position.y=-breath*.006;cavity.scale.y=.008+breath*.004;
    eyes.forEach(eye=>{eye.position.copy(eye.userData.rest);
      if(!still){eye.position.x+=clamp(life.gazeX??0,-1,1)*.002;eye.position.y+=clamp(life.gazeY??0,-1,1)*.002;}});
    gills.forEach(g=>g.line.position.z=still?0:g.sign*breath*.002);
    // A rigid fin bone alone does not follow the torso's blended skin at its
    // attachment. Move the root with that skin so turning cannot open a seam.
    group.updateMatrixWorld(true);body.skeleton.update();
    for(const fin of attachments){
      anchorPoint.copy(fin.userData.anchor);
      body.applyBoneTransform(fin.userData.skinVertex,anchorPoint);
      body.localToWorld(anchorPoint);fin.parent.worldToLocal(anchorPoint);
      fin.position.copy(anchorPoint);
    }
  }
  animate(0,0,0,{static:true});
  return {group,animate,body,bones,eyes,gills,mouth,fins};
}
