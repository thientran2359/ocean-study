// Landmarks traced in pixels on assets/fish.png (1536 x 1024).
// Geometry and UVs share these coordinates; proportions are not guessed in world units.
export const REFERENCE = {width:1536, height:1024, scale:0.0018, origin:[630,530]};

// x, upper silhouette, lower silhouette, half thickness in world units.
// Thickness is inferred from the approved three-quarter reference.
const TRACED_SECTIONS = [
  [56,519,519,0], [61,500,538,.034], [78,476,565,.066],
  [105,444,605,.104], [150,402,649,.148], [210,364,688,.180],
  [290,324,719,.206], [385,288,744,.225], [490,276,760,.235],
  [600,278,771,.226], [715,297,776,.208], [820,336,766,.177],
  [915,384,741,.141], [1010,423,704,.110], [1100,454,665,.078],
  [1170,464,649,.062], [1200,462,649,.055], [1220,550,550,0]
];

// Flatten the lateral thickness, especially the cheeks. Lift the ventral
// contour a little without shrinking the fish's length or dorsal shoulder.
export const BODY_SECTIONS = TRACED_SECTIONS.map(([x,top,bottom,width])=>{
  const cheek=Math.exp(-(((x-200)/165)**2));
  const belly=Math.exp(-(((x-610)/360)**2));
  return [x,top,bottom-(bottom-top)*(.07*cheek+.035*belly),
    width*(.77-.06*cheek)];
});

export const FIN_TRACES = {
  dorsal: {root:[579,309],bone:1,edge:[
    [400,282],[430,260],[460,244],[490,208],[520,179],
    [550,161],[580,142],[610,140],[640,141],[670,146],
    [700,158],[730,188],[752,220],[767,260],[754,306]
  ]},
  rearDorsal: {root:[895,401],bone:3,edge:[
    [790,338],[825,284],[871,245],[923,235],[976,249],
    [1034,294],[1081,344],[1100,388],[1084,417],[1026,442]
  ]},
  anal: {root:[934,702],bone:3,edge:[
    [844,755],[884,789],[946,810],[1005,805],
    [1060,777],[1102,730],[1101,677],[1042,669]
  ]},
  pelvic: {root:[456,731],bone:1,edge:[
    [405,740],[426,797],[475,841],[543,872],
    [602,880],[645,856],[657,822],[568,750]
  ]},
  pectoral: {root:[483,585],bone:1,edge:[
    [492,544],[526,507],[573,477],[616,474],[656,503],
    [688,548],[705,594],[700,647],[670,685],
    [624,713],[576,717],[531,681],[494,628]
  ]},
  tail: {root:[1193,551],bone:5,edge:[
    [1218,475],[1267,433],[1321,396],[1377,376],[1421,390],
    [1467,435],[1493,499],[1498,566],[1487,634],
    [1462,699],[1426,744],[1366,749],[1304,718],[1216,628]
  ]}
};

export function imagePoint(x,y,z=0){
  return [(x-REFERENCE.origin[0])*REFERENCE.scale,
    (REFERENCE.origin[1]-y)*REFERENCE.scale,z];
}

export function sectionAt(x){
  let i=0;
  while(i<BODY_SECTIONS.length-2 && x>BODY_SECTIONS[i+1][0])i++;
  const a=BODY_SECTIONS[i],b=BODY_SECTIONS[i+1];
  const p=BODY_SECTIONS[Math.max(0,i-1)],q=BODY_SECTIONS[Math.min(BODY_SECTIONS.length-1,i+2)];
  const t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));
  return [1,2,3].map(k=>{
    const m=(b[k]-p[k])/(b[0]-p[0])*(b[0]-a[0]);
    const n=(q[k]-a[k])/(q[0]-a[0])*(b[0]-a[0]);
    return (2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*m+
      (-2*t**3+3*t*t)*b[k]+(t**3-t*t)*n;
  });
}

export function surfaceAt(pixelX,pixelY,sign=1){
  const [top,bottom,width]=sectionAt(pixelX);
  const center=(top+bottom)/2,half=Math.max(.01,(bottom-top)/2);
  const normalized=Math.min(1,Math.abs((pixelY-center)/half));
  return sign*Math.max(0,width)*Math.pow(Math.sqrt(1-normalized*normalized),1.1);
}
