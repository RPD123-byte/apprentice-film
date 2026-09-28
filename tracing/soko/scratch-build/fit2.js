(() => {
  const cases = [
    ['objects', '300', 'Geist', [[78,86],[88,96],[99,100],[103,110],[114,121],[124,127],[130,137]]],
    ['objects', '400', 'Geist', [[78,86],[88,96],[99,100],[103,110],[114,121],[124,127],[130,137]]],
    ['objects', '400', 'Geist', [[1302,1310],[1313,1320],[1322,1324],[1327,1334],[1336,1343],[1346,1349],[1352,1359]]],
    ['objects', '300', 'Geist', [[1302,1310],[1313,1320],[1322,1324],[1327,1334],[1336,1343],[1346,1349],[1352,1359]]],
    ['index', '400', 'Geist', [[2041,2042],[2045,2052],[2055,2062],[2065,2072],[2075,2081]]],
    ['000.0', '500', '"Geist Mono"', [[1921,1946],[1952,1977],[1983,2008],[2024,2031],[2047,2071]]],
    ['000.0', '400', '"Geist Mono"', [[1921,1946],[1952,1977],[1983,2008],[2024,2031],[2047,2071]]],
  ];
  const cv=document.createElement('canvas'); cv.width=400; cv.height=100; const c=cv.getContext('2d',{willReadFrequently:true});
  function spans(text,w,fam,size,ls){
    c.setTransform(1,0,0,1,0,0); c.fillStyle='#000'; c.fillRect(0,0,400,100);
    c.font=`${w} ${size}px ${fam}`; c.letterSpacing=ls+'px'; c.fillStyle='#fff'; c.fillText(text,10,70);
    const d=c.getImageData(0,0,400,100).data; const col=new Array(400).fill(0); let top=99,bot=0;
    for(let y=0;y<100;y++)for(let x=0;x<400;x++){ if(d[(y*400+x)*4]>100){col[x]++; if(y<top)top=y; if(y>bot)bot=y;} }
    const sp=[];let p=-5; for(let x=0;x<400;x++) if(col[x]>0){ if(x>p+1) sp.push([x,x]); else sp[sp.length-1][1]=x; p=x; }
    return {sp,top,bot};
  }
  const res=[];
  for(const [text,w,fam,tg] of cases){
    let best=null;
    for(let size=10;size<=60;size+=0.25) for(let ls=-2;ls<=6;ls+=0.25){
      const {sp}=spans(text,w,fam,size,ls); if(sp.length!==tg.length) continue;
      const dx=tg[0][0]-sp[0][0]; let err=0;
      for(let i=0;i<sp.length;i++) err+=(sp[i][0]+dx-tg[i][0])**2+(sp[i][1]+dx-tg[i][1])**2;
      if(!best||err<best.err) best={err,size,ls,x:10+dx, top:spans(text,w,fam,size,ls).top-70};
    }
    res.push([text,w,fam,best]);
  }
  return JSON.stringify(res);
})()
