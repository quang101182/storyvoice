// QA PWA — sert storyvoice en HTTP local, lance Edge headless CDP, verifie :
//  SW enregistre+actif, manifest valide, app boot 0 erreur, cache 100% same-origin (gateway jamais cache).
const { spawn } = require("child_process"); const fs = require("fs"); const path = require("path"); const http = require("http");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DIR = "D:/Download/02-Apps-Web/storyvoice";
const PORT_HTTP = 8731; const PORT_CDP = 9621;
const BASE = `http://127.0.0.1:${PORT_HTTP}/`;
const UDD = path.join(process.env.TEMP || ".", "sv_pwa_" + PORT_CDP);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CT = { ".html":"text/html;charset=utf-8", ".js":"text/javascript;charset=utf-8", ".json":"application/manifest+json;charset=utf-8", ".png":"image/png", ".svg":"image/svg+xml", ".webp":"image/webp" };

// --- serveur statique ---
const server = http.createServer((req, res) => {
  let p = req.url.split("?")[0]; if (p === "/") p = "/index.html";
  const fp = path.join(DIR, decodeURIComponent(p));
  fs.readFile(fp, (e, data) => {
    if (e) { res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": CT[path.extname(fp)] || "application/octet-stream", "Service-Worker-Allowed": "/" });
    res.end(data);
  });
});

async function getWs(){ for(let i=0;i<50;i++){ try{ const r=await fetch(`http://127.0.0.1:${PORT_CDP}/json`); const l=await r.json(); const t=l.find(x=>x.type==="page"&&x.webSocketDebuggerUrl); if(t)return t.webSocketDebuggerUrl; }catch(_){} await sleep(300);} throw new Error("no target"); }
const errs=[];
function cdp(ws){ let id=0; const p=new Map(); ws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);
  if(m.method==="Runtime.exceptionThrown"){ errs.push("EXCEPTION: "+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text)); }
  if(m.method==="Runtime.consoleAPICalled" && m.params.type==="error"){ errs.push("console.error: "+m.params.args.map(a=>a.value||a.description||"").join(" ")); }
  if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
  return (m,pa={})=>new Promise((res,rej)=>{const i=++id;p.set(i,x=>x.error?rej(new Error(m+": "+JSON.stringify(x.error))):res(x.result));ws.send(JSON.stringify({id:i,method:m,params:pa}));}); }
let SEND; async function ev(e,aw){ const r=await SEND("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:!!aw}); if(r.exceptionDetails) return {__err:r.exceptionDetails.text||(r.exceptionDetails.exception&&r.exceptionDetails.exception.description)}; return r.result?r.result.value:null; }

let pass=0, fail=0; function chk(name, ok, extra){ console.log((ok?"  PASS ":"  FAIL ")+name+(extra!==undefined?"  -> "+JSON.stringify(extra):"")); ok?pass++:fail++; }

(async()=>{
  if(fs.existsSync(UDD)) fs.rmSync(UDD,{recursive:true,force:true});
  await new Promise(r=>server.listen(PORT_HTTP,r));
  const proc=spawn(EDGE,["--headless=new","--disable-gpu","--mute-audio","--window-size=1000,860",`--remote-debugging-port=${PORT_CDP}`,`--user-data-dir=${UDD}`,"--no-first-run",BASE],{stdio:"ignore"});
  try{
    const ws=new WebSocket(await getWs()); await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
    SEND=cdp(ws); await SEND("Runtime.enable"); await SEND("Page.enable");
    await sleep(1800);
    // 1) version
    chk("VERSION = 0.92.0", (await ev("typeof VERSION!=='undefined'?VERSION:'?'"))==="0.92.0");
    // 2) SW pret + actif
    const sw=await ev("(async()=>{try{const r=await navigator.serviceWorker.ready; return {scope:r.scope, active:r.active&&r.active.state};}catch(e){return {err:String(e)};}})()", true);
    chk("SW ready & active", sw && sw.active==="activated", sw);
    // 3) reload pour que le SW prenne le controle
    await SEND("Page.reload",{}); await sleep(1600);
    chk("SW controller present apres reload", (await ev("!!navigator.serviceWorker.controller")) === true);
    // 4) manifest valide
    const man=await ev("(async()=>{try{const r=await fetch('manifest.json');const j=await r.json();return {name:j.name,icons:(j.icons||[]).length,display:j.display,start:j.start_url};}catch(e){return {err:String(e)};}})()", true);
    chk("manifest parse + >=2 icons + standalone", man && man.icons>=2 && man.display==="standalone", man);
    // 5) icones servies (200 + image)
    const ic=await ev("(async()=>{const o={};for(const u of ['icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png']){try{const r=await fetch(u);o[u]=r.status+':'+(r.headers.get('content-type')||'');}catch(e){o[u]='ERR';}}return o;})()", true);
    const icOk = ic && Object.values(ic).every(v=>String(v).startsWith("200")&&String(v).includes("image"));
    chk("4 icones servies 200 image/*", icOk, ic);
    // 6) cache shell = 100% same-origin, AUCUNE url gateway
    const ca=await ev("(async()=>{const ks=await caches.keys();let urls=[];for(const k of ks){const c=await caches.open(k);const rq=await c.keys();urls=urls.concat(rq.map(r=>r.url));}return {keys:ks,count:urls.length,cross:urls.filter(u=>!u.startsWith(location.origin)),gw:urls.filter(u=>u.includes('workers.dev'))};})()", true);
    chk("cache shell non vide", ca && ca.count>0, {keys:ca&&ca.keys,count:ca&&ca.count});
    chk("AUCUNE url cross-origin/gateway en cache", ca && ca.cross.length===0 && ca.gw.length===0, {cross:ca&&ca.cross, gw:ca&&ca.gw});
    // 7) fonctions cles app presentes (boot non casse)
    const fns = await ev("['loadStore','renderLibrary','setActiveBook','syncListenUI','getSecret'].every(f=>typeof window[f]==='function')");
    chk("fonctions app presentes", fns===true);
    // 8) erreurs console/exceptions au boot
    chk("0 erreur/exception au boot", errs.length===0, errs.slice(0,6));
    // capture
    try{ const png=(await SEND("Page.captureScreenshot",{format:"png"})).data; fs.writeFileSync(path.join(DIR,"_pwa_shot.png"), Buffer.from(png,"base64")); }catch(_){}
    console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
  }catch(e){ console.error("FATAL",e); }
  finally{ try{proc.kill();}catch(_){} try{server.close();}catch(_){} setTimeout(()=>process.exit(fail?1:0),400); }
})();
