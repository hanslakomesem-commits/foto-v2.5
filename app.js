(() => {
'use strict';
const CM_TO_TWIP=567, EMU_PER_CM=360000, PREVIEW_PX_CM=28;
const sizes={
 '2x3':{name:'2 × 3 cm',w:2,h:3},
 '3x4':{name:'3 × 4 cm',w:3,h:4},
 '4x6':{name:'4 × 6 cm',w:4,h:6},
 '35x45':{name:'3,5 × 4,5 cm',w:3.5,h:4.5},
 '5x5':{name:'5 × 5 cm',w:5,h:5},
 'ktp':{name:'KTP 8,56 × 5,4 cm',w:8.56,h:5.4},
 'stnk':{name:'STNK 23 × 7,5 cm',w:23,h:7.5},
 '2r':{name:'2R 6,35 × 8,89 cm',w:6.35,h:8.89},
 '3r':{name:'3R 8,89 × 12,7 cm',w:8.89,h:12.7},
 '4r':{name:'4R 10,2 × 15,2 cm',w:10.2,h:15.2},
 '5r':{name:'5R 12,7 × 17,8 cm',w:12.7,h:17.8},
 '6r':{name:'6R 15,2 × 20,3 cm',w:15.2,h:20.3},
 '8r':{name:'8R 20,3 × 25,4 cm',w:20.3,h:25.4},
 '8rs':{name:'8RS 20,3 × 30,5 cm',w:20.3,h:30.5},
 '10r':{name:'10R 25,4 × 30,5 cm',w:25.4,h:30.5},
 '10rs':{name:'10RS 25,4 × 38,1 cm',w:25.4,h:38.1}
};
const templates=[
 {id:'hemat',name:'Paket Resmi Hemat',desc:'3×4 ×5 • 4×6 ×5 • 2×3 ×3',req:[['3x4',5],['4x6',5],['2x3',3]],tag:'Sesuai contoh Anda'},
 {id:'lamaran',name:'Lamaran Kerja',desc:'3×4 ×4 • 4×6 ×2',req:[['3x4',4],['4x6',2]]},
 {id:'sekolah',name:'Sekolah / Ijazah',desc:'3×4 ×6 • 2×3 ×4',req:[['3x4',6],['2x3',4]]},
 {id:'visa',name:'Visa / Passport',desc:'3,5×4,5 ×6',req:[['35x45',6]]},
 {id:'ktp',name:'KTP Copy',desc:'KTP ×2',req:[['ktp',2]]},
 {id:'reset',name:'Kosongkan Kebutuhan',desc:'Hapus semua ukuran/copy',req:[]}
];
const paperMap={A4:[21,29.7],F4:[21.5,33],LETTER:[21.59,27.94],LEGAL:[21.59,35.56]};
const state={photos:[],page:0,pages:[],editorPhoto:null,installPrompt:null};
const $=id=>document.getElementById(id), els={};
['fileInput','dropzone','photoList','templateGrid','statPhotos','statCopies','statPages','statWaste','aiStatus','aiAll','enhanceAll','bgAll','clearAll','selectAllPhotos','batchSize','applyBatchSize','smartFace','autoFaceRotate','autoEnhance','allowSlotRotate','autoDetectSize','defaultBg','faceRatio','fitMode','cutGuides','paperSize','orientation','dpi','gap','mTop','mRight','mBottom','mLeft','layoutSummary','paperPreview','prevPage','nextPage','pageLabel','savePreset','loadPreset','exportPng','downloadDocx','exportStatus','toast','installPwa','pdfModal','pdfFileName','pdfPageCount','pdfAllPages','pdfSelectedPages','pdfRangeWrap','pdfPageRange','pdfRangeHelp','pdfSelectionStatus','pdfCancel','pdfConvert','pdfClose','editorModal','editorPhotoName','editorCanvas','editorVariant','focusX','focusY','zoom','brightness','contrast','saturation','editorBg','editorAiFace','editorRemoveBg','applyEditor','closeEditor'].forEach(k=>els[k]=$(k));
function uid(){return crypto.randomUUID?.()||Math.random().toString(36).slice(2)}
function toast(m){els.toast.textContent=m;els.toast.classList.add('show');setTimeout(()=>els.toast.classList.remove('show'),2300)}
function status(m,t='neutral'){els.aiStatus.textContent=m;els.aiStatus.className=`status ${t}`}
function exportStatus(m,t='neutral'){els.exportStatus.textContent=m;els.exportStatus.className=`status ${t}`}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function readDataUrl(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}
function dims(src){return loadImg(src).then(i=>({width:i.naturalWidth,height:i.naturalHeight}))}

function cmFromPoints(pt){return pt*2.54/72}
function ratioDelta(a,b){return Math.abs(a-b)/Math.max(a,b,.0001)}
function autoSizeCandidates(){return Object.entries(sizes).map(([key,s])=>({key,...s,ratio:s.w/s.h}))}
function nearestSizeByRatio(w,h,physicalW=null,physicalH=null){
 const ratio=w/h,best={score:1e9,item:null,swapped:false};
 for(const item of autoSizeCandidates()){
   for(const swapped of [false,true]){
     const rw=swapped?item.h:item.w,rh=swapped?item.w:item.h,rr=rw/rh;
     let score=ratioDelta(ratio,rr)*6;
     if(physicalW&&physicalH){score+=Math.abs(physicalW-rw)/Math.max(rw,1)+Math.abs(physicalH-rh)/Math.max(rh,1)}
     if(score<best.score)Object.assign(best,{score,item,swapped});
   }
 }
 return best;
}
function detectAutoPrintSpec(name,w,h,meta={}){
 const lower=(name||'').toLowerCase();
 const physicalW=meta.physicalW||null,physicalH=meta.physicalH||null;
 const keywordMap=[['stnk','stnk'],['ktp','ktp'],['kartu tanda penduduk','ktp'],['10rs','10rs'],['10r','10r'],['8rs','8rs'],['8r','8r'],['6r','6r'],['5r','5r'],['4r','4r'],['3r','3r'],['2r','2r']];
 for(const [kw,key] of keywordMap){
   if(lower.includes(kw))return {key,label:sizes[key].name,source:`Nama file terdeteksi: ${kw.toUpperCase()}`,mode:'contain',confidence:'tinggi'};
 }
 if(physicalW&&physicalH){
   const exact=nearestSizeByRatio(physicalW,physicalH,physicalW,physicalH);
   if(exact.item && exact.score<0.35)return {key:exact.item.key,label:sizes[exact.item.key].name,source:`Ukuran PDF ${physicalW.toFixed(2)}×${physicalH.toFixed(2)} cm`,mode:'contain',confidence:'tinggi'};
 }
 const near=nearestSizeByRatio(w,h,null,null);
 if(near.item && near.score<0.16){
   const isDoc=['stnk','ktp','2r','3r','4r','5r','6r','8r','8rs','10r','10rs'].includes(near.item.key);
   return {key:near.item.key,label:sizes[near.item.key].name,source:`Rasio mirip ${sizes[near.item.key].name}`,mode:isDoc?'contain':null,confidence:near.score<0.06?'tinggi':'sedang'};
 }
 return {key:'3x4',label:sizes['3x4'].name,source:'Default 3 × 4 cm',mode:null,confidence:'default'};
}
function makeDetectedVariant(spec){return {id:uid(),key:spec.key,...sizes[spec.key],qty:1,label:sizes[spec.key].name}}
function makePhotoEntry(name,sourceUrl,d,meta={}){const detected=(els.autoDetectSize&&els.autoDetectSize.checked)?detectAutoPrintSpec(meta.fileName||name,d.width,d.height,meta):{key:'3x4',label:sizes['3x4'].name,source:'Manual / default',mode:null,confidence:'default'};return {id:uid(),name,sourceUrl,workingUrl:sourceUrl,width:d.width,height:d.height,variants:[makeDetectedVariant(detected)],rotation:0,fineRotation:0,face:null,focusX:50,focusY:50,zoom:100,brightness:100,contrast:100,saturation:100,bg:'original',bgRemoved:false,selected:false,preferredFit:detected.mode||null,detectedSizeKey:detected.key,detectedSizeLabel:detected.label,detectedSource:detected.source,detectedConfidence:detected.confidence,pdfPage:meta.pdfPage||null,physicalW:meta.physicalW||null,physicalH:meta.physicalH||null}}
function normalizeName(n='file'){return n.replace(/\.[^.]+$/,'')}
function parsePdfPageSpec(spec,total){
 const clean=String(spec||'').replace(/\s+/g,'');
 if(!clean)return [];
 const out=[];const seen=new Set();
 for(const token of clean.split(',').filter(Boolean)){
   if(/^\d+$/.test(token)){
     const n=+token;if(n<1||n>total)throw new Error(`Halaman ${n} di luar batas 1-${total}.`);
     if(!seen.has(n)){seen.add(n);out.push(n)}
     continue;
   }
   const m=token.match(/^(\d+)-(\d+)$/);
   if(!m)throw new Error(`Format "${token}" tidak dikenali.`);
   let x=+m[1],y=+m[2];
   if(x<1||y<1||x>total||y>total)throw new Error(`Rentang ${token} di luar batas 1-${total}.`);
   const step=x<=y?1:-1;
   for(let n=x;;n+=step){if(!seen.has(n)){seen.add(n);out.push(n)}if(n===y)break}
 }
 return out;
}
function choosePdfPages(fileName,total){
 return new Promise(resolve=>{
   let settled=false;
   const finish=value=>{if(settled)return;settled=true;els.pdfModal.classList.add('hidden');els.pdfModal.setAttribute('aria-hidden','true');cleanup();resolve(value)};
   const update=()=>{
     const selected=els.pdfSelectedPages.checked;
     els.pdfPageRange.disabled=!selected;
     els.pdfRangeWrap.classList.toggle('disabled',!selected);
     if(!selected){els.pdfSelectionStatus.textContent=`Semua ${total} halaman akan dikonversi.`;els.pdfSelectionStatus.className='status ok';return}
     try{const pages=parsePdfPageSpec(els.pdfPageRange.value,total);els.pdfSelectionStatus.textContent=pages.length?`${pages.length} halaman dipilih: ${pages.join(', ')}`:'Masukkan nomor halaman, misalnya 1,3,5-8.';els.pdfSelectionStatus.className=`status ${pages.length?'ok':'neutral'}`}catch(e){els.pdfSelectionStatus.textContent=e.message;els.pdfSelectionStatus.className='status err'}
   };
   const onConvert=()=>{if(els.pdfAllPages.checked)return finish(Array.from({length:total},(_,i)=>i+1));try{const pages=parsePdfPageSpec(els.pdfPageRange.value,total);if(!pages.length)throw new Error('Pilih minimal satu halaman.');finish(pages)}catch(e){els.pdfSelectionStatus.textContent=e.message;els.pdfSelectionStatus.className='status err'}};
   const onCancel=()=>finish(null);
   const cleanup=()=>{els.pdfAllPages.removeEventListener('change',update);els.pdfSelectedPages.removeEventListener('change',update);els.pdfPageRange.removeEventListener('input',update);els.pdfConvert.removeEventListener('click',onConvert);els.pdfCancel.removeEventListener('click',onCancel);els.pdfClose.removeEventListener('click',onCancel);els.pdfModal.querySelector('[data-pdf-close]').removeEventListener('click',onCancel)};
   els.pdfFileName.textContent=fileName;
   els.pdfPageCount.textContent=`${total} halaman`;
   els.pdfAllPages.checked=true;els.pdfSelectedPages.checked=false;els.pdfPageRange.value='';
   els.pdfModal.classList.remove('hidden');els.pdfModal.setAttribute('aria-hidden','false');
   els.pdfAllPages.addEventListener('change',update);els.pdfSelectedPages.addEventListener('change',update);els.pdfPageRange.addEventListener('input',update);els.pdfConvert.addEventListener('click',onConvert);els.pdfCancel.addEventListener('click',onCancel);els.pdfClose.addEventListener('click',onCancel);els.pdfModal.querySelector('[data-pdf-close]').addEventListener('click',onCancel);
   update();
 });
}
async function pdfToImages(file){
 if(typeof pdfjsLib==='undefined')throw new Error('Mesin PDF belum termuat. Pastikan internet aktif lalu coba lagi.');
 if(pdfjsLib.GlobalWorkerOptions)pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const buf=await file.arrayBuffer();
 const pdf=await pdfjsLib.getDocument({data:buf}).promise;
 const selectedPages=await choosePdfPages(file.name,pdf.numPages);
 if(!selectedPages){status(`PDF ${file.name} dibatalkan.`,'neutral');return []}
 const out=[];
 for(let idx=0;idx<selectedPages.length;idx++){
   const i=selectedPages[idx];
   status(`Mengubah PDF ke JPG: halaman ${i} (${idx+1}/${selectedPages.length})…`);
   const page=await pdf.getPage(i);
   const viewport=page.getViewport({scale:2});
   const canvas=document.createElement('canvas');
   canvas.width=Math.ceil(viewport.width);
   canvas.height=Math.ceil(viewport.height);
   const ctx=canvas.getContext('2d',{alpha:false});
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   await page.render({canvasContext:ctx,viewport,background:'#ffffff'}).promise;
   const sourceUrl=canvas.toDataURL('image/jpeg',0.95);
   const view=page.view||[0,0,viewport.width,viewport.height]; const pw=Math.abs((view[2]||viewport.width)-(view[0]||0)); const ph=Math.abs((view[3]||viewport.height)-(view[1]||0));
   out.push({name:`${normalizeName(file.name)}_halaman_${i}.jpg`,sourceUrl,d:{width:canvas.width,height:canvas.height},pdfPage:i,physicalW:cmFromPoints(pw),physicalH:cmFromPoints(ph),fileName:file.name});
 }
 return out;
}

function getPaper(){let [w,h]=paperMap[els.paperSize.value];if(els.orientation.value==='landscape')[w,h]=[h,w];return {w,h}}
function rowPackRules(){return els.orientation.value==='portrait'?{ '3x4':6, '4x6':5 }:{} }
function effectiveCompactSettings(){
 const base={ml:+els.mLeft.value||0,mr:+els.mRight.value||0,mt:+els.mTop.value||0,mb:+els.mBottom.value||0,gap:+els.gap.value||0};
 if(els.orientation.value!=='portrait')return base;
 const has4x6=state.photos.some(p=>p.variants.some(v=>v.key==='4x6'&&v.qty>0));
 if(has4x6){
   // 5 foto 4x6 = 20 cm. Gunakan margin dan gap kompak agar tetap ukuran asli.
   base.ml=Math.min(base.ml,0.2);base.mr=Math.min(base.mr,0.2);base.gap=Math.min(base.gap,0.1);
 }
 return base;
}
function settings(){const p=getPaper(),c=effectiveCompactSettings(),ml=c.ml,mr=c.mr,mt=c.mt,mb=c.mb;return {paper:p,ml,mr,mt,mb,innerW:p.w-ml-mr,innerH:p.h-mt-mb,gap:c.gap,dpi:+els.dpi.value||300,allowRotate:els.allowSlotRotate.checked,cut:els.cutGuides.value==='1',flow:els.orientation.value==='landscape'?'column':'row',rowRules:rowPackRules()}}
function requestLabel(v){return `${v.w}×${v.h} cm ×${v.qty}`}
function totalCopies(){return state.photos.reduce((n,p)=>n+p.variants.reduce((s,v)=>s+v.qty,0),0)}
function buildItems(){const out=[];for(const p of state.photos)for(const v of p.variants)for(let i=0;i<v.qty;i++)out.push({id:uid(),photoId:p.id,variantId:v.id,key:v.key,w:v.w,h:v.h,label:v.label||`${v.w}×${v.h}`});return out}
function recompute(){
 const s=settings(),items=buildItems();state.pages=items.length?ZainOptimizer.pack(items,s.innerW,s.innerH,s.gap,s.allowRotate,s.flow,s.rowRules):[];if(state.page>=state.pages.length)state.page=Math.max(0,state.pages.length-1);
 const used=items.reduce((a,i)=>a+i.w*i.h,0),cap=state.pages.length*s.innerW*s.innerH,eff=cap?Math.min(100,used/cap*100):0;
 els.statPhotos.textContent=state.photos.length;els.statCopies.textContent=totalCopies();els.statPages.textContent=state.pages.length;els.statWaste.textContent=eff.toFixed(0)+'%';
 const errors=state.pages.flatMap(p=>p.unplaced||[]),alur=s.flow==='row'?'kiri → kanan, lalu turun':'atas → bawah, lalu ke kanan';const compact=els.orientation.value==='portrait'&&state.photos.some(p=>p.variants.some(v=>v.key==='4x6'&&v.qty>0));els.layoutSummary.innerHTML=items.length?`<b>${items.length} cetakan → ${state.pages.length} halaman</b> • efisiensi area ±${eff.toFixed(1)}% • alur: <b>${alur}</b> • area kerja ${s.innerW.toFixed(2)}×${s.innerH.toFixed(2)} cm${compact?' • <b>Mode kompak 4×6 aktif: 5 foto/baris</b>':''}${errors.length?` • <span class="warn">${errors.length} item tidak muat</span>`:''}`:'Tambahkan kebutuhan ukuran pada foto untuk menghitung layout.';
 renderPreview();
}
function renderTemplates(){els.templateGrid.innerHTML=templates.map(t=>`<button class="template-card" data-id="${t.id}"><b>${t.name}</b><span>${t.desc}</span>${t.tag?`<em>${t.tag}</em>`:''}</button>`).join('');els.templateGrid.querySelectorAll('button').forEach(b=>b.onclick=()=>applyTemplate(b.dataset.id))}
function applyTemplate(id){if(!state.photos.length)return toast('Upload foto terlebih dahulu');const t=templates.find(x=>x.id===id);for(const p of state.photos)p.variants=t.req.map(([key,qty])=>({id:uid(),key,...sizes[key],qty,label:sizes[key].name}));renderPhotos();recompute();toast(`${t.name} diterapkan ke ${state.photos.length} foto`)}
async function addFiles(files){
 let added=0,pdfPages=0;
 for(const file of files){
   try{
     if(/^image\/(jpeg|png|webp)$/.test(file.type)){
       const sourceUrl=await readDataUrl(file),d=await dims(sourceUrl);
       state.photos.push(makePhotoEntry(file.name,sourceUrl,d,{fileName:file.name}));
       added++;
     }else if(file.type==='application/pdf' || /\.pdf$/i.test(file.name)){
       const pages=await pdfToImages(file);
       for(const pg of pages){state.photos.push(makePhotoEntry(pg.name,pg.sourceUrl,pg.d,pg));added++;pdfPages++;}
     }
   }catch(err){console.error(err);toast(`Gagal memproses ${file.name}`);status(`Gagal memproses ${file.name}: ${err.message}`,'err')}
 }
 renderPhotos();recompute();
 if(added){
   const msg=pdfPages?`Berhasil menambahkan ${added} item (${pdfPages} halaman dari PDF diubah ke JPG).`:`Berhasil menambahkan ${added} foto.`;
   status(msg,'ok');toast(msg);
   if(els.autoEnhance.checked)runEnhanceAll(false);
 }
}

function selectedPhotos(){return state.photos.filter(p=>p.selected)}
function syncSelectAllUi(){if(!els.selectAllPhotos)return;els.selectAllPhotos.checked=!!state.photos.length&&state.photos.every(p=>p.selected)}
function applyBatchSizeToSelected(){
 const selected=selectedPhotos();
 if(!selected.length)return toast('Pilih minimal satu foto terlebih dahulu');
 const key=els.batchSize.value,s=sizes[key];
 for(const p of selected){
   const totalQty=Math.max(1,p.variants.reduce((n,v)=>n+(+v.qty||0),0)||1);
   p.variants=[{id:uid(),key,...s,qty:totalQty,label:s.name}];
   p.preferredFit=['stnk','ktp','2r','3r','4r','5r','6r','8r','8rs','10r','10rs'].includes(key)?'contain':p.preferredFit;
 }
 renderPhotos();recompute();toast(`Ukuran ${s.name} diterapkan ke ${selected.length} foto terpilih`)
}
function variantRow(p,v){return `<div class="variant-row" data-vid="${v.id}"><select data-a="vsize">${Object.entries(sizes).map(([k,s])=>`<option value="${k}" ${v.key===k?'selected':''}>${s.name}</option>`).join('')}<option value="custom" ${v.key==='custom'?'selected':''}>Custom / Manual</option></select><input data-a="vw" type="number" step="0.1" min="1" value="${v.w}"><span>×</span><input data-a="vh" type="number" step="0.1" min="1" value="${v.h}"><span>cm</span><input data-a="vqty" class="qty" type="number" min="1" max="99" value="${v.qty}"><span>lembar</span><button data-a="vdel" class="icon-btn danger">×</button></div>`}
function renderPhotos(){
 if(!state.photos.length){els.photoList.className='photo-list empty-state';els.photoList.textContent='Belum ada foto.';syncSelectAllUi();return}els.photoList.className='photo-list';
 els.photoList.innerHTML=state.photos.map(p=>`<article class="photo-card ${p.selected?'selected-card':''}" data-id="${p.id}"><div class="photo-head-row"><label class="photo-select"><input type="checkbox" data-a="pick" ${p.selected?'checked':''}></label><div class="photo-top"><div class="thumb-wrap"><img src="${p.workingUrl}" style="filter:brightness(${p.brightness}%) contrast(${p.contrast}%) saturate(${p.saturation}%);transform:rotate(${p.rotation+p.fineRotation}deg)"><span class="ai-dot ${p.face?'ok':''}">${p.face?'AI ✓':'AI'}</span></div><div class="photo-meta"><b title="${esc(p.name)}">${esc(p.name)}</b><small>${p.width}×${p.height}px ${p.bgRemoved?'• BG transparan':''}${p.pdfPage?` • PDF hal ${p.pdfPage}`:''}</small><small><b>Deteksi ukuran:</b> ${esc(p.detectedSizeLabel||'3 × 4 cm')} <span class="muted">(${esc(p.detectedSource||'Default')})</span></small><small><b>Mode isi:</b> ${(()=>{const m=(p.preferredFit||els.fitMode.value);return m==='contain'?'Fit Utuh — tidak dipotong':m==='stretch'?'Resize Presisi — penuh exact walau agak gepeng':'Smart Crop Presisi'})()}</small><div class="photo-actions"><button data-a="edit">Preview Wajah</button><button data-a="face">AI Wajah</button><button data-a="bg">Hapus BG</button><button data-a="enhance">Koreksi</button><button data-a="remove" class="danger">Hapus</button></div></div></div></div><div class="variants"><div class="variants-head"><b>Kebutuhan cetak</b><button data-a="addvar">＋ Tambah ukuran manual</button></div>${p.variants.map(v=>variantRow(p,v)).join('')}</div></article>`).join('');
 els.photoList.querySelectorAll('.photo-card').forEach(card=>wireCard(card,state.photos.find(p=>p.id===card.dataset.id)));
 syncSelectAllUi();
}
function wireCard(card,p){
 const pick=card.querySelector('[data-a=pick]'); if(pick) pick.onchange=()=>{p.selected=pick.checked;syncSelectAllUi();renderPhotos();};
 card.querySelector('[data-a=edit]').onclick=()=>openEditor(p);card.querySelector('[data-a=face]').onclick=()=>runFace(p,true);card.querySelector('[data-a=bg]').onclick=()=>runBg(p,true);card.querySelector('[data-a=enhance]').onclick=()=>runEnhance(p,true);card.querySelector('[data-a=remove]').onclick=()=>{if(p.workingUrl.startsWith('blob:'))URL.revokeObjectURL(p.workingUrl);state.photos=state.photos.filter(x=>x.id!==p.id);renderPhotos();recompute()};card.querySelector('[data-a=addvar]').onclick=()=>{p.variants.push({id:uid(),key:'3x4',...sizes['3x4'],qty:1,label:'3 × 4 cm'});renderPhotos();recompute()};
 card.querySelectorAll('.variant-row').forEach(row=>{const v=p.variants.find(x=>x.id===row.dataset.vid);const sz=row.querySelector('[data-a=vsize]'),w=row.querySelector('[data-a=vw]'),h=row.querySelector('[data-a=vh]'),q=row.querySelector('[data-a=vqty]');sz.onchange=()=>{if(sz.value!=='custom'){Object.assign(v,{key:sz.value,...sizes[sz.value],label:sizes[sz.value].name});p.preferredFit=['stnk','ktp','2r','3r','4r','5r','6r','8r','8rs','10r','10rs'].includes(sz.value)?'contain':p.preferredFit;renderPhotos()}else v.key='custom';recompute()};w.onchange=()=>{v.w=Math.max(1,+w.value||1);v.key='custom';recompute()};h.onchange=()=>{v.h=Math.max(1,+h.value||1);v.key='custom';recompute()};q.onchange=()=>{v.qty=Math.max(1,Math.min(99,+q.value||1));recompute()};row.querySelector('[data-a=vdel]').onclick=()=>{p.variants=p.variants.filter(x=>x.id!==v.id);renderPhotos();recompute()}});
}
async function runFace(p,notify=false){try{status(`AI mendeteksi wajah: ${p.name}…`);const r=await ZainLocalAI.detectFace(p.sourceUrl);p.rotation=r.rotation;p.fineRotation=els.autoFaceRotate.checked?r.fineRotation:0;p.face=r;p.focusX=(r.cx||0.5)*100;const yFocus=(r.eyeY??r.noseY??r.cy??0.45);p.focusY=yFocus*100;status(`Wajah ditemukan pada ${p.name}.`,'ok');renderPhotos();recompute();if(notify)toast('Auto crop wajah presisi diterapkan')}catch(e){status(e.message,'err');if(notify)toast(e.message)}}
async function runEnhance(p,notify=false){try{const r=await ZainLocalAI.autoCorrect(p.sourceUrl);Object.assign(p,r);renderPhotos();recompute();if(notify)toast('Koreksi otomatis diterapkan')}catch(e){if(notify)toast('Koreksi gagal')}}
async function runBg(p,notify=false){try{status(`AI menghapus background: ${p.name}…`);const r=await ZainLocalAI.removeBackground(p.sourceUrl);if(p.workingUrl.startsWith('blob:'))URL.revokeObjectURL(p.workingUrl);p.workingUrl=r.url;p.bgRemoved=true;if(p.bg==='original')p.bg=els.defaultBg.value==='original'?'#ffffff':els.defaultBg.value;status(`Background ${p.name} selesai.`,'ok');renderPhotos();recompute();if(notify)toast('Background berhasil dihapus')}catch(e){status(e.message,'err');if(notify)toast(e.message)}}
async function runFaceAll(){for(let i=0;i<state.photos.length;i++){status(`AI wajah ${i+1}/${state.photos.length}…`);await runFace(state.photos[i],false)}status('AI wajah batch selesai.','ok')}
async function runEnhanceAll(notify=true){for(const p of state.photos)await runEnhance(p,false);if(notify){status('Koreksi foto batch selesai.','ok');toast('Semua foto dikoreksi')}}
async function runBgAll(){for(let i=0;i<state.photos.length;i++){status(`Hapus background ${i+1}/${state.photos.length}…`);await runBg(state.photos[i],false)}status('Background batch selesai.','ok')}
function photoById(id){return state.photos.find(p=>p.id===id)}
function renderPreview(){const s=settings(),page=state.pages[state.page];els.pageLabel.textContent=state.pages.length?`${state.page+1} / ${state.pages.length}`:'0 / 0';const scale=Math.min(1,740/(s.paper.h*PREVIEW_PX_CM));els.paperPreview.style.width=s.paper.w*PREVIEW_PX_CM*scale+'px';els.paperPreview.style.height=s.paper.h*PREVIEW_PX_CM*scale+'px';if(!page||!page.items.length){els.paperPreview.innerHTML='<div class="preview-empty">Belum ada layout.</div>';return}const innerLeft=s.ml*PREVIEW_PX_CM*scale,innerTop=s.mt*PREVIEW_PX_CM*scale;els.paperPreview.innerHTML=page.items.map(it=>{const p=photoById(it.photoId),left=innerLeft+it.x*PREVIEW_PX_CM*scale,top=innerTop+it.y*PREVIEW_PX_CM*scale,w=it.placedW*PREVIEW_PX_CM*scale,h=it.placedH*PREVIEW_PX_CM*scale;const bg=p.bg==='original'?'#fff':p.bg;return `<div class="placed-photo ${s.cut?'guides':''}" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;background:${bg}" title="${esc(p.name)} • ${it.label}"><img src="${p.workingUrl}" style="object-position:${p.focusX}% ${p.focusY}%;filter:brightness(${p.brightness}%) contrast(${p.contrast}%) saturate(${p.saturation}%);transform:${it.rotated?'rotate(90deg)':''}"><span>${it.label}</span></div>`}).join('')}
async function orientedSourceCanvas(p){const im=await loadImg(p.workingUrl),deg=p.rotation+p.fineRotation,rad=deg*Math.PI/180,sw=im.naturalWidth,sh=im.naturalHeight,cos=Math.abs(Math.cos(rad)),sin=Math.abs(Math.sin(rad)),ow=Math.ceil(sw*cos+sh*sin),oh=Math.ceil(sw*sin+sh*cos),c=document.createElement('canvas');c.width=ow;c.height=oh;const ctx=c.getContext('2d');ctx.translate(ow/2,oh/2);ctx.rotate(rad);ctx.filter=`brightness(${p.brightness}%) contrast(${p.contrast}%) saturate(${p.saturation}%)`;ctx.drawImage(im,-sw/2,-sh/2);return c}
async function renderPhotoCanvas(p,v,dpi){const tw=Math.max(30,Math.round(v.w/2.54*dpi)),th=Math.max(30,Math.round(v.h/2.54*dpi)),src=await orientedSourceCanvas(p),c=document.createElement('canvas');c.width=tw;c.height=th;const ctx=c.getContext('2d');ctx.fillStyle=p.bg==='original'?'#ffffff':p.bg;ctx.fillRect(0,0,tw,th);const mode=(p.preferredFit||els.fitMode.value);if(mode==='stretch'){ctx.drawImage(src,0,0,tw,th);return c}const contain=mode==='contain';let scale=contain?Math.min(tw/src.width,th/src.height):Math.max(tw/src.width,th/src.height);if(!contain&&els.smartFace.checked&&p.face){const desired=+els.faceRatio.value||.43;const faceH=Math.max(.01,p.face.h*src.height);const faceScale=(th*desired)/faceH;scale=Math.max(scale,Math.min(faceScale,scale*1.85))}scale*=p.zoom/100;const dw=src.width*scale,dh=src.height*scale;const anchorY=(!contain&&els.smartFace.checked&&p.face&&(p.face.eyeY||p.face.noseY))?.36:.43;let dx=tw/2-(p.focusX/100)*dw,dy=th*anchorY-(p.focusY/100)*dh;if(contain){dx=(tw-dw)/2;dy=(th-dh)/2}ctx.drawImage(src,dx,dy,dw,dh);return c}
async function renderPageCanvas(pageIndex,dpiOverride=null){const s=settings(),dpi=dpiOverride||s.dpi,page=state.pages[pageIndex];if(!page)throw new Error('Halaman kosong.');const pxW=Math.round(s.innerW/2.54*dpi),pxH=Math.round(s.innerH/2.54*dpi),c=document.createElement('canvas');c.width=pxW;c.height=pxH;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,pxW,pxH);for(let i=0;i<page.items.length;i++){const it=page.items[i],p=photoById(it.photoId),v=p.variants.find(x=>x.id===it.variantId)||{w:it.rotated?it.placedH:it.placedW,h:it.rotated?it.placedW:it.placedH};exportStatus(`Render halaman ${pageIndex+1}: foto ${i+1}/${page.items.length}…`);const pc=await renderPhotoCanvas(p,v,dpi),x=Math.round(it.x/2.54*dpi),y=Math.round(it.y/2.54*dpi),w=Math.round(it.placedW/2.54*dpi),h=Math.round(it.placedH/2.54*dpi);ctx.save();if(it.rotated){ctx.translate(x+w/2,y+h/2);ctx.rotate(Math.PI/2);ctx.drawImage(pc,-h/2,-w/2,h,w)}else ctx.drawImage(pc,x,y,w,h);ctx.restore();if(s.cut){ctx.strokeStyle='#7c8796';ctx.lineWidth=Math.max(1,dpi/300);ctx.strokeRect(x+.5,y+.5,w-1,h-1)}}return c}
async function renderPlacedCanvas(it,dpi){
 const s=settings(),p=photoById(it.photoId),v=p.variants.find(x=>x.id===it.variantId)||{w:it.rotated?it.placedH:it.placedW,h:it.rotated?it.placedW:it.placedH};
 const base=await renderPhotoCanvas(p,v,dpi);
 if(!it.rotated){
   if(s.cut){const ctx=base.getContext('2d');ctx.strokeStyle='#7c8796';ctx.lineWidth=Math.max(1,dpi/300);ctx.strokeRect(.5,.5,base.width-1,base.height-1)}
   return base;
 }
 const cw=Math.max(1,Math.round(it.placedW/2.54*dpi)),ch=Math.max(1,Math.round(it.placedH/2.54*dpi)),c=document.createElement('canvas');
 c.width=cw;c.height=ch;
 const ctx=c.getContext('2d');
 ctx.fillStyle=p.bg==='original'?'#ffffff':p.bg;ctx.fillRect(0,0,cw,ch);
 ctx.translate(cw/2,ch/2);ctx.rotate(Math.PI/2);ctx.drawImage(base,-base.width/2,-base.height/2);
 ctx.setTransform(1,0,0,1,0,0);
 if(s.cut){ctx.strokeStyle='#7c8796';ctx.lineWidth=Math.max(1,dpi/300);ctx.strokeRect(.5,.5,cw-1,ch-1)}
 return c;
}
function xmlHeader(){return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'}
function emptyParagraph(pageBreak=false){return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${pageBreak?'<w:pageBreakBefore/>':''}</w:pPr><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>`}
function anchorImage(rId,cx,cy,x,y,id,name){return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="${esc(name)}"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${esc(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`}
async function buildDocx(){
 if(typeof JSZip==='undefined')throw new Error('JSZip belum termuat. Pastikan internet aktif.');
 if(!state.pages.length)throw new Error('Belum ada layout.');
 const s=settings(),zip=new JSZip(),rels=[],body=[];
 let relCounter=1,docCounter=1;
 const media=zip.folder('word').folder('media');
 for(let i=0;i<state.pages.length;i++){
   if(i>0)body.push(emptyParagraph(true));
   const page=state.pages[i];
   for(let j=0;j<page.items.length;j++){
     const it=page.items[j],p=photoById(it.photoId);
     exportStatus(`Menyusun DOCX halaman ${i+1}: foto ${j+1}/${page.items.length}…`);
     const c=await renderPlacedCanvas(it,s.dpi),blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.94)),bytes=new Uint8Array(await blob.arrayBuffer());
     const name=`p${i+1}_foto${j+1}.jpg`,rId=`rId${relCounter++}`;
     media.file(name,bytes);
     rels.push(`<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
     const x=Math.round((s.ml+it.x)*EMU_PER_CM),y=Math.round((s.mt+it.y)*EMU_PER_CM),cx=Math.round(it.placedW*EMU_PER_CM),cy=Math.round(it.placedH*EMU_PER_CM);
     body.push(anchorImage(rId,cx,cy,x,y,docCounter++,`${normalizeName(p.name)}_${it.label}_${j+1}`));
   }
   body.push(emptyParagraph(false));
 }
 const pgW=Math.round(s.paper.w*CM_TO_TWIP),pgH=Math.round(s.paper.h*CM_TO_TWIP);
 const doc=`${xmlHeader()}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="${pgW}" w:h="${pgH}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
 zip.file('[Content_Types].xml',`${xmlHeader()}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
 zip.folder('_rels').file('.rels',`${xmlHeader()}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
 zip.folder('word').file('document.xml',doc);
 zip.folder('word').folder('_rels').file('document.xml.rels',`${xmlHeader()}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}})
}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
async function downloadDocx(){try{els.downloadDocx.disabled=true;exportStatus('Menyusun DOCX…');const b=await buildDocx();downloadBlob(b,'ZAINNET_Photo_Grid_AI_Pro_V2.4.docx');exportStatus('DOCX berhasil dibuat.','ok');toast('DOCX berhasil diunduh')}catch(e){console.error(e);exportStatus(e.message,'err');toast(e.message)}finally{els.downloadDocx.disabled=false}}
async function exportPng(){try{const c=await renderPageCanvas(state.page,200),b=await new Promise(r=>c.toBlob(r,'image/png'));downloadBlob(b,`ZAINNET_Page_${state.page+1}.png`);toast('PNG halaman diunduh')}catch(e){toast(e.message)}}
function openEditor(p){state.editorPhoto=p;els.editorModal.classList.remove('hidden');els.editorModal.setAttribute('aria-hidden','false');els.editorPhotoName.textContent=p.name;els.focusX.value=p.focusX;els.focusY.value=p.focusY;els.zoom.value=p.zoom;els.brightness.value=p.brightness;els.contrast.value=p.contrast;els.saturation.value=p.saturation;els.editorBg.value=p.bg;els.editorVariant.innerHTML=p.variants.length?p.variants.map(v=>`<option value="${v.id}">${requestLabel(v)}</option>`):'<option>3×4 cm</option>';drawEditor()}
function closeEditor(){els.editorModal.classList.add('hidden');els.editorModal.setAttribute('aria-hidden','true');state.editorPhoto=null}
async function drawEditor(){const p=state.editorPhoto;if(!p)return;const v=p.variants.find(x=>x.id===els.editorVariant.value)||p.variants[0]||{w:3,h:4};const ratio=v.w/v.h,c=els.editorCanvas;c.width=450;c.height=Math.round(450/ratio);const temp=await renderPhotoCanvas(p,v,150);const ctx=c.getContext('2d');ctx.drawImage(temp,0,0,c.width,c.height)}
function syncEditorLive(){const p=state.editorPhoto;if(!p)return;p.focusX=+els.focusX.value;p.focusY=+els.focusY.value;p.zoom=+els.zoom.value;p.brightness=+els.brightness.value;p.contrast=+els.contrast.value;p.saturation=+els.saturation.value;p.bg=els.editorBg.value;drawEditor()}
async function editorFace(){if(state.editorPhoto){await runFace(state.editorPhoto,false);els.focusX.value=state.editorPhoto.focusX;els.focusY.value=state.editorPhoto.focusY;drawEditor()}}
async function editorBg(){if(state.editorPhoto){await runBg(state.editorPhoto,false);drawEditor()}}
function presetData(){return {paperSize:els.paperSize.value,orientation:els.orientation.value,dpi:els.dpi.value,gap:els.gap.value,mTop:els.mTop.value,mRight:els.mRight.value,mBottom:els.mBottom.value,mLeft:els.mLeft.value,smartFace:els.smartFace.checked,autoFaceRotate:els.autoFaceRotate.checked,autoEnhance:els.autoEnhance.checked,allowSlotRotate:els.allowSlotRotate.checked,autoDetectSize:els.autoDetectSize.checked,defaultBg:els.defaultBg.value,faceRatio:els.faceRatio.value,fitMode:els.fitMode.value,cutGuides:els.cutGuides.value}}
function savePreset(){localStorage.setItem('zainnet_photo_ai_preset',JSON.stringify(presetData()));toast('Preset disimpan')}
function loadPreset(){const raw=localStorage.getItem('zainnet_photo_ai_preset');if(!raw)return toast('Belum ada preset');const p=JSON.parse(raw);for(const [k,v] of Object.entries(p)){if(els[k]){if(typeof v==='boolean')els[k].checked=v;else els[k].value=v}}recompute();toast('Preset dimuat')}
function wire(){els.fileInput.onchange=async e=>{const files=[...e.target.files];e.target.value='';if(files.length)await addFiles(files)};['dragenter','dragover'].forEach(ev=>els.dropzone.addEventListener(ev,e=>{e.preventDefault();els.dropzone.classList.add('drag')}));['dragleave','drop'].forEach(ev=>els.dropzone.addEventListener(ev,e=>{e.preventDefault();els.dropzone.classList.remove('drag')}));els.dropzone.addEventListener('drop',e=>addFiles([...e.dataTransfer.files]));els.aiAll.onclick=runFaceAll;els.enhanceAll.onclick=()=>runEnhanceAll(true);els.bgAll.onclick=runBgAll;els.applyBatchSize.onclick=applyBatchSizeToSelected;els.selectAllPhotos.onchange=()=>{const on=els.selectAllPhotos.checked;state.photos.forEach(p=>p.selected=on);renderPhotos();recompute()};els.clearAll.onclick=()=>{state.photos.forEach(p=>{if(p.workingUrl.startsWith('blob:'))URL.revokeObjectURL(p.workingUrl)});state.photos=[];renderPhotos();recompute()};[els.paperSize,els.orientation,els.dpi,els.gap,els.mTop,els.mRight,els.mBottom,els.mLeft,els.allowSlotRotate,els.cutGuides,els.faceRatio,els.fitMode,els.smartFace,els.autoDetectSize].forEach(e=>e.addEventListener('input',recompute));els.prevPage.onclick=()=>{state.page=Math.max(0,state.page-1);renderPreview()};els.nextPage.onclick=()=>{state.page=Math.min(Math.max(0,state.pages.length-1),state.page+1);renderPreview()};els.downloadDocx.onclick=downloadDocx;els.exportPng.onclick=exportPng;els.savePreset.onclick=savePreset;els.loadPreset.onclick=loadPreset;els.closeEditor.onclick=closeEditor;els.editorModal.querySelector('[data-close]').onclick=closeEditor;[els.focusX,els.focusY,els.zoom,els.brightness,els.contrast,els.saturation,els.editorBg,els.editorVariant].forEach(e=>e.addEventListener('input',syncEditorLive));els.editorAiFace.onclick=editorFace;els.editorRemoveBg.onclick=editorBg;els.applyEditor.onclick=()=>{renderPhotos();recompute();closeEditor();toast('Pengaturan wajah diterapkan')};window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;els.installPwa.classList.remove('hidden')});els.installPwa.onclick=async()=>{if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;els.installPwa.classList.add('hidden')}};if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
renderTemplates();wire();renderPhotos();recompute();
})();
