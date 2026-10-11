import * as T from './assets/three.js';
// Geometry is authored in model coordinates: head at -X, dorsal at +Y.
export function createClownfish(){
 const fish=new T.Group(),bones=[],lengths=[0,.55,.4,.35,.3,.25];
 lengths.forEach((length,i)=>{const bone=new T.Bone();bone.position.x=i?length:-1;bones.push(bone);if(i)bones[i-1].add(bone);});
 const profile=[[-1,.035,.045],[-.91,.14,.105],[-.76,.255,.155],[-.5,.32,.18],[-.18,.32,.17],[.15,.275,.135],[.43,.19,.095],[.65,.1,.065],[.85,.075,.045]];
 function radii(x){let i=0;while(i<profile.length-2&&x>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],t=(x-a[0])/(b[0]-a[0]);return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
 const pos=[],col=[],indices=[],skinI=[],skinW=[],uv=[],joints=[-1,-.45,-.05,.3,.6,.85],N=100,M=56;
 const orange=new T.Color('#d97713'),white=new T.Color('#e7e2ce'),black=new T.Color('#181d22');
 for(let i=0;i<=N;i++){const x=-1+i/N*1.85,[ry,rz]=radii(x);for(let j=0;j<=M;j++){const theta=j/M*Math.PI*2,y=Math.cos(theta)*ry,z=Math.sin(theta)*rz;pos.push(x,y,z);uv.push(i/N,j/M);
  const warp=.022*Math.sin(theta*2)+.011*Math.sin(theta*5+x*6);let d=Math.min(Math.abs(x+.66+warp)/.073,Math.abs(x+.02+warp*1.8)/.09,Math.abs(x-.65+warp*.4)/.048);let c=(d<1?white:d<1.24?black:orange).clone();const brush=Math.sin(x*148+Math.sin(theta*19)*2)*Math.sin(theta*57+x*11)*.032;const shade=.92+.08*Math.sin(theta)+brush;c.multiplyScalar(shade);col.push(c.r,c.g,c.b);
  let k=0;while(k<4&&x>joints[k+1])k++;const f=T.MathUtils.clamp((x-joints[k])/(joints[k+1]-joints[k]),0,1);skinI.push(k,k+1,0,0);skinW.push(1-f,f,0,0);
  if(i<N&&j<M){let a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1);}
 }}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinI,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(skinW,4));geo.setIndex(indices);geo.computeVertexNormals();
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0,side:T.DoubleSide});
 const body=new T.SkinnedMesh(geo,material);body.add(bones[0]);body.bind(new T.Skeleton(bones));fish.add(body);
 function sphere(parent,xyz,scale,color){const m=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color,roughness:.68}));m.position.set(...xyz);m.scale.set(...scale);parent.add(m);return m;}
 const head=new T.Group();head.position.x=1;bones[0].add(head);
 for(const sign of [-1,1]){sphere(head,[-.79,.085,sign*.136],[.058,.06,.019],'#bf7720');sphere(head,[-.797,.087,sign*.153],[.039,.044,.016],'#0a1115');sphere(head,[-.809,.103,sign*.166],[.008,.009,.004],'#d9e5da');
  const g=[];for(let i=0;i<=24;i++){let t=-1.05+i/24*2.1;g.push(new T.Vector3(-.51+.037*Math.cos(t),.2*Math.sin(t),sign*(.15+.026*Math.cos(t))));}const line=new T.Line(new T.BufferGeometry().setFromPoints(g),new T.LineBasicMaterial({color:'#733c19',transparent:true,opacity:.65}));head.add(line);
 }
 const mouth=new T.Mesh(new T.TorusGeometry(.028,.007,8,24),new T.MeshStandardMaterial({color:'#865020',roughness:.9}));mouth.rotation.y=Math.PI/2;mouth.position.set(-1.008,-.006,0);mouth.scale.set(1,.66,1);head.add(mouth);
 // Fin fans include darker margins and radial rays, attached to separate pivots.
 function fin(parent,xyz,outline,rotation=[0,0,0]){const pivot=new T.Group();pivot.position.set(...xyz);pivot.rotation.set(...rotation);parent.add(pivot);const verts=[0,0,0],colors=[orange.r,orange.g,orange.b],ids=[];
  for(let ring=0;ring<2;ring++){const f=ring===0?.86:1;outline.forEach(([x,y])=>{verts.push(x*f,y*f,0);const c=ring===0?orange:black;colors.push(c.r,c.g,c.b);});}
  let n=outline.length;for(let i=0;i<n-1;i++){ids.push(0,i+1,i+2);let a=i+1,b=n+i+1;ids.push(a,b,a+1,b,b+1,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ids);g.computeVertexNormals();pivot.add(new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.85,transparent:true,opacity:.94,depthWrite:false})));
  const rays=[];outline.forEach(([x,y])=>rays.push(0,0,.001,x*.88,y*.88,.001));pivot.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rays,3)),new T.LineBasicMaterial({color:'#ffc16b',transparent:true,opacity:.36})));return pivot;
 }
 const tailOutline=[];for(let i=0;i<=22;i++){let a=-1.05+i/22*2.1;tailOutline.push([.39*Math.cos(a),.29*Math.sin(a)]);}const tail=fin(bones[5],[0,0,0],tailOutline);
 const dorsal=fin(bones[2],[0,.24,0],[[-.44,.0],[-.39,.1],[-.32,.12],[-.25,.18],[-.17,.19],[-.1,.15],[0,.21],[.12,.19],[.25,.12],[.39,-.10]]);
 const anal=fin(bones[3],[0,-.19,0],[[-.22,0],[-.09,-.16],[.04,-.17],[.19,-.13],[.31,.07]]);
 const pectorals=[];for(const sign of [-1,1]){const f=fin(bones[1],[.02,-.06,sign*.165],[[0,.03],[.09,.04],[.19,0],[.23,-.07],[.21,-.16],[.15,-.2],[.07,-.17],[0,-.035]],[0,sign*.7,0]);pectorals.push(f);}
 function animate(t,effort=1,turn=0){for(let i=1;i<bones.length;i++){const strength=[0,.015,.038,.075,.13,.2][i];bones[i].rotation.y=Math.sin(t*6-i*.7)*strength*effort+turn*strength*.7;bones[i].rotation.z=Math.sin(t*2-i*.6)*.008;}
 tail.rotation.y=Math.sin(t*6-4.4)*.2*effort;dorsal.rotation.x=Math.sin(t*4)*.035;anal.rotation.x=Math.sin(t*4+1)*.045;pectorals.forEach((f,i)=>{const sign=i?1:-1;f.rotation.y=sign*(.65+Math.sin(t*9+i*.6)*.3);f.rotation.x=Math.sin(t*9+i*.6)*.12;});mouth.scale.y=.66+Math.sin(t*2.6)*.045;}
 return {group:fish,animate,body,bones};
}
