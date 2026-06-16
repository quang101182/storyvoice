// DIAGNOSTIC LIVE de la génération sur le Honor — READ-ONLY, PAS de reload (ne coupe pas la génération en cours).
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getWs(){ const r=await fetch("http://localhost:9222/json"); const l=await r.json(); const t=l.find(x=>x.type==="page"&&/storyvoice/.test(x.url)); if(!t)throw new Error("page storyvoice introuvable"); return t.webSocketDebuggerUrl; }
const netReq={}, netDone=[], netFail=[], consoleErrs=[];
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);
  if(m.method==="Network.requestWillBeSent"){ const u=m.params.request.url; if(/workers\.dev|gcptts|openai|gemini|elevenlabs|fal/.test(u)) netReq[m.params.requestId]={url:u.slice(0,80),t:m.params.timestamp}; }
  if(m.method==="Network.responseReceived"){ const r=netReq[m.params.requestId]; if(r){ netDone.push({url:r.url,status:m.params.response.status}); } }
  if(m.method==="Network.loadingFailed"){ const r=netReq[m.params.requestId]; if(r){ netFail.push({url:r.url,err:m.params.errorText,canceled:m.params.canceled}); } }
  if(m.method==="Runtime.exceptionThrown"){ consoleErrs.push("EXC: "+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text)); }
  if(m.method==="Runtime.consoleAPICalled"&&(m.params.type==="error"||m.params.type==="warning")){ consoleErrs.push(m.params.type+": "+m.params.args.map(a=>a.value||a.description||"").slice(0,3).join(" ")); }
  if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(m+": "+JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
let SEND; async function ev(e){ const r=await SEND("Runtime.evaluate",{expression:e,returnByValue:true}); return r.result?r.result.value:null; }
const STATE = `(function(){ try{
  return {
    ver: typeof VERSION!=='undefined'?VERSION:'?',
    tab: state&&state.tab,
    engine: S&&S.listenEngine, tone: S&&S.elTone, narrMode: S&&S.narrMode,
    turns: state&&state.narrTurns?state.narrTurns.length:0,
    status: (document.querySelector('#listenStatus')||{}).textContent||'',
    genBarShown: (function(){var g=document.querySelector('#genBar');return g?getComputedStyle(g).display!=='none':null;})(),
    genFillW: (function(){var f=document.querySelector('#genBarFill');return f?f.style.width:null;})(),
    cacheBadge: (document.querySelector('#cacheBadge')||{}).textContent||'',
    hasKey: typeof getSecret==='function'?!!getSecret():null,
    playBusy: typeof listenBusy!=='undefined'?listenBusy:null
  };
}catch(e){ return {err:String(e)}; } })()`;
(async()=>{
  const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
  SEND=cdp(ws); await SEND("Runtime.enable"); await SEND("Network.enable");
  const s0=await ev(STATE); console.log("ÉTAT INITIAL:", JSON.stringify(s0));
  console.log("... observation 9s (la génération avance-t-elle ?) ...");
  await sleep(9000);
  const s1=await ev(STATE); console.log("ÉTAT APRÈS 9s:", JSON.stringify(s1));
  console.log("\n--- requêtes TTS terminées (9s):", netDone.length, JSON.stringify(netDone.slice(-6)));
  console.log("--- requêtes TTS échouées:", netFail.length, JSON.stringify(netFail.slice(-6)));
  console.log("--- requêtes TTS en attente (sans réponse):", Object.values(netReq).length - netDone.length - netFail.length);
  console.log("--- erreurs/warnings console:", consoleErrs.length?consoleErrs.slice(-8):"AUCUNE");
  ws.close(); process.exit(0);
})().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
