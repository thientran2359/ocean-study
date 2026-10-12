import * as T from './assets/three.js';
let pigment;
// A shared, model-bound pigment map: strokes remain attached as the skeleton bends.
export function paintedMaterial(options={}){
 if(!pigment){
  const w=512,h=256,data=new Uint8Array(w*h*4);
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const u=x/w,v=y/h,warp=noise(u*16,v*12)*.8;
   const strokes=noise(u*70+warp,v*190),wash=noise(u*12,v*18),grain=hash(x,y);
   const shade=Math.min(1,.79+strokes*.14+wash*.055+grain*.025),i=(y*w+x)*4;
   data[i]=Math.round(255*shade);data[i+1]=Math.round(255*shade);data[i+2]=Math.round(255*shade);data[i+3]=255;
  }
  pigment=new T.DataTexture(data,w,h);pigment.colorSpace=T.SRGBColorSpace;pigment.wrapS=pigment.wrapT=T.RepeatWrapping;pigment.magFilter=T.LinearFilter;pigment.minFilter=T.LinearMipmapLinearFilter;pigment.generateMipmaps=true;pigment.needsUpdate=true;
 }
 return new T.MeshLambertMaterial({map:pigment,...options});
}
