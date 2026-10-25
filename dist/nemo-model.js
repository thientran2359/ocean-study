import * as T from './assets/three.js';
import {illustrationMaterial} from './nemo-textures.js';
// Closed torso with a painted UV map; head -X, back +Y, independent fin pivots.
export function createClownfish(textures={}){
 const fish=new T.Group(),bones=[],lengths=[0,.55,.4,.35,.3,.25];
 lengths.forEach((length,i)=>{const b=new T.Bone();b.position.x=i?length:-1;bones.push(b);if(i)bones[i-1].add(b);});
 const profile=[[-1.14,0,0],[-1.126,.048,.055],[-1.10,.12,.09],[-1.04,.185,.13],[-.94,.26,.18],[-.80,.33,.225],[-.64,.385,.245],[-.34,.425,.25],[-.04,.40,.215],[.26,.335,.165],[.50,.23,.105],[.70,.13,.065],[.88,.105,.055],[.94,0,0]];
 function radii(x){let i=0;while(i<profile.length-2&&x>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],t=(x-a[0])/(b[0]-a[0]),p=profile[Math.max(0,i-1)],q=profile[Math.min(profile.length-1,i+2)];return [1,2].map(k=>{const m=(b[k]-p[k])/(b[0]-p[0])*(b[0]-a[0]),n=(q[k]-a[k])/(q[0]-a[0])*(b[0]-a[0]);return Math.max(0,(2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*m+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*n);});}
 const pos=[],uv=[],ids=[],si=[],sw=[],joints=[-1,-.45,-.05,.3,.6,.85],N=120,M=64;
 for(let i=0;i<=N;i++){const x=-1.14+i/N*2.08,[ry,rz]=radii(x),center=-.025*Math.exp(-(((x+.96)/.3)**2));for(let j=0;j<=M;j++){const a=j/M*Math.PI*2,y=Math.cos(a)*ry+center,z=Math.sin(a)*rz;pos.push(x,y,z);
  // Mirror the side paint around the back/belly, making a continuous circumference.
  // Follow the head's arched collar and the slanted mid-body band in the drawing.
  const height=Math.cos(a),collar=-.68+.16*(1-height*height),middle=.10+.10*Math.max(0,height),tailBand=.79;
  const anchors=[[-1.14,0],[collar,.24],[middle,.63],[tailBand,.935],[.94,1]];
  let segment=0;while(segment<anchors.length-2&&x>anchors[segment+1][0])segment++;
  const [xa,ua]=anchors[segment],[xb,ub]=anchors[segment+1];
  uv.push(T.MathUtils.lerp(ua,ub,(x-xa)/(xb-xa)),.08+.84*(1-height)/2);
  let k=0;while(k<4&&x>joints[k+1])k++;const f=T.MathUtils.clamp((x-joints[k])/(joints[k+1]-joints[k]),0,1);si.push(k,k+1,0,0);sw.push(1-f,f,0,0);
  if(i<N&&j<M){const a=i*(M+1)+j,b=a+M+1;ids.push(a,a+1,b,b,a+1,b+1);}
 }}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.setIndex(ids);geo.computeVertexNormals();
 const body=new T.SkinnedMesh(geo,illustrationMaterial(textures.body,{bumpMap:textures.body??null,bumpScale:.006}));body.add(bones[0]);body.bind(new T.Skeleton(bones));fish.add(body);
 const head=new T.Group();head.position.x=1;bones[0].add(head);const eyes=[],gills=[];
 // Project the approved illustration's eye onto a small convex eye surface.
 for(const sign of [-1,1]){const eye=new T.Group();eye.position.set(-.86,.115,sign*.185);head.add(eye);eyes.push(eye);const p=[],u=[],ix=[],R=10,A=48;
  for(let r=0;r<=R;r++)for(let j=0;j<=A;j++){const f=r/R,a=j/A*Math.PI*2,c=Math.cos(a),s=Math.sin(a),ex=c*f*.095,ey=s*f*.097,[height,width]=radii(-.86+ex),center=-.025*Math.exp(-((((-.86+ex)+.96)/.3)**2)),surface=width*Math.sqrt(Math.max(0,1-((.115+ey-center)/height)**2));p.push(ex,ey,sign*(surface-.185+.006+.016*Math.sqrt(1-f*f)));u.push((207+c*f*53)/1536,1-(455-s*f*54)/1024);if(r<R&&j<A){let k=r*(A+1)+j,n=k+A+1;ix.push(k,n,k+1,n,n+1,k+1);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(u,2));g.setIndex(ix);g.computeVertexNormals();eye.add(new T.Mesh(g,illustrationMaterial(textures.details,{side:T.DoubleSide})));
  const pts=[];for(let j=0;j<=30;j++){const a=-1+j/30*2;pts.push(new T.Vector3(-.47+.035*Math.cos(a),.27*Math.sin(a),sign*.215));}const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#975017',transparent:true,opacity:.3}));head.add(line);gills.push({line,sign});
 }
 function sphere(parent,xyz,scale,color){const m=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color,roughness:1}));m.position.set(...xyz);m.scale.set(...scale);parent.add(m);return m;}
 const mouth=new T.Group();mouth.position.set(-1.126,-.043,0);head.add(mouth);
 const upperLip=sphere(mouth,[-.006,.018,0],[.025,.020,.069],'#ef9728'),lowerLip=sphere(mouth,[-.004,-.019,0],[.023,.018,.062],'#d97c1c');
 // Reuse the painted snout pigment rather than leaving two untextured rods.
 for(const lip of [upperLip,lowerLip]){const coords=lip.geometry.getAttribute('position'),uvs=lip.geometry.getAttribute('uv');for(let i=0;i<coords.count;i++)uvs.setXY(i,(88+coords.getX(i)*21)/1536,1-(lip===upperLip?501-coords.getY(i)*12:548-coords.getY(i)*10)/1024);lip.material=illustrationMaterial(textures.details);}
 const cavity=sphere(head,[-1.151,-.043,0],[.007,.018,.048],'#492a13');
 for(const sign of [-1,1]){const points=[[-1.126,-.043],[-1.095,-.045],[-1.055,-.06],[-1.025,-.078]].map(([x,y])=>{const [height,width]=radii(x),center=-.025*Math.exp(-(((x+.96)/.3)**2));return new T.Vector3(x,y,sign*(width*Math.sqrt(Math.max(0,1-((y-center)/height)**2))+.003));});head.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.0025,6,false),new T.MeshBasicMaterial({color:'#7d431b',transparent:true,opacity:.65})));}
 // Each fin samples its own painted structure, with rays converging on its root.
 const finPaint={
  tail:{root:[1190,551],edge:[[1220,473],[1321,397],[1410,384],[1475,445],[1492,551],[1473,670],[1430,739],[1332,726],[1218,626]]},
  dorsal:{root:[590,321],edge:[[407,292],[444,215],[519,150],[605,143],[708,177],[760,245],[751,303]]},
  rear:{root:[884,429],edge:[[791,337],[861,249],[958,241],[1051,305],[1094,371],[1080,413],[1008,441]]},
  anal:{root:[903,668],edge:[[852,712],[887,773],[957,802],[1040,776],[1097,720],[1091,659]]},
  pelvic:{root:[422,707],edge:[[406,737],[438,810],[516,856],[614,873],[650,840],[570,750]]},
  pectoral:{root:[483,586],edge:[[501,535],[548,489],[610,477],[659,515],[699,585],[687,652],[643,704],[586,706],[523,667],[490,618]]}
 };
 function fin(parent,xyz,outline,paint,rotation=[0,0,0]){const pivot=new T.Group();pivot.position.set(...xyz);pivot.rotation.set(...rotation);parent.add(pivot);const edgeCurve=new T.CatmullRomCurve3(outline.map(([x,y])=>new T.Vector3(x,y,0)),false,'centripetal'),sourceCurve=new T.CatmullRomCurve3(paint.edge.map(([x,y])=>new T.Vector3(x,y,0)),false,'centripetal'),edge=edgeCurve.getPoints(64),n=edge.length,rings=14,p=[0,0,0],u=[paint.root[0]/1536,1-paint.root[1]/1024],ix=[];
  for(let r=1;r<=rings;r++)for(let j=0;j<n;j++){const f=r/rings,q=edge[j],tex=sourceCurve.getPoint(j/(n-1));p.push(q.x*f,q.y*f,Math.sin(f*Math.PI)*Math.sin(j/(n-1)*Math.PI)*.024);u.push((paint.root[0]+(tex.x-paint.root[0])*f)/1536,1-(paint.root[1]+(tex.y-paint.root[1])*f)/1024);}
  for(let j=0;j<n-1;j++)ix.push(0,j+1,j+2);for(let r=0;r<rings-1;r++)for(let j=0;j<n-1;j++){const a=1+r*n+j,b=a+n;ix.push(a,b,a+1,b,b+1,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(u,2));g.setIndex(ix);g.computeVertexNormals();pivot.add(new T.Mesh(g,illustrationMaterial(textures.details,{side:T.DoubleSide,transparent:true,opacity:.96,alphaTest:.4,depthWrite:true})));return pivot;
 }
 const tail=fin(bones[5],[0,0,0],[[.045,.11],[.25,.26],[.41,.30],[.53,.18],[.55,0],[.51,-.24],[.40,-.31],[.23,-.26],[.045,-.12]],finPaint.tail);
 const dorsal=fin(bones[1],[.07,.37,0],[[-.31,-.055],[-.25,.12],[-.12,.25],[.045,.265],[.20,.20],[.285,.085],[.27,-.04]],finPaint.dorsal);
 const rearDorsal=fin(bones[3],[-.02,.245,0],[[-.23,.02],[-.11,.23],[.07,.28],[.23,.18],[.30,.05],[.265,-.045],[.12,-.10]],finPaint.rear);
 const anal=fin(bones[3],[-.035,-.275,0],[[-.15,-.06],[-.10,-.19],[.03,-.235],[.18,-.18],[.29,-.06],[.275,.055]],finPaint.anal);
 fin(bones[1],[.02,-.385,0],[[-.08,.015],[-.04,-.16],[.10,-.24],[.25,-.23],[.29,-.14],[.145,.01]],finPaint.pelvic);
 const pectorals=[];for(const sign of [-1,1])pectorals.push(fin(bones[1],[.025,-.06,sign*.242],[[.015,.10],[.11,.19],[.235,.21],[.34,.145],[.405,.01],[.38,-.13],[.29,-.23],[.17,-.24],[.05,-.16],[.005,-.055]],finPaint.pectoral,[0,-sign*.34,0]));
 const turnLag=new Float64Array(6);
 function animate(t,effort=1,turn=0,life={}){for(let i=1;i<bones.length;i++){const strength=[0,.015,.038,.075,.13,.2][i];turnLag[i]+=((i===1?turn:turnLag[i-1])-turnLag[i])*(1-Math.exp(-(life.delta??1/60)*12));bones[i].rotation.y=Math.sin(t*6-i*.7)*strength*effort-turnLag[i]*[0,.06,.1,.14,.17,.19][i];bones[i].rotation.z=Math.sin(t*2-i*.6)*.008;}
 tail.rotation.y=Math.sin(t*6-4.4)*.2*effort-turnLag[5]*.12;rearDorsal.rotation.x=Math.sin(t*4+.3)*.03;dorsal.rotation.x=Math.sin(t*4)*.035;anal.rotation.x=Math.sin(t*4+1)*.045;pectorals.forEach((f,i)=>{const sign=i?1:-1;f.rotation.y=-sign*(.34+(life.static?0:Math.sin(t*9+i*.6)*.24));f.rotation.x=life.static?0:Math.sin(t*9+i*.6)*.12;});const breath=.5+.5*Math.sin((life.breathTime??t)*(2.3+Math.min(effort,1)*1.1));mouth.scale.y=.8+breath*.35;cavity.scale.y=.018+breath*.009;mouth.position.x=-1.126-breath*.002;gills.forEach(g=>{if(g.flap){g.flap.position.z=g.sign*(.215+breath*.006);g.flap.rotation.y=g.sign*breath*.07;}else g.line.position.z=g.sign*breath*.006;});const gx=T.MathUtils.clamp(life.gazeX??0,-1,1),gy=T.MathUtils.clamp(life.gazeY??0,-1,1);eyes.forEach(e=>{e.position.x=-.86+gx*.005;e.position.y=.115+gy*.005;});pectorals.forEach((f,i)=>{f.rotation.y-=(i?1:-1)*(life.brake??0)*.25+turn*(i?.12:-.12);});}
 return {group:fish,animate,body,bones,eyes,gills,mouth};
}
