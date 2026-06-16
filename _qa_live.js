// QA LIVE — teste l'URL GitHub Pages reelle (HTTPS) : SW s'enregistre, manifest installable.
const { spawn } = require("child_process"); const fs = require("fs"); const path = require("path");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const URL_LIVE = "https://quang101182.github.io/storyvoice/";
const PORT = 9622; const UDD = path.join(process.env.TEMP || ".", "sv_live_" + PORT);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getWs(){ for(let i=0;i<60;i++){ try{ const r=await fetch(`http://127.0.0.1:${PORT}/json`); const l=await r.json(); const t=l.find(x=>x.type==="page"&&x.webSocketDebuggerUrl); if(t)return t.webSocketDebuggerUrl; }catch(_){} await sleep(300);} throw new Error("no target"); }
const errs=[];
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);
  if(m.method==="Runtime.exceptionThrown"){ errs.push("EXC: "+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text)); }
  if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(m+": "+JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
let SEND; async function ev(e,aw){ const r=await SEND("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:!!aw}); return r.result?r.result.value:null; }
let pass=0, fail=0; function chk(n,ok,x){ console.log((ok?"  PASS ":"  FAIL ")+n+(x!==undefined?"  -> "+JSON.stringify(x):"")); ok?pass++:fail++; }
(async()=>{
  if(fs.existsSync(UDD)) fs.rmSync(UDD,{recursive:true,force:true});
  const proc=spawn(EDGE,["--headless=new","--disable-gpu","--mute-audio","--window-size=900,800",`--remote-debugging-port=${PORT}`,`--user-data-dir=${UDD}`,"--no-first-run",URL_LIVE],{stdio:"ignore"});
  try{
    const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
    SEND=cdp(ws); await SEND("Runtime.enable"); await SEND("Page.enable"); await sleep(2500);
    chk("page live chargee (VERSION 0.92.0)", (await ev("typeof VERSION!=='undefined'?VERSION:'?'"))==="0.92.0");
    const sw=await ev("(async()=>{try{const r=await navigator.serviceWorker.ready;return {active:r.active&&r.active.state,scope:r.scope};}catch(e){return {err:String(e)};}})()", true);
    chk("SW enregistre+actif en HTTPS", sw && sw.active==="activated", sw);
    await SEND("Page.reload",{}); await sleep(2200);
    chk("SW controle la page apres reload", (await ev("!!navigator.serviceWorker.controller"))===true);
    // installabilite via le manifest parse par le navigateur
    const man=await SEND("Page.getAppManifest",{});
    const errors=(man.errors||[]).filter(e=>e.critical!==false);
    chk("manifest sans erreur critique", errors.length===0, man.errors&&man.errors.slice(0,4));
    chk("manifest url resolue", !!man.url, man.url);
    chk("0 exception JS", errs.length===0, errs.slice(0,4));
    console.log(`\n=== LIVE ${pass} PASS / ${fail} FAIL ===`);
  }catch(e){ console.error("FATAL",e); }
  finally{ try{proc.kill();}catch(_){} setTimeout(()=>process.exit(fail?1:0),400); }
})();
