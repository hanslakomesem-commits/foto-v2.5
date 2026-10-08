(function(global){
  'use strict';
  function intersects(a,b){return !(b.x>=a.x+a.w||b.x+b.w<=a.x||b.y>=a.y+a.h||b.y+b.h<=a.y)}
  function contains(a,b){return b.x>=a.x&&b.y>=a.y&&b.x+b.w<=a.x+a.w&&b.y+b.h<=a.y+a.h}
  function prune(rects){
    const out=[];
    for(let i=0;i<rects.length;i++){
      let skip=false;
      for(let j=0;j<rects.length;j++){if(i!==j&&contains(rects[j],rects[i])){skip=true;break}}
      if(!skip&&rects[i].w>0.05&&rects[i].h>0.05)out.push(rects[i]);
    }
    return out;
  }
  function splitFree(free,used){
    if(!intersects(free,used))return [free];
    const r=[];
    if(used.x>free.x)r.push({x:free.x,y:free.y,w:used.x-free.x,h:free.h});
    if(used.x+used.w<free.x+free.w)r.push({x:used.x+used.w,y:free.y,w:free.x+free.w-(used.x+used.w),h:free.h});
    if(used.y>free.y)r.push({x:free.x,y:free.y,w:free.w,h:used.y-free.y});
    if(used.y+used.h<free.y+free.h)r.push({x:free.x,y:used.y+used.h,w:free.w,h:free.y+free.h-(used.y+used.h)});
    return r;
  }
  function placementScore(f,o,gap,flow){
    const rw=o.w+gap,rh=o.h+gap;
    const remW=Math.max(0,f.w-rw), remH=Math.max(0,f.h-rh);
    const area=f.w*f.h-rw*rh;
    // Portrait/row: selesaikan baris paling atas dari kiri ke kanan dahulu.
    // Landscape/column: selesaikan kolom paling kiri dari atas ke bawah dahulu.
    if(flow==='column'){
      return f.x*1e12 + f.y*1e9 + remH*1e6 + remW*1e3 + area;
    }
    return f.y*1e12 + f.x*1e9 + remW*1e6 + remH*1e3 + area;
  }
  function bestPlacement(page,item,gap,allowRotate,flow){
    const options=[{w:item.w,h:item.h,rotated:false}];
    if(allowRotate&&Math.abs(item.w-item.h)>.001)options.push({w:item.h,h:item.w,rotated:true});
    let best=null;
    for(const f of page.free){
      for(const o of options){
        const rw=o.w+gap,rh=o.h+gap;
        if(rw<=f.w+.0001&&rh<=f.h+.0001){
          const score=placementScore(f,o,gap,flow);
          if(!best||score<best.score)best={x:f.x,y:f.y,w:o.w,h:o.h,rw,rh,rotated:o.rotated,score};
        }
      }
    }
    return best;
  }
  function commit(page,p,item){
    const used={x:p.x,y:p.y,w:p.rw,h:p.rh};
    let next=[];
    for(const f of page.free)next.push(...splitFree(f,used));
    page.free=prune(next);
    page.items.push({...item,x:p.x,y:p.y,placedW:p.w,placedH:p.h,rotated:p.rotated});
  }
  function pack(items,width,height,gap=.15,allowRotate=true,flow='row',rowRules={}){
    // Mode khusus pas foto portrait: susun ukuran yang memiliki target jumlah/baris lebih dulu.
    // 3x4 -> 6/baris, 4x6 -> 5/baris. Ukuran fisik tidak dikecilkan.
    const pages=[];
    const ruled=[],rest=[];
    for(const it of items){if(flow==='row'&&rowRules&&rowRules[it.key])ruled.push(it);else rest.push(it)}

    function ensurePage(){const p={free:[{x:0,y:0,w:width+gap,h:height+gap}],items:[],flow,manualRows:[]};pages.push(p);return p}
    function collides(page,r){return page.items.some(it=>intersects({x:it.x,y:it.y,w:it.placedW+gap,h:it.placedH+gap},r))}
    function placeFixedRow(item,limit){
      // Cari baris existing yang sama key dan belum penuh.
      for(const page of pages){
        for(const row of page.manualRows){
          if(row.key!==item.key||row.count>=limit)continue;
          const x=row.x0+row.count*(item.w+gap),y=row.y;
          const r={x,y,w:item.w+gap,h:item.h+gap};
          if(x+item.w<=width+.0001 && y+item.h<=height+.0001 && !collides(page,r)){
            page.items.push({...item,x,y,placedW:item.w,placedH:item.h,rotated:false});row.count++;return true;
          }
        }
      }
      // Buat baris baru pada halaman terakhir / halaman baru.
      let page=pages[pages.length-1]||ensurePage();
      function findY(pg){
        if(!pg.items.length)return 0;
        let y=0;
        // lanjut di bawah seluruh item yang sudah ada supaya urutan baris stabil
        for(const it of pg.items)y=Math.max(y,it.y+it.placedH+gap);
        return y;
      }
      let y=findY(page);
      if(y+item.h>height+.0001){page=ensurePage();y=0}
      const row={key:item.key,y,x0:0,count:0,limit};page.manualRows.push(row);
      page.items.push({...item,x:0,y,placedW:item.w,placedH:item.h,rotated:false});row.count=1;
      return true;
    }

    // Kelompokkan agar 4x6 dan 3x4 tetap membentuk baris penuh semaksimal mungkin.
    ruled.sort((a,b)=>String(a.key).localeCompare(String(b.key)));
    for(const item of ruled)placeFixedRow(item,rowRules[item.key]);

    // Bangun ulang free rectangles dari posisi fixed agar item lain tetap bisa mengisi sisa ruang.
    for(const page of pages){
      page.free=[{x:0,y:0,w:width+gap,h:height+gap}];
      for(const it of page.items){
        const used={x:it.x,y:it.y,w:it.placedW+gap,h:it.placedH+gap};
        let next=[];for(const f of page.free)next.push(...splitFree(f,used));page.free=prune(next);
      }
    }

    const sorted=[...rest].sort((a,b)=>(b.w*b.h)-(a.w*a.h)||Math.max(b.w,b.h)-Math.max(a.w,a.h));
    for(const item of sorted){
      let choice=null;
      for(let i=0;i<pages.length;i++){
        const p=bestPlacement(pages[i],item,gap,allowRotate,flow);
        if(p&&(!choice||p.score<choice.p.score))choice={page:pages[i],p};
      }
      if(!choice){
        const page=ensurePage();
        const p=bestPlacement(page,item,gap,allowRotate,flow);
        if(!p){item.error=`Ukuran ${item.w}×${item.h} cm tidak muat di area ${width.toFixed(2)}×${height.toFixed(2)} cm`;page.unplaced=(page.unplaced||[]).concat(item);continue}
        choice={page,p};
      }
      commit(choice.page,choice.p,item);
    }
    return pages;
  }
  global.ZainOptimizer={pack};
})(window);
