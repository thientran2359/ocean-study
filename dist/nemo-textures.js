import * as T from './assets/three.js';
export async function loadNemoTextures(){
 const loader=new T.TextureLoader();
 const [body,details]=await Promise.all([loader.loadAsync('assets/nemo-body-painted.png'),loader.loadAsync('assets/fish.png')]);
 for(const tex of [body,details]){tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;}
 return {body,details};
}
export function illustrationMaterial(map,options={}){
 // The illustration supplies pigment and soft shading. A small diffuse contribution
 // gives volume during turns without washing out the approved painted colors.
 return new T.MeshStandardMaterial({map:map??null,roughness:1,metalness:0,emissive:'#ffffff',emissiveMap:map??null,emissiveIntensity:.65,...options});
}
