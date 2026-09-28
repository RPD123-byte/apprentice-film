(() => {
  const target1=[[69,150],[161,180],[187,259],[264,284],[293,362],[369,440],[471,535],[540,709],[713,782],[791,811]];
  const target2=[[69,254],[260,319],[342,471],[498,567],[576,596],[603,675],[684,752],[758,845]];
  const cv=document.createElement('canvas'); cv.width=1000; cv.height=120; const c=cv.getContext('2d');
  function spans(text,size,ls,x0){
    c.setTransform(1,0,0,1,0,0); c.fillStyle='#000'; c.fillRect(0,0,1000,120);
    c.font=`900 ${size}px Archivo`; c.fontStretch='expanded'; c.letterSpacing=ls+'px'; c.fillStyle='#fff'; c.fillText(text,x0,100);
    const d=c.getImageData(0,0,1000,120).data; const col=new Array(1000).fill(0);
    let top=999,bot=0;
    for(let y=0;y<120;y++)for(let x=0;x<1000;x++){ if(d[(y*1000+x)*4]>110){col[x]++; if(y<top)top=y; if(y>bot)bot=y;} }
    const sp=[];let p=-5; for(let x=0;x<1000;x++) if(col[x]>2){ if(x>p+1) sp.push([x,x]); else sp[sp.length-1][1]=x; p=x; }
    return {sp,top,bot};
  }
  let best=null;
  for(let size=70;size<=80;size+=0.5) for(let ls=-4;ls<=4;ls+=0.25){
    let err=0;
    for(const [text,tg] of [['MIXING DOWN,',target1],['LATE AT NIGHT.',target2]]){
      const {sp}=spans(text,size,ls,69);
      if(sp.length!==tg.length){err+=1e4;continue;}
      const dx=tg[0][0]-sp[0][0];
      for(let i=0;i<sp.length;i++) err+=(sp[i][0]+dx-tg[i][0])**2+(sp[i][1]+dx-tg[i][1])**2;
    }
    if(!best||err<best.err) best={err,size,ls};
  }
  const r1=spans('MIXING DOWN,',best.size,best.ls,69), r2=spans('LATE AT NIGHT.',best.size,best.ls,69);
  return JSON.stringify({best, r1, r2});
})()
