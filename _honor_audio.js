// Test AUDIO RÉEL sur le Honor : appelle les 3 chemins TTS premium via le vrai gateway
// (fonctions de synthèse PURES → ne touchent ni le cache IDB ni le ledger coût de Quang).
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getWs(){ const r=await fetch("http://localhost:9222/json"); const l=await r.json(); const t=l.find(x=>x.type==="page"&&/storyvoice/.test(x.url)); if(!t)throw new Error("page storyvoice introuvable"); return t.webSocketDebuggerUrl; }
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data); if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
(async()=>{
  const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
  const SEND=cdp(ws); await SEND("Runtime.enable");
  const ev=async(e)=>{ const r=await SEND("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__exc:r.exceptionDetails.text}; return r.result?r.result.value:null; };
  console.log("VERSION Honor:", await ev("typeof VERSION!=='undefined'?VERSION:'?'"));
  console.log("clé présente:", await ev("!!getSecret()"));
  const TXT = "Bonjour, ceci est un court test audio de StoryVoice.";
  const test = await ev(`(async()=>{
    var res={};
    try{ var b=await synthOpenai(${JSON.stringify(TXT)},'onyx'); res.openai={ok:true,size:b.size,type:b.type}; }catch(e){ res.openai={ok:false,err:String(e&&e.message||e)}; }
    try{ var b=await synthGcpTts(${JSON.stringify(TXT)},'Charon'); res.gemini_chirp3_neutre={ok:true,size:b.size,type:b.type}; }catch(e){ res.gemini_chirp3_neutre={ok:false,err:String(e&&e.message||e)}; }
    try{ var b=await synthGeminiTts(${JSON.stringify(TXT)},'Charon'); res.gemini_tts={ok:true,size:b.size,type:b.type}; }catch(e){ res.gemini_tts={ok:false,err:String(e&&e.message||e)}; }
    res.browserVoices=(speechSynthesis.getVoices()||[]).length;
    res.frBrowserVoices=(speechSynthesis.getVoices()||[]).filter(v=>/fr/i.test(v.lang)).length;
    return res;
  })()`);
  console.log("RÉSULTAT TEST AUDIO RÉEL:");
  console.log(JSON.stringify(test,null,2));
  ws.close(); process.exit(0);
})().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
