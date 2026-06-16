// Recharge StoryVoice sur le Honor (CDP via adb forward), vérifie v0.93.0 + mesure réelle + auto-hide.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getWs(){ const r=await fetch("http://localhost:9222/json"); const l=await r.json(); const t=l.find(x=>x.type==="page"&&/storyvoice/.test(x.url)); if(!t)throw new Error("page storyvoice introuvable (rouvre l'onglet)"); return t.webSocketDebuggerUrl; }
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data); if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(m+": "+JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
(async()=>{
  const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
  const SEND=cdp(ws); await SEND("Runtime.enable"); await SEND("Page.enable");
  const ev=async(e,aw)=>{ const r=await SEND("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:!!aw}); return r.result?r.result.value:null; };
  // reload pour récupérer la v0.93 (SW network-first sur navigate)
  await SEND("Page.reload",{}); await sleep(3500);
  const ver = await ev("typeof VERSION!=='undefined'?VERSION:'?'");
  console.log("VERSION sur le Honor:", ver);
  const onRead = await ev("state && state.tab");
  console.log("onglet courant:", onRead);
  // si pas en lecture mais livre chargé, basculer en lecture
  if(onRead!=="read"){ await ev("if(state&&state.analysis){show('read');}"); await sleep(700); }
  const m = await ev(`(function(){ try{
    var vh=innerHeight;
    var h=document.querySelector('header'), a=document.querySelector('#activeBar');
    var hh=h?Math.round(h.getBoundingClientRect().height):-1;
    var ab=(a&&a.style.display!=='none')?Math.round(a.getBoundingClientRect().height):0;
    var h2=document.querySelector('#readerBody h2'); var tt=h2?Math.round(h2.getBoundingClientRect().top):-1;
    var ti=document.querySelector('#activeTitle');
    return {vh:vh, header:hh, activeBar:ab, textTop:tt, mobileMM:matchMedia('(max-width:640px)').matches}; }catch(e){return {err:String(e)};} })()`);
  console.log("MESURES REELLES:", JSON.stringify(m));
  // test auto-hide réel
  await ev("var rv=$('#readView'); if(rv){rv.scrollTop=300; rv.dispatchEvent(new Event('scroll'));}"); await sleep(450);
  const hid = await ev("(function(){var h=document.querySelector('header'),a=document.querySelector('#activeBar');return {hHidden:h.classList.contains('chrome-hidden'),aHidden:a.classList.contains('chrome-hidden')};})()");
  console.log("auto-hide au scroll bas:", JSON.stringify(hid));
  ws.close(); process.exit(0);
})().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
