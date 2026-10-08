(function(global){
  'use strict';
  const MP_BASE_FACE='https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/';
  const MP_BASE_SEG='https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/';
  let faceMesh=null, faceResolve=null, faceReject=null, faceBusy=Promise.resolve();
  let segmenter=null, segResolve=null, segReject=null, segBusy=Promise.resolve();
  function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>res(im);im.onerror=rej;im.src=src})}
  function rotatedCanvas(im,deg){
    const rad=deg*Math.PI/180,sw=im.naturalWidth||im.width,sh=im.naturalHeight||im.height;
    const swap=Math.abs(deg)%180===90,c=document.createElement('canvas');c.width=swap?sh:sw;c.height=swap?sw:sh;
    const ctx=c.getContext('2d');ctx.translate(c.width/2,c.height/2);ctx.rotate(rad);ctx.drawImage(im,-sw/2,-sh/2);return c;
  }
  function initFace(){
    if(faceMesh)return faceMesh;
    if(typeof FaceMesh==='undefined')throw new Error('Model wajah belum termuat. Pastikan internet aktif pada pemakaian AI pertama.');
    faceMesh=new FaceMesh({locateFile:f=>MP_BASE_FACE+f});
    faceMesh.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.55,minTrackingConfidence:.5});
    faceMesh.onResults(r=>{if(faceResolve){const fn=faceResolve;faceResolve=null;faceReject=null;fn(r)}});
    return faceMesh;
  }
  function sendFace(image){
    return new Promise(async(res,rej)=>{try{initFace();faceResolve=res;faceReject=rej;await faceMesh.send({image})}catch(e){faceResolve=null;faceReject=null;rej(e)}});
  }
  async function detectFace(src){
    return faceBusy=faceBusy.then(async()=>{
      const im=await loadImg(src);let best=null;
      for(const rotation of [0,90,270,180]){
        const c=rotatedCanvas(im,rotation);const r=await sendFace(c);const lm=r.multiFaceLandmarks?.[0];if(!lm)continue;
        let minX=1,minY=1,maxX=0,maxY=0;for(const p of lm){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}
        const left=lm[33]||lm[130],right=lm[263]||lm[359];const angle=left&&right?Math.atan2(right.y-left.y,right.x-left.x)*180/Math.PI:0;
        const eyeY=left&&right?(left.y+right.y)/2:null;
        const nose=lm[1]||lm[4]||null;
        const box={x:minX,y:minY,w:maxX-minX,h:maxY-minY,cx:(minX+maxX)/2,cy:(minY+maxY)/2,eyeY,noseY:nose?nose.y:null};
        const score=box.w*box.h;
        const candidate={rotation,fineRotation:-angle,...box,score};if(!best||candidate.score>best.score)best=candidate;
        if(score>.07)break;
      }
      if(!best)throw new Error('Wajah tidak terdeteksi. Gunakan Preview Wajah untuk mengatur crop manual.');
      return best;
    });
  }
  function initSegmenter(){
    if(segmenter)return segmenter;
    if(typeof SelfieSegmentation==='undefined')throw new Error('Model background belum termuat. Pastikan internet aktif pada pemakaian AI pertama.');
    segmenter=new SelfieSegmentation({locateFile:f=>MP_BASE_SEG+f});segmenter.setOptions({modelSelection:1,selfieMode:false});
    segmenter.onResults(r=>{if(segResolve){const fn=segResolve;segResolve=null;segReject=null;fn(r)}});return segmenter;
  }
  function sendSeg(image){return new Promise(async(res,rej)=>{try{initSegmenter();segResolve=res;segReject=rej;await segmenter.send({image})}catch(e){segResolve=null;segReject=null;rej(e)}})}
  async function removeBackground(src){
    return segBusy=segBusy.then(async()=>{
      const im=await loadImg(src);const r=await sendSeg(im);if(!r.segmentationMask)throw new Error('Mask background tidak tersedia.');
      const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d');
      ctx.drawImage(r.segmentationMask,0,0,c.width,c.height);ctx.globalCompositeOperation='source-in';ctx.drawImage(im,0,0,c.width,c.height);ctx.globalCompositeOperation='source-over';
      return new Promise(resolve=>c.toBlob(blob=>resolve({blob,url:URL.createObjectURL(blob)}),'image/png'));
    });
  }
  async function autoCorrect(src){
    const im=await loadImg(src),c=document.createElement('canvas');c.width=96;c.height=96;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,96,96);const d=ctx.getImageData(0,0,96,96).data;
    let sum=0,sum2=0,sat=0,n=0;for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2],y=.2126*r+.7152*g+.0722*b;sum+=y;sum2+=y*y;sat+=Math.max(r,g,b)-Math.min(r,g,b);n++}
    const mean=sum/n,std=Math.sqrt(Math.max(0,sum2/n-mean*mean)),meanSat=sat/n;
    const brightness=Math.round(Math.max(85,Math.min(125,100+(132-mean)*.18)));
    const contrast=Math.round(Math.max(90,Math.min(130,100+(58-std)*.32)));
    const saturation=Math.round(Math.max(95,Math.min(125,100+(42-meanSat)*.15)));
    return {brightness,contrast,saturation};
  }
  global.ZainLocalAI={detectFace,removeBackground,autoCorrect};
})(window);
