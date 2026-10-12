import * as T from './assets/three.js';
import {illustrationMaterial} from './nemo-textures.js';
// Closed torso with a painted UV map; head -X, back +Y, independent fin pivots.
export function createClownfish(textures={}){
 const fish=new T.Group(),bones=[],lengths=[0,.55,.4,.35,.3,.25];
 lengths.forEach((length,i)=>{const b=new T.Bone();b.position.x=i?length:-1;bones.push(b);if(i)bones[i-1].add(b);});
 const profile=[[-1.035,0,0],[-1,.10,.065],[-.91,.24,.13],[-.76,.35,.19],[-.5,.43,.235],[-.18,.435,.225],[.15,.39,.19],[.43,.29,.13],[.65,.17,.085],[.85,.12,.06],[.91,0,0]];
 function radii(x){let i=0;while(i<profile.length-2&&x>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],t=(x-a[0])/(b[0]-a[0]),p=profile[Math.max(0,i-1)],q=profile[Math.min(profile.length-1,i+2)];return [1,2].map(k=>{const m=(b[k]-p[k])/(b[0]-p[0])*(b[0]-a[0]),n=(q[k]-a[k])/(q[0]-a[0])*(b[0]-a[0]);return Math.max(0,(2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*m+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*n);});}
 const pos=[],uv=[],ids=[],si=[],sw=[],joints=[-1,-.45,-.05,.3,.6,.85],N=120,M=64;
 for(let i=0;i<=N;i++){const x=-1.035+i/N*1.945,[ry,rz]=radii(x);for(let j=0;j<=M;j++){const a=j/M*Math.PI*2,y=Math.cos(a)*ry,z=Math.sin(a)*rz;pos.push(x,y,z);
  // Mirror the side paint around the back/belly, making a continuous circumference.
  uv.push(T.MathUtils.clamp((x+1.035)/1.945,0,1),.08+.84*(1-Math.cos(a))/2);
  let k=0;while(k<4&&x>joints[k+1])k++;const f=T.MathUtils.clamp((x-joints[k])/(joints[k+1]-joints[k]),0,1);si.push(k,k+1,0,0);sw.push(1-f,f,0,0);
  if(i<N&&j<M){const a=i*(M+1)+j,b=a+M+1;ids.push(a,b,a+1,b,b+1,a+1);}
 }}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.setIndex(ids);geo.computeVertexNormals();
 const body=new T.SkinnedMesh(geo,illustrationMaterial(textures.body,{side:T.DoubleSide}));body.add(bones[0]);body.bind(new T.Skeleton(bones));fish.add(body);
 const head=new T.Group();head.position.x=1;bones[0].add(head);const eyes=[],gills=[];
 // Project the approved illustration's eye onto a small convex eye surface.
 for(const sign of [-1,1]){const eye=new T.Group();eye.position.set(-.79,.16,sign*.175);head.add(eye);eyes.push(eye);const p=[],u=[],ix=[],R=10,A=48;
  for(let r=0;r<=R;r++)for(let j=0;j<=A;j++){const f=r/R,a=j/A*Math.PI*2,c=Math.cos(a),s=Math.sin(a);p.push(c*f*.077,s*f*.078,sign*.024*Math.sqrt(1-f*f));u.push((207+c*f*53)/1536,1-(455-s*f*54)/1024);if(r<R&&j<A){let k=r*(A+1)+j,n=k+A+1;ix.push(k,n,k+1,n,n+1,k+1);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(u,2));g.setIndex(ix);g.computeVertexNormals();eye.add(new T.Mesh(g,illustrationMaterial(textures.details,{side:T.DoubleSide})));
  const pts=[];for(let j=0;j<=30;j++){const a=-1+j/30*2;pts.push(new T.Vector3(-.47+.035*Math.cos(a),.27*Math.sin(a),sign*.215));}const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#975017',transparent:true,opacity:.3}));head.add(line);gills.push({line,sign});
 }
 function sphere(parent,xyz,scale,color){const m=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color,roughness:1}));m.position.set(...xyz);m.scale.set(...scale);parent.add(m);return m;}
 const mouth=new T.Group();mouth.position.set(-1.035,-.013,0);head.add(mouth);
 sphere(mouth,[-.008,.015,0],[.028,.011,.047],'#f5a22e');sphere(mouth,[-.005,-.015,0],[.024,.009,.041],'#e68c22');
 const cavity=sphere(head,[-1.038,-.013,0],[.01,.015,.032],'#58320d');
 // One painted tail fan from the approved source supplies real brush strokes and rays.
 const sourceCurve=new T.CatmullRomCurve3([[1320,390],[1410,376],[1481,439],[1500,551],[1480,674],[1435,748],[1330,733]].map(([x,y])=>new T.Vector3(x,y,0)),false,'centripetal');
 function fin(parent,xyz,outline,rotation=[0,0,0]){const pivot=new T.Group();pivot.position.set(...xyz);pivot.rotation.set(...rotation);parent.add(pivot);const edge=new T.CatmullRomCurve3(outline.map(([x,y])=>new T.Vector3(x,y,0)),false,'centripetal').getPoints(64),n=edge.length,rings=14,p=[0,0,0],u=[1190/1536,1-550/1024],ix=[];
  for(let r=1;r<=rings;r++)for(let j=0;j<n;j++){const f=r/rings,q=edge[j],tex=sourceCurve.getPoint(j/(n-1));p.push(q.x*f,q.y*f,Math.sin(f*Math.PI)*Math.sin(j/(n-1)*Math.PI)*.024);u.push((1190+(tex.x-1190)*f)/1536,1-(550+(tex.y-550)*f)/1024);}
  for(let j=0;j<n-1;j++)ix.push(0,j+1,j+2);for(let r=0;r<rings-1;r++)for(let j=0;j<n-1;j++){const a=1+r*n+j,b=a+n;ix.push(a,b,a+1,b,b+1,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(u,2));g.setIndex(ix);g.computeVertexNormals();pivot.add(new T.Mesh(g,illustrationMaterial(textures.details,{side:T.DoubleSide,transparent:true,opacity:.96,alphaTest:.4,depthWrite:true})));return pivot;
 }
 const tail=fin(bones[5],[0,0,0],[[.12,.16],[.32,.29],[.51,.34],[.6,.19],[.62,0],[.59,-.22],[.46,-.34],[.25,-.28],[.1,-.14]]);
 const dorsal=fin(bones[1],[.16,.36,0],[[-.28,.01],[-.2,.2],[-.05,.31],[.13,.34],[.3,.29],[.4,.18],[.41,.02]]);
 const rearDorsal=fin(bones[3],[.08,.26,0],[[-.24,.01],[-.16,.19],[.02,.28],[.17,.21],[.26,.09],[.24,-.03]]);
 const anal=fin(bones[3],[0,-.27,0],[[-.18,.01],[-.17,-.19],[-.01,-.29],[.17,-.27],[.29,-.14],[.28,.02]]);
 fin(bones[1],[.17,-.37,0],[[-.06,.02],[.03,-.2],[.19,-.24],[.25,-.12],[.24,.02]]);
 const pectorals=[];for(const sign of [-1,1])pectorals.push(fin(bones[1],[.04,-.025,sign*.235],[[.02,.07],[.18,.17],[.34,.11],[.43,-.04],[.43,-.23],[.31,-.33],[.17,-.3],[.02,-.09]],[0,-sign*.7,0]));
 const turnLag=new Float64Array(6);
 function animate(t,effort=1,turn=0,life={}){for(let i=1;i<bones.length;i++){const strength=[0,.015,.038,.075,.13,.2][i];turnLag[i]+=((i===1?turn:turnLag[i-1])-turnLag[i])*(1-Math.exp(-(life.delta??1/60)*12));bones[i].rotation.y=Math.sin(t*6-i*.7)*strength*effort-turnLag[i]*[0,.06,.1,.14,.17,.19][i];bones[i].rotation.z=Math.sin(t*2-i*.6)*.008;}
 tail.rotation.y=Math.sin(t*6-4.4)*.2*effort-turnLag[5]*.12;rearDorsal.rotation.x=Math.sin(t*4+.3)*.03;dorsal.rotation.x=Math.sin(t*4)*.035;anal.rotation.x=Math.sin(t*4+1)*.045;pectorals.forEach((f,i)=>{const sign=i?1:-1;f.rotation.y=-sign*(.65+Math.sin(t*9+i*.6)*.3);f.rotation.x=Math.sin(t*9+i*.6)*.12;});const breath=.5+.5*Math.sin((life.breathTime??t)*(2.3+Math.min(effort,1)*1.1));mouth.scale.y=.5+breath*.7;cavity.scale.y=.013+breath*.02;mouth.position.x=-1.035-breath*.006;gills.forEach(g=>{if(g.flap){g.flap.position.z=g.sign*(.215+breath*.006);g.flap.rotation.y=g.sign*breath*.07;}else g.line.position.z=g.sign*breath*.012;});const gx=T.MathUtils.clamp(life.gazeX??0,-1,1),gy=T.MathUtils.clamp(life.gazeY??0,-1,1);eyes.forEach(e=>{e.position.x=-.79+gx*.008;e.position.y=.16+gy*.008;});pectorals.forEach((f,i)=>{f.rotation.y-=(i?1:-1)*(life.brake??0)*.25+turn*(i?.12:-.12);});}
 return {group:fish,animate,body,bones,eyes,gills,mouth};
}
