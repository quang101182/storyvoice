// Mesure la taille du cache audio IDB sur le Honor + storage estimate. READ-ONLY.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getWs(){ const r=await fetch("http://localhost:9222/json"); const l=await r.json(); const t=l.find(x=>x.type==="page"&&/storyvoice/.test(x.url)); if(!t)throw new Error("page introuvable"); return t.webSocketDebuggerUrl; }
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data); if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
(async()=>{
  const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
  const SEND=cdp(ws); await SEND("Runtime.enable");
  const ev=async(e)=>{ const r=await SEND("Runtime.evaluate",{expression:e,returnByValue:true}); if(r.exceptionDetails) return {__exc:r.exceptionDetails.text}; return r.result?r.result.value:null; };

  // lance le calcul, stocke dans une globale
  const launch = `(function(){ window.__as="pending";
    try{
      var open = idbOpen();
      open.then(function(db){
        var tx=db.transaction("audio","readonly"), st=tx.objectStore("audio");
        var total=0,count=0,mx=0,byBook={};
        var rq=st.openCursor();
        rq.onsuccess=function(e){ var c=e.target.result;
          if(c){ var v=c.value, b=v&&v.blob; if(b){ total+=b.size; count++; if(b.size>mx)mx=b.size; var bk=v.bookId||"?"; byBook[bk]=(byBook[bk]||0)+b.size; } c.continue(); }
          else { window.__as={count:count, totalKB:Math.round(total/1024), avgKB:count?Math.round(total/count/1024):0, maxKB:Math.round(mx/1024), books:Object.keys(byBook).length}; }
        };
        rq.onerror=function(){ window.__as={err:"cursor"}; };
      }).catch(function(e){ window.__as={err:String(e)}; });
    }catch(e){ window.__as={err:String(e)}; }
    return "launched";
  })()`;
  console.log("launch:", await ev(launch));
  await sleep(3000);
  console.log("CACHE AUDIO IDB:", JSON.stringify(await ev("window.__as")));

  // storage estimate
  await ev(`navigator.storage.estimate().then(function(e){ window.__est={usageMB:+(e.usage/1048576).toFixed(1), quotaMB:Math.round(e.quota/1048576)}; });`);
  await sleep(1200);
  console.log("STORAGE estimate:", JSON.stringify(await ev("window.__est")));

  console.log("statut génération:", JSON.stringify(await ev('(document.querySelector("#listenStatus")||{}).textContent || ""')));
  ws.close(); process.exit(0);
})().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
