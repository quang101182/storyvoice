// Validation zoom sur le Honor réel : reload v0.95, pinch constellation + arbre, captures (device px, resize ensuite).
const fs=require("fs"); const path=require("path");
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getWs(){ const r=await fetch("http://localhost:9222/json"); const l=await r.json(); const t=l.find(x=>x.type==="page"&&/storyvoice/.test(x.url)); if(!t)throw new Error("page storyvoice introuvable"); return t.webSocketDebuggerUrl; }
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data); if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(m+": "+JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
let SEND; async function ev(e,aw){ const r=await SEND("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:!!aw}); return r.result?r.result.value:null; }
async function shot(name){ const d=(await SEND("Page.captureScreenshot",{format:"png"})).data; fs.writeFileSync(path.join("D:/Download/02-Apps-Web/storyvoice",name), Buffer.from(d,"base64")); }
async function pinch(cx,cy,s1,s2){ await SEND("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:cx-s1,y:cy},{x:cx+s1,y:cy}]}); await sleep(70);
  await SEND("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:cx-s2,y:cy},{x:cx+s2,y:cy}]}); await sleep(70);
  await SEND("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]}); }
(async()=>{
  const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
  SEND=cdp(ws); await SEND("Runtime.enable"); await SEND("Page.enable");
  await SEND("Page.reload",{}); await sleep(3800);
  let ver=await ev("typeof VERSION!=='undefined'?VERSION:'?'");
  if(ver!=="0.95.0"){ await SEND("Page.reload",{}); await sleep(3800); ver=await ev("typeof VERSION!=='undefined'?VERSION:'?'"); }
  console.log("VERSION Honor:", ver);
  if(!(await ev("!!(state&&state.analysis)"))){ console.log("PAS de livre chargé — abandon"); process.exit(0); }
  await ev("show('map')"); await sleep(800);
  const box=await ev("(function(){var r=document.querySelector('#constellation').getBoundingClientRect();return {cx:Math.round(r.left+r.width/2),cy:Math.round(r.top+r.height/2)};})()");
  const z0=await ev("cam.z"); await shot("_hz_map_raw.png");
  await pinch(box.cx,box.cy,40,150); await sleep(250);
  const z1=await ev("cam.z"); console.log("constellation cam.z:",z0,"->",z1, z1>z0?"ZOOM OK":"PAS DE ZOOM"); await shot("_hz_mapzoom_raw.png");
  // arbre
  await ev("setMapMode('tree')"); await sleep(700);
  const fam=await ev("(function(){var w=document.querySelector('#famZoomWrap');var n=document.querySelectorAll('.fam-node').length;var l=document.querySelectorAll('#famSvg path,#famSvg line').length;return {wrap:!!w,nodes:n,links:l};})()");
  console.log("arbre:",JSON.stringify(fam)); await shot("_hz_tree_raw.png");
  if(fam.wrap){ const tb=await ev("(function(){var r=document.querySelector('#famTree').getBoundingClientRect();return {cx:Math.round(r.left+r.width/2),cy:Math.round(r.top+r.height/2)};})()");
    const f0=await ev("famZoom"); await pinch(tb.cx,tb.cy,40,140); await sleep(250);
    const f1=await ev("famZoom"); console.log("arbre famZoom:",f0,"->",f1, f1>f0?"ZOOM OK":"PAS DE ZOOM"); await shot("_hz_treezoom_raw.png"); }
  ws.close(); process.exit(0);
})().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
