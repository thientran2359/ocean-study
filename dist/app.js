import {mountReefHero} from './reef-hero.js?v=reef-hero-1';
const $=s=>document.querySelector(s),data={fish:{name:'Cá hề',description:'Sắc cam, những dải trắng và một dáng bơi quen thuộc giữa các xúc tu hải quỳ.',detail:'Quan sát những dải trắng viền đen, chiếc vây nhỏ và cách cá hề di chuyển quanh hải quỳ. Hồ sơ sinh vật đầy đủ sẽ được bổ sung sau.'},anemone:{name:'Hải quỳ',description:'Những xúc tu mềm tạo thành một điểm nhấn yên bình trên rạn đá.',detail:'Một mái nhà nhỏ giữa rạn. Hãy ngắm những xúc tu đung đưa và hai chú cá ghé qua trong khung cảnh đầu trang.'}};
let selected='fish',returnFocus;const dialog=$('#detail');
function show(title,body){returnFocus=document.activeElement;$('#detail-title').textContent=title;$('#detail-body').textContent=body;dialog.showModal();}
document.querySelectorAll('[data-species]').forEach(b=>b.onclick=()=>{selected=b.dataset.species;$('#species-name').textContent=data[selected].name;$('#species-desc').textContent=data[selected].description;document.querySelectorAll('[data-species]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.species===selected)));});
$('#profile').onclick=()=>show(data[selected].name,data[selected].detail);
for(const id of ['about','about-hero'])$('#'+id).onclick=()=>show('Nhỏ bé nhưng diệu kỳ','Đại Dương Tí Hon bắt đầu từ tình yêu dành cho những sinh vật nhỏ bé và vẻ đẹp của biển. Chúng mình mong muốn tạo nên một không gian café thủy sinh mini, nơi bạn có thể chậm lại, quan sát và khám phá.');
dialog.querySelectorAll('.close,.close-bottom').forEach(b=>b.onclick=()=>dialog.close());dialog.addEventListener('close',()=>returnFocus?.focus());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
mountReefHero({stage:$('#reef-stage'),canvas:$('#ocean'),button:$('#motion'),status:$('#reef-status')});
