// Diag live Honor : version chargée + présence #miniPlayer + état lecture. READ-ONLY (pas de reload).
async function getWs(){ const r=await fetch("http://localhost:9222/json"); const l=await r.json(); const t=l.find(x=>x.type==="page"&&/storyvoice/.test(x.url)); if(!t)throw new Error("page introuvable"); return t.webSocketDebuggerUrl; }
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data); if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
(async()=>{
  const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
  const SEND=cdp(ws); await SEND("Runtime.enable");
  const ev=async e=>{ const r=await SEND("Runtime.evaluate",{expression:e,returnByValue:true}); return r.result?r.result.value:null; };
  const info = await ev(`(function(){ try{ return {
    version: typeof VERSION!=='undefined'?VERSION:'?',
    hasMiniInDOM: !!document.querySelector('#miniPlayer'),
    hasBellInDOM: !!document.querySelector('#btnNotif'),
    updateMiniExists: typeof updateMiniPlayer==='function',
    listenOn: typeof _listenOn!=='undefined'?_listenOn:'undef',
    isPlaying: typeof isPlaying==='function'?isPlaying():'no-fn',
    miniDisplay: (function(){var m=document.querySelector('#miniPlayer');return m?getComputedStyle(m).display:'NO-ELEMENT';})(),
    listenStatus: (document.querySelector('#listenStatus')||{}).textContent||'',
    tab: typeof state!=='undefined'?state.tab:'?',
    swCtrl: !!(navigator.serviceWorker&&navigator.serviceWorker.controller)
  }; }catch(e){ return {err:String(e)}; } })()`);
  console.log("DIAG HONOR:", JSON.stringify(info,null,1));
  ws.close(); process.exit(0);
})().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
