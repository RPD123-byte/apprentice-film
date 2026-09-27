import { drawOwl, owlPose } from "../../src/lib/owlInk.js";
const ctx=document.getElementById('c').getContext('2d');
ctx.fillStyle='#000';ctx.fillRect(0,0,800,500);
drawOwl(ctx,{...owlPose('fly'),x:400,y:250,s:0.8});
