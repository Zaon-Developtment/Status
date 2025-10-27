// dash.js - Lógica Principal do ZAON Status Dashboard (Ajuste Mínimo para Perfil)
// --- Limpador automático de cache/localStorage ---
// (garante que nenhum navegador use versão velha)
 

/*(function hardResetZAON() {
  try {
    // Remove config antiga
    localStorage.removeItem('zaonConfig');

    // Força o navegador a buscar sempre arquivos novos
    if ('caches' in window) caches.keys().then(names => names.forEach(caches.delete));
    
    console.log('[ZAON] Limpeza automática executada.');
  } catch(e) {
    console.warn('[ZAON] Falha ao limpar cache/localStorage:', e);
  }
})(); */

const CATALOG = {
  // AI / Dev
  "OpenAI (ChatGPT)": "https://status.openai.com/api/v2/summary.json",
  "Slack": "https://slack-status.com/api/v2/summary.json",
  "Notion": "https://status.notion.so/api/v2/summary.json",
  "GitHub": "https://www.githubstatus.com/api/v2/summary.json",

  // Cloud & Google
  "Cloudflare": "https://www.cloudflarestatus.com/api/v2/summary.json",
  "Google Cloud (incidentes)": "https://status.cloud.google.com/incidents.json",
  "Google Workspace (Gmail/Drive)": "https://www.google.com/appsstatus/dashboard/incidents.json",

  // Comunicação / Mídia
  "Discord": "https://discordstatus.com/api/v2/summary.json",
  "Dropbox": "https://status.dropbox.com/api/v2/summary.json",
  "Reddit": "https://www.redditstatus.com/api/v2/summary.json",
  "WordPress.com": "https://wpcomstatus.com/api/v2/summary.json",
  "monday.com": "https://status.monday.com/api/v2/summary.json",

  // Exemplo de expansão:
  "Meta": "https://metastatus.com/api/v2/summary.json",
};

const FETCH_TIMEOUT_MS = 6500;
let INTERVAL_MS = 60000;
const MISS_THRESHOLD = 2; // remove após 2 ciclos sem ver a fonte
const DDG_ICON = host => `https://icons.duckduckgo.com/ip3/${host}.ico`;

const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const pill = document.getElementById("status-pill");
const toast = document.getElementById("toast");
const btn = document.getElementById("refreshBtn");
const countdownEl = document.getElementById("countdown");
const regionSel = document.getElementById("region");
const onlyIncidentsToggle = document.getElementById("onlyIncidents");
const searchInput = document.getElementById("search");

// --- NOVAS REFERÊNCIAS DE DOM PARA O HEADER ---
// Estas linhas são críticas e pressupõem que o HTML tem id="dashLogo" e id="dashTitle"
const headerLogo = document.getElementById('dashLogo');
const headerTitleB = document.getElementById('dashTitle');

const LATAM_WORDS = ["latam","latin america","américa latina","america latina","south america","américa do sul","brasil","brazil","são paulo","sao paulo","rio de janeiro","argentina","buenos aires","mexico","méxico","cdmx","colombia","colômbia","peru","chile","uruguay","uruguai","paraguay","paraguai","bolivia","bolívia","ecuador","equador","venezuela","guatemala","costa rica","panama","panamá","honduras","el salvador","nicaragua","república dominicana","dominican republic"];
const isLatamText = s => LATAM_WORDS.some(w => (s||"").toLowerCase().includes(w));

// === BUSCA: helpers globais (cole acima do const state) ===
// Normaliza texto para busca (sem acentos, minúsculo)
const norm = (s) => (s||"")
.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
.toLowerCase();

// Atualiza/gera o índice do serviço (name + host)

// === FIM helpers ===

const state = { prev:{}, nextAt: Date.now()+INTERVAL_MS, cycle:0, ticking:true }; // prev[key]={data,node,misses,seen}


// --- INÍCIO: LÓGICA DE PERFIL E PREFERÊNCIAS DO ADMIN ---
// Chave única onde vamos guardar o perfil privado do usuário
const LS_KEY = 'zaonConfig';

// Conteúdo institucional padrão (o que TODO MUNDO vê na primeira vez)
const defaultConfig = {
    profile: {
        name: 'ZAON',
        avatar: 'https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg'
    }
};

// Estado que vamos exibir na tela agora
let activeConfig = { ...defaultConfig };

/**
 * Lê do localStorage e aplica, SE o usuário já tiver personalizado.
 * Se não tiver nada salvo, mantém o default (ZAON público).
 */
function loadPersonalConfig() {
    const stored = localStorage.getItem(LS_KEY);

    if (stored) {
        try {
            const parsed = JSON.parse(stored);

            // Merge suave: só substitui o que a pessoa customizou
            if (parsed.profile) {
                activeConfig.profile = {
                    ...defaultConfig.profile,
                    ...parsed.profile
                };
            }
        } catch (err) {
            console.error('[ZAON] Falha ao ler config salva:', err);
        }
    }

    // Agora aplica visualmente no header
    const headerLogo   = document.getElementById('dashLogo');
    const headerTitleB = document.getElementById('dashTitle');

    if (headerLogo) {
        headerLogo.src = activeConfig.profile.avatar || defaultConfig.profile.avatar;
    }

    if (headerTitleB) {
        headerTitleB.textContent = activeConfig.profile.name || defaultConfig.profile.name;
    }
}

// roda assim que o script carregar
loadPersonalConfig();

// --- FIM: LÓGICA DE PERFIL E PREFERÊNCIAS DO ADMIN ---


// Preferências persistentes


function savePrefs(){
  localStorage.setItem("zaon.region", regionSel.value);
  localStorage.setItem("zaon.onlyIncidents", onlyIncidentsToggle.checked ? "1":"0");
  localStorage.setItem("zaon.search", searchInput.value || "");
}
// ... (O restante das funções do Dashboard permanece o mesmo: pageFromApi, hostFromPage, favicon, impactRank, UI helpers, Fetch, Parsers, Cards, Render, Collect, Tick, etc.) ...
// O bloco da função collect/seed usa o CATALOG, então o Dashboard continuará funcionando.


function pageFromApi(url){
  try{
    if (url.includes("api/v2/summary.json")) return url.replace(/\/api\/v2\/summary\.json.*/,"");
    if (url.includes("status.cloud.google.com/incidents.json")) return "https://status.cloud.google.com/";
    if (url.includes("google.com/appsstatus/dashboard/incidents.json")) return "https://www.google.com/appsstatus/dashboard/";
    return "";
  }catch{ return ""; }
}
function hostFromPage(page){ try{ return page ? new URL(page).hostname : ""; }catch{ return ""; } }
function favicon(url){ try{ return DDG_ICON(new URL(url).hostname); }catch{ return ""; } }
function impactRank(ind){ return ({critical:3, major:2, minor:1, none:0, unknown:-1})[ind] ?? -1; }

// ---- UI helpers
function showToast(msg, ok=true){
  toast.textContent = msg;
  toast.style.borderColor = ok ? "#1f5a3a" : "#5a1d19";
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 2200);
}
function setPill(text, ok=null){
  pill.textContent = text;
  pill.className = "pill" + (ok===true ? " okpill" : ok===false ? " errpill" : "");
}

// ---- Fetch util (direto → proxy)
function abortableFetch(url, opts={}){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, {...opts, signal: ctrl.signal}).finally(()=>clearTimeout(t));
}
async function fetchJSON(url){
  try{
    const r = await abortableFetch(url, { cache:"no-store" });
    if(!r.ok) throw new Error(r.status);
    return await r.json();
  }catch(e){
    // fallback via proxy simples
    const prox = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
    const r2 = await abortableFetch(prox, { cache:"no-store" });
    if(!r2.ok) { console.error("Falha no endpoint:", url, e); throw new Error(r2.status); }
    return await r2.json();
  }
}

// ---- Parsers especiais (Google Cloud / Workspace)
function parseGoogleCloud(json){
  // json esperado: array de incidentes (inclui resolvidos/ativos)
  const incidents = Array.isArray(json) ? json : [];
  // Ativos = não resolvidos (heurística defensiva)
  const open = incidents.filter(i=>{
    const s = (i.most_recent_update?.status || i.status || "").toString().toLowerCase();
    return !["resolved","completed","closed"].includes(s);
  });
  // severidade (heurística)
  const sevToIndicator = (sev)=>{
    const s = (sev||"").toString().toLowerCase();
    if (["critical","severe","outage","p0","p1","high"].some(k=>s.includes(k))) return "critical";
    if (["major","degraded","p2","medium"].some(k=>s.includes(k))) return "major";
    if (["minor","low","informational","notice","p3","p4"].some(k=>s.includes(k))) return "minor";
    return "minor";
  };
  const indicator = open.length ? open.reduce((acc,i)=> {
    const sev = i.most_recent_update?.severity || i.severity || "";
    const ind = sevToIndicator(sev);
    return impactRank(ind) > impactRank(acc) ? ind : acc;
  }, "minor") : "none";

  return {
    name: "Google Cloud",
    url: "https://status.cloud.google.com/",
    host: "status.cloud.google.com",
    indicator,
    incidentsCount: open.length,
    firstStarted: open[0]?.begin || open[0]?.created || null,
    rawIncidents: open
  };
}

function parseGoogleWorkspace(json){
  // json esperado: array de incidentes do Apps Status
  const incidents = Array.isArray(json) ? json : [];
  const open = incidents.filter(i=>{
    const s = (i.status || i.most_recent_update?.status || "").toString().toLowerCase();
    return !["resolved","closed","completed"].includes(s);
  });
  const sevToIndicator = (sev)=>{
    const s = (sev||"").toString().toLowerCase();
    if (["critical","outage","high"].some(k=>s.includes(k))) return "critical";
    if (["major","medium","degraded"].some(k=>s.includes(k))) return "major";
    if (["minor","low","informational","notice"].some(k=>s.includes(k))) return "minor";
    return "minor";
  };
  const indicator = open.length ? open.reduce((acc,i)=> {
    const ind = sevToIndicator(i.severity || "");
    return impactRank(ind) > impactRank(acc) ? ind : acc;
  }, "minor") : "none";

  return {
    name: "Google Workspace",
    url: "https://www.google.com/appsstatus/dashboard/",
    host: "www.google.com",
    indicator,
    incidentsCount: open.length,
    firstStarted: open[0]?.begin || open[0]?.external_desc_time || open[0]?.created || null,
    rawIncidents: open
  };
}

// ---- Normalização summary.json (Statuspage) OU especiais
function normalizeSummary(json, forcedName, sourceUrl){
  // Match de URLs especiais
  if (sourceUrl.includes("status.cloud.google.com/incidents.json")) {
    return parseGoogleCloud(json);
  }
  if (sourceUrl.includes("appsstatus/dashboard/incidents.json")) {
    return parseGoogleWorkspace(json);
  }

  // Statuspage default
  const page = json.page || {};
  const status = json.status || {};
  const incidents = (json.unresolved_incidents || []).concat(
    (json.incidents || []).filter(i => i.status !== "resolved")
  );

  const baseUrl = page.url || pageFromApi(sourceUrl);
  const base = {
    name: forcedName || page.name || "Serviço",
    url: baseUrl,
    host: baseUrl ? hostFromPage(baseUrl) : "",
    indicator: status.indicator || (incidents.length ? "minor" : "none"),
    incidentsCount: incidents.length,
    firstStarted: incidents[0]?.started_at || incidents[0]?.created_at || page.updated_at || null,
    rawIncidents: incidents
  };
  // pior impacto
  const worst = incidents.reduce((acc,i)=> {
    const imp = i.impact || "minor";
    return impactRank(imp) > impactRank(acc) ? imp : acc;
  }, base.indicator);
  base.indicator = worst;
  return base;
}

// ---- Cards
function ensureCard(key, name, link){
  // Normaliza texto para busca (sem acentos, minúsculo)
const norm = (s) => (s||"")
.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
.toLowerCase();

// Atualiza/gera o índice do serviço (name + host)
function buildSearchIndex(data){
const base = `${data.name||""} ${data.host||""}`;
const txt = norm(base).replace(/\s+/g,' ').trim();
const tokens = Array.from(new Set(txt.split(' '))).filter(Boolean);
return { raw: base, txt, tokens };
}
  if (state.prev[key]) return state.prev[key].node;
  const card = document.createElement("div");
  card.className = "card";
  card.id = "card-"+key;

  const row = document.createElement("div"); row.className="row";
  const avatar = document.createElement("div"); avatar.className="logo2";
  const fav = favicon(link||"");
  if (fav){
    const img = document.createElement("img");
    img.src = fav; img.alt="";
    img.onerror = function(){ this.remove(); avatar.textContent = (name[0]||"?").toUpperCase(); };
    avatar.appendChild(img);
  }else{
    avatar.textContent = (name[0]||"?").toUpperCase();
  }
  row.appendChild(avatar);

  const mid = document.createElement("div");
  const nm = document.createElement("div"); nm.className="name"; nm.textContent = name;
  const ht = document.createElement("div"); ht.className="muted"; ht.textContent = link ? hostFromPage(link) : "—";
  mid.append(nm, ht); row.appendChild(mid);

  const badge = document.createElement("div"); badge.className="badge unknown"; badge.textContent="Carregando…";
  row.appendChild(badge);

  const desc = document.createElement("div"); desc.className="desc"; desc.textContent = "Aguardando dados…";
  const meta = document.createElement("div"); meta.className="muted"; meta.textContent = "—";

  card.append(row, desc, meta);
  grid.appendChild(card);

  state.prev[key] = { data:{name, url:link, host:(link?hostFromPage(link):""), indicator:"unknown", incidentsCount:0, firstStarted:null, rawIncidents:[]}, node:card, misses:0, seen:false };
  return card;
}

function updateCard(key, data){
  const st = state.prev[key]; if (!st) return;
  const node = st.node;

  // alerta visual
  const isAlert = (data.indicator === "critical");
  if (isAlert) node.classList.add("alert"); else node.classList.remove("alert");

  // badge
  const badge = node.querySelector(".badge");
  const cls = data.indicator==="none" ? "ok" : data.indicator || "unknown";
  badge.className = "badge "+cls;
  badge.textContent = data.indicator==="none" ? "OK" : "Incidente";
  if (data.indicator!=="none" && data.incidentsCount>1) badge.textContent += ` (+${data.incidentsCount-1})`;

  // textos
  node.querySelector(".name").textContent = data.name;
  node.querySelector(".muted").textContent = data.host || "—";
  const primaryText = data.rawIncidents?.[0]?.name
    || data.rawIncidents?.[0]?.external_desc
    || (data.indicator==="none" ? "Todos os sistemas operando" : "Incidente em andamento");
  node.querySelector(".desc").textContent = primaryText;

  const whenTxt = data.firstStarted ? new Date(data.firstStarted).toLocaleString() : "—";
  let footer = node.querySelectorAll(".muted")[1];
  if(!footer){ footer = document.createElement("div"); node.appendChild(footer); }
  footer.className = "muted";
  footer.innerHTML = "";
  const a = document.createElement("a");
  a.href = data.url || "#"; a.target="_blank"; a.rel="noopener"; a.textContent="ver detalhes →";
  footer.append("Desde: "+whenTxt+" • ", a);
}

function render(services){
  const region = regionSel.value;
  const onlyInc = onlyIncidentsToggle.checked;
  const q = (searchInput.value||"").toLowerCase().trim();

  // marca todos como não vistos
  Object.values(state.prev).forEach(v => v.seen = false);

  // ordena por impacto e nome
  services.sort((a,b)=> (impactRank(b.indicator)-impactRank(a.indicator)) || a.name.localeCompare(b.name));

  // filtros
  const filtered = services.filter(s=>{
    if (onlyInc && (s.indicator==="none" || s.incidentsCount===0)) return false;
    if (region==="latam"){
      if (s.indicator === "none" && s.incidentsCount === 0) return false; // em LATAM mostrar só incidentes
      const hay = (s.rawIncidents?.[0]?.name || "") + " " + (s.rawIncidents?.[0]?.external_desc || "") + " " + (s.name||"") + " " + (s.url||"");
      if (!isLatamText(hay)) return false;
    }
    if (q){
      const hay = `${s.name} ${s.host} ${s.url}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // atualiza cards
  for (const s of filtered){
    const key = s.host || (s.url ? hostFromPage(s.url) : s.name.toLowerCase());
    if (!state.prev[key]) ensureCard(key, s.name, s.url);
    updateCard(key, s);
    state.prev[key].data = s;
    state.prev[key].seen = true;
    state.prev[key].misses = 0;
  }

  // remove cards não vistos após MISS_THRESHOLD
  for (const [key, val] of Object.entries(state.prev)){
    if (!val.seen){
      val.misses++;
      if (val.misses >= MISS_THRESHOLD){
        val.node.remove();
        delete state.prev[key];
      }
    }
  }

  empty.style.display = Object.keys(state.prev).length ? "none" : "block";
}

// ---- Coleta
async function collect(showFeedback=false){
  btn.disabled = true;
  setPill("Atualizando…", null);
  let okCount = 0, failCount = 0;

  // Usa o CATALOG FIXO para garantir que o Dashboard funcione.
  const entries = Object.entries(CATALOG); 
  
  if (entries.length === 0) {
      setPill("Nenhum serviço ativo.", false);
      btn.disabled = false;
      state.nextAt = Date.now() + INTERVAL_MS;
      return;
  }
  
  const results = await Promise.allSettled(entries.map(async ([name,url])=>{
    // seed placeholder
    const page = pageFromApi(url);
    const key = page ? hostFromPage(page) : name.toLowerCase();
    ensureCard(key, name, page);

    // busca
    const json = await fetchJSON(url);
    const obj = normalizeSummary(json, name, url);
    // se a API não trouxe a URL, usa base da API
    obj.url = obj.url || page;
    obj.host = obj.host || (page ? hostFromPage(page) : "");
    return obj;
  }));

  const services = [];
  for (const r of results){
    if (r.status === "fulfilled"){ services.push(r.value); okCount++; }
    else { failCount++; }
  }

  if (okCount){
    render(services);
    const crit = services.filter(s=>s.indicator==="critical").length;
    const inc  = services.filter(s=>s.indicator!=="none").length;
    setPill(
      `${crit ? "⚠️ " : ""}Atualizado ${new Date().toLocaleTimeString()} • ` +
      `${inc} com incidentes (${crit} críticos) / ${services.length} serviços`,
      crit ? false : true
    );
    if (showFeedback) showToast(crit ? "Críticos detectados ⚠️" : "Atualizado com sucesso ✅", crit ? false : true);
  } else {
    // mantém UI anterior
    setPill(`Sem dados novos • ${new Date().toLocaleTimeString()}`, false);
    if (showFeedback) showToast("Falha ao atualizar ❌", false);
  }

  btn.disabled = false;
  state.nextAt = Date.now() + INTERVAL_MS;
}

// ---- Countdown 60s + botão + foco da aba
function tick(){
  if (!state.ticking) return;
  const left = Math.max(0, state.nextAt - Date.now());
  const s = Math.ceil(left/1000);
  countdownEl.textContent = `(${s}s)`;
  if (left <= 0){
    state.nextAt = Date.now() + INTERVAL_MS;
    collect(false);
  }
}
btn.addEventListener("click", ()=>collect(true));

// Persistência de filtros
regionSel.addEventListener("change", ()=>{ savePrefs(); renderFromState(); });
onlyIncidentsToggle.addEventListener("change", ()=>{ savePrefs(); renderFromState(); });
searchInput.addEventListener("input", ()=>{ savePrefs(); renderFromState(); });

function renderFromState(){
  const services = Object.values(state.prev).map(v=>v.data);
  render(services);
}

// Atalhos: R (refresh), ? (ajuda)
window.addEventListener("keydown", (e)=>{
  if (e.key.toLowerCase()==="r"){ e.preventDefault(); collect(true); }
  if (e.key==="?"){
    e.preventDefault();
    showToast("Atalhos: R = Atualizar agora • Preferências ficam salvas • Aba em segundo plano pausa o auto-refresh.", true);
  }
});

// Pausar quando aba perde foco (economia)
document.addEventListener("visibilitychange", ()=>{
  state.ticking = !document.hidden;
});

// ---- Primeira carga: cria placeholders p/ todo catálogo
(function seed(){
  for (const [name, url] of Object.entries(CATALOG)){
    const page = pageFromApi(url);
    const key = page ? hostFromPage(page) : name.toLowerCase();
    ensureCard(key, name, page);
  }
  empty.style.display = "none";
})();
// =========================================
// 🔄 SINCRONIZAÇÃO COM O ADMIN PANEL (ZAON)
// =========================================
try {
  const syncChannel = new BroadcastChannel("zaon-sync");

  syncChannel.onmessage = (event) => {
    const { type } = event.data || {};
    console.log("[ZAON DASH] Atualização recebida do Admin:", type);

    if (type === "config-updated" || type === "config-imported" || type === "config-reset") {
      // Recarrega dados do localStorage
      try {
        const stored = localStorage.getItem("zaonConfig");
        if (stored) {
          const parsed = JSON.parse(stored);

          // Atualiza intervalos
          if (parsed.prefs?.updateInterval) {
            INTERVAL_MS = parsed.prefs.updateInterval * 1000;
            console.log("[ZAON DASH] Intervalo de atualização alterado:", INTERVAL_MS, "ms");
          }

          // Atualiza perfil (nome e avatar)
          if (parsed.profile) {
            const logo = document.getElementById("dashLogo");
            const title = document.getElementById("dashTitle");
            if (logo) logo.src = parsed.profile.avatar;
            if (title) title.textContent = parsed.profile.name;
          }

          // Atualiza lista de serviços se existir
          if (Array.isArray(parsed.services)) {
            window.zaonServices = parsed.services.filter(s => s.active);
            console.log("[ZAON DASH] Serviços sincronizados:", window.zaonServices);
            collect(true);
          }
        }
      } catch (err) {
        console.error("[ZAON DASH] Erro ao sincronizar config:", err);
      }
    }
  };

  console.log("[ZAON DASH] Canal de sincronização ativado.");
} catch (err) {
  console.warn("[ZAON DASH] Falha ao criar canal de sync:", err);
}

// start
collect(false);
setInterval(tick, 1000);