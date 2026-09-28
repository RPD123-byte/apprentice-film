import fs from 'fs';
const src = fs.readFileSync('src/shots/s22.js','utf8');
const get = (n) => eval(src.match(new RegExp('const '+n+' = (\\[\\[[\\s\\S]*?\\]\\]);'))[1]);
const hold=(K,t)=>{let r=K[0];for(const k of K) if(k[0]<=t+1e-6) r=k; return r;};
const out={};
for (const t of process.argv.slice(2).map(Number)) {
  let side,cup;
  if (t<76.54){side=0;cup=hold(get('TOP_CUP'),t);} else if(t<77.46){side=1;cup=hold(get('RIGHT_CUP'),t);} else if(t<79.22){side=2;cup=hold(get('BOT_CUP'),t);} else {side=3;cup=hold(get('LEFT_CUP'),t);}
  out[t]=[side,cup[1],cup[2]];
}
console.log(JSON.stringify(out));
