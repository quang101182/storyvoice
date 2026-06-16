// Mesure les hauteurs des blocs UI sur le Honor (CDP via adb forward localhost:9222).
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getWs(){ const r=await fetch("http://localhost:9222/json"); const l=await r.json(); const t=l.find(x=>x.type==="page"&&/storyvoice/.test(x.url)); if(!t)throw new Error("page storyvoice introuvable"); return t.webSocketDebuggerUrl; }
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data); if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(m+": "+JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
(async()=>{
  const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
  const SEND=cdp(ws); await SEND("Runtime.enable");
  const expr = `(()=>{
    const vh = window.innerHeight, vw = window.innerWidth;
    const H = (sel)=>{ const e=document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return {h:Math.round(r.h||r.height), top:Math.round(r.top), disp: cs.display==='none'?'none':'', vis: (r.height>0&&cs.display!=='none')}; };
    const blocks = {
      header: H('header'),
      tabs: H('.tabs')||H('nav')||H('#tabs'),
      activeBar: H('#activeBar'),
      readView: H('#readView'),
    };
    // dans la vue lecture, mesurer la barre de contrôles (chapitre/precedent/suivant + outils)
    const rv = document.querySelector('#readView');
    let readerInner = null, controlsHeight = 0, textTop = 0;
    if(rv){
      const firstP = rv.querySelector('p, .reader-para, .chap-text');
      if(firstP) textTop = Math.round(firstP.getBoundingClientRect().top);
    }
    return { vh, vw, blocks, textTop, activeBarHTML: (document.querySelector('#activeBar')||{}).className };
  })()`;
  const r = await SEND("Runtime.evaluate",{expression:expr,returnByValue:true});
  console.log(JSON.stringify(r.result.value,null,2));
  ws.close();
  process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1);});
