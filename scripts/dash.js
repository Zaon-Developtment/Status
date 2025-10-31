// ================================
// ZAON DASHBOARD (REESTRUTURADO)
// ================================

const LOCAL_STORAGE_KEY = "zaonConfig";
const SYNC_CHANNEL_NAME = "zaon-sync";

let INTERVAL_MS = 60000; // default 60s
let state = {
  nextAt: Date.now() + INTERVAL_MS,
  services: [],
  profile: {
    name: "ZAON",
    avatar: "https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg"
  }
};

// 🔄 Broadcast listener para atualizações em tempo real
const syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
syncChannel.onmessage = (msg) => {
  if (msg.data?.type === "config-updated" || msg.data?.type === "config-reset") {
    loadConfig();
    renderAll();
  }
};
function traduzirDescricao(texto) {
  if (!texto) return "Incidente detectado, sem detalhes disponíveis.";

  return texto
    .replace(/All Systems Operational/gi, "Todos os sistemas operacionais")
    .replace(/Trouble with search/gi, "Problemas com a busca")
    .replace(/Minor Service Outage/gi, "Interrupção leve")
    .replace(/Major Service Outage/gi, "Interrupção grave")
    .replace(/Service disruption/gi, "Interrupção de serviço")
    .replace(/Performance issues/gi, "Problemas de desempenho")
    .replace(/We are investigating/gi, "Estamos investigando")
    .replace(/Monitoring/gi, "Monitorando")
    .replace(/Identified/gi, "Problema identificado")
    .replace(/Resolved/gi, "Resolvido")
    .replace(/Under maintenance/gi, "Em manutenção");
}

// 🔧 Carrega config do localStorage
function loadConfig() {
  const raw = localStorage.getItem("zaonConfig");

  if (!raw) {
    // ⚠️ Primeira visita: cria config padrão
    const defaultConfig = {
      profile: {
        name: "ZAON",
        avatar: "https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg"
      },
      prefs: {
        updateInterval: 60
      },
      services: BASE_SERVICES.map(s => ({ ...s }))
    };

    localStorage.setItem("zaonConfig", JSON.stringify(defaultConfig));
    state.profile = defaultConfig.profile;
    INTERVAL_MS = defaultConfig.prefs.updateInterval * 1000;
    state.nextAt = Date.now() + INTERVAL_MS;
    state.services = defaultConfig.services.filter(s => s.active);

    console.log("⚠️ Primeira visita: serviços padrão carregados.");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.profile = parsed.profile || state.profile;
    INTERVAL_MS = (parsed.prefs?.updateInterval || 60) * 1000;
    state.nextAt = Date.now() + INTERVAL_MS;
    state.services = (parsed.services || []).filter(s => s.active);

   // console.log("Serviços ativos no Dash:", state.services);
  } catch (e) {
    console.error("[ZAON DASH] Erro ao carregar config:", e);
  }
}



// 🔄 Atualiza contador de tempo
function updateCountdown() {
  const el = document.getElementById("countdown");
  if (!el) return;

  const secs = Math.max(0, Math.floor((state.nextAt - Date.now()) / 1000));
  el.textContent = `${secs}s`;
}

// 🔁 Loop de atualização
function startLoop() {
  setInterval(() => {
    updateCountdown();
    if (Date.now() >= state.nextAt) {
      state.nextAt = Date.now() + INTERVAL_MS;
      refreshAllServices();
    }
  }, 1000);
}

// 🔄 Atualiza todos os serviços
function refreshAllServices() {
  state.services.forEach((svc) => {
    if (!svc.api) return; // ⛔️ ignora serviços sem API

    fetchJSON(svc.api)
      .then((data) => {
        updateServiceCard(svc.id, data);
      })
      .catch(() => {
        markServiceError(svc.id);
      });
  });

  setTimeout(() => {
    reorderCardsByStatus();
  }, 1000);
}

function reorderCardsByStatus() {
  const rank = {
    critical: 5,
    major: 4,
    minor: 3,
    none: 2,
    unknown: 1
  };

  const grid = document.getElementById("serviceGrid");
  if (!grid) return;

  const sorted = [...state.services].sort((a, b) => {
    const aStatus = a?.status?.indicator || "unknown";
    const bStatus = b?.status?.indicator || "unknown";
    return rank[bStatus] - rank[aStatus];
  });

  sorted.forEach(svc => {
    const el = document.querySelector(`[data-id="${svc.id}"]`);
    if (el) grid.appendChild(el); // move o card para a nova ordem
  });
}

// 🔧 Fetch JSON com timeout
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}




// 🖼️ Atualiza card com dados reais
function updateServiceCard(id, data) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;

  const isSlack = id === "slack";
  const isGoogle = id === "gcloud" || id === "gworkspace";
  let status = "unknown";
  let description = "Incidente detectado, sem detalhes disponíveis.";

  if (isSlack) {
    const incidentes = data?.active_incidents || [];
    const ativo = incidentes.find(i => i.status !== "resolved");
  
    status = ativo ? "major" : "none";
    const original = ativo?.title || "Incidente detectado, sem detalhes disponíveis.";
    description = traduzirDescricao(original);
  } else {
    status = data?.status?.indicator || "unknown";
    const original = data?.status?.description || "Incidente detectado, sem detalhes disponíveis.";
    description = traduzirDescricao(original);
  }
  

  const timestamp = new Date().toLocaleString("pt-BR");

  const badge = el.querySelector(".badge");
  badge.className = `badge ${status === "none" ? "ok" : status}`;
  badge.textContent = status === "none" ? "OK" : "Incidente";

  const desc = el.querySelector(".desc");
  desc.textContent = description;
  const meta = el.querySelectorAll(".muted")[1];
  if (meta) {
    const svc = state.services.find(s => s.id === id);
    const link = svc?.pageUrl || svc?.url || "#";
    meta.innerHTML = `Desde: ${timestamp} • <a href="${link}" target="_blank">ver status →</a>`;
  }
  

  // 🔍 Detecta se é um incidente crítico
  let isCritical = false;

  // 1. Verifica status.indicator
  if (status === "critical") {
    isCritical = true;
  }

  // 2. Verifica se há incidentes com impacto crítico
  if (Array.isArray(data?.incidents)) {
    isCritical = data.incidents.some(i => (i.impact || "").toLowerCase() === "critical");
  }

  // 3. Verifica se há incidentes não resolvidos com severidade crítica (Google Cloud / Workspace)
  if (Array.isArray(data)) {
    isCritical = data.some(i => {
      const s = (i.most_recent_update?.severity || i.severity || "").toLowerCase();
      const resolved = ["resolved", "closed", "completed"].includes((i.status || "").toLowerCase());
      return !resolved && ["critical", "severe", "outage", "p0", "high"].some(k => s.includes(k));
    });
  }

  // 🧠 Salva o status no objeto do serviço
  const svc = state.services.find(s => s.id === id);
  if (svc) {
    svc.status = { indicator: status };
    svc.description = description;
    svc.timestamp = timestamp;
    svc.pageUrl = (isSlack || isGoogle) ? svc.url : (data.page?.url || svc.url);
       }
  
  // 🔴 Aplica estilo visual se for crítico
  if (isCritical) {
    el.classList.add("alert");
  } else {
    el.classList.remove("alert");
  }
  
}



function renderSortedCards() {
  const grid = document.getElementById("serviceGrid");
  if (!grid) return;

  const rank = {
    critical: 5,
    major: 4,
    minor: 3,
    none: 2,
    unknown: 1
  };

  const sorted = [...state.services].sort((a, b) => {
    const aStatus = a?.status?.indicator || "unknown";
    const bStatus = b?.status?.indicator || "unknown";
    return rank[bStatus] - rank[aStatus];
  });

  grid.innerHTML = "";

  sorted.forEach((svc) => {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-id", svc.id);

    if (svc.status?.indicator === "critical") {
      card.classList.add("alert");
    }

    const row = document.createElement("div");
    row.className = "row";

    const avatar = document.createElement("div");
    avatar.className = "logo2";
    const fav = `https://icons.duckduckgo.com/ip3/${new URL(svc.url).hostname}.ico`;
    const img = document.createElement("img");
    img.src = fav;
    img.alt = "";
    img.onerror = () => {
      img.remove();
      avatar.textContent = (svc.name[0] || "?").toUpperCase();
    };
    avatar.appendChild(img);
    row.appendChild(avatar);

    const mid = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = svc.name;
    const host = document.createElement("div");
    host.className = "muted";
    host.textContent = new URL(svc.url).hostname;
    mid.append(name, host);
    row.appendChild(mid);

    const badge = document.createElement("div");
    badge.className = `badge ${svc.status?.indicator || "unknown"}`;
    badge.textContent = svc.status?.indicator === "none" ? "OK" : "Incidente";
    row.appendChild(badge);

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = svc.description || "Aguardando dados…";

    const meta = document.createElement("div");
    meta.className = "muted";
    const link = svc.pageUrl || svc.url || "#";
    meta.innerHTML = `Desde: ${svc.timestamp || "—"} • <a href="${link}" target="_blank">ver status →</a>`;

    card.append(row, desc, meta);
    grid.appendChild(card);
  });
}



// ❌ Marca erro visual
function markServiceError(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;

  el.classList.remove("alert");
  el.className = "card";
  el.querySelector(".badge").className = "badge unknown";
  el.querySelector(".badge").textContent = "Erro ao carregar";
  el.querySelector(".desc").textContent = "";
  const meta = el.querySelectorAll(".muted")[1];
  if (meta) meta.textContent = "";
}



// 🧱 Renderiza todos os cards
function renderAll() {
  renderHeader();
  renderServices();
}

// 🧠 Renderiza nome e avatar
function renderHeader() {
  const nameEl = document.getElementById("dashTitle");
  const avatarEl = document.getElementById("dashLogo");
  

  if (nameEl) nameEl.textContent = state.profile.name || "ZAON";
  if (avatarEl) avatarEl.src = state.profile.avatar || "";
}

// 🧱 Renderiza os cards de serviço
function renderServices() {
  const grid = document.getElementById("serviceGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const rank = {
    critical: 5,
    major: 4,
    minor: 3,
    none: 2,
    unknown: 1
  };

  const sorted = [...state.services].sort((a, b) => {
    const aStatus = a?.status?.indicator || a.defaultStatus || "unknown";
    const bStatus = b?.status?.indicator || b.defaultStatus || "unknown";
    return rank[bStatus] - rank[aStatus];
  });

  sorted.forEach((svc) => {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-id", svc.id);

    const row = document.createElement("div");
    row.className = "row";

    const avatar = document.createElement("div");
    avatar.className = "logo2";
    const fav = `https://icons.duckduckgo.com/ip3/${new URL(svc.url).hostname}.ico`;
    const img = document.createElement("img");
    img.src = fav;
    img.alt = "";
    img.onerror = () => {
      img.remove();
      avatar.textContent = (svc.name[0] || "?").toUpperCase();
    };
    avatar.appendChild(img);
    row.appendChild(avatar);

    const mid = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = svc.name;
    const host = document.createElement("div");
    host.className = "muted";
    host.textContent = new URL(svc.url).hostname;
    mid.append(name, host);
    row.appendChild(mid);

    const badge = document.createElement("div");
    const desc = document.createElement("div");
    const meta = document.createElement("div");

    // 🔧 Detecta status (com fallback)
    const status = svc.status?.indicator || svc.defaultStatus || "unknown";
    const cssClass = status === "none" ? "ok" : status;
    badge.className = `badge ${cssClass}`;
    badge.textContent = status === "none" ? "OK" : "Incidente";
    
    desc.className = "desc";
    meta.className = "muted";
    
    // 🔧 Se não tem API, mostra mensagem personalizada
    if (!svc.api) {
      desc.textContent = "Status exibido via página externa";
      meta.innerHTML = `<a href="${svc.url}" target="_blank">ver status →</a>`;
    } else {
      desc.textContent = svc.description || "Aguardando dados…";
      const link = svc.pageUrl || svc.url || "#";
      meta.innerHTML = `Desde: ${svc.timestamp || "—"} • <a href="${svc.url}" target="_blank">ver status →</a>`;

    }
    

    row.appendChild(badge);
    card.append(row, desc, meta);
    grid.appendChild(card);
  });

  refreshAllServices();
}




// 🚀 Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Ativa botão "Atualizar agora"
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      state.nextAt = Date.now() + INTERVAL_MS;
      refreshAllServices();
    });
  }

  // Atalho de teclado: R
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r") {
      state.nextAt = Date.now() + INTERVAL_MS;
      refreshAllServices();
    }
  });
  loadConfig();
  renderAll();
  startLoop();
});
console.log(`
███████╗ █████╗  ██████╗ ███╗   ██╗
╚══███╔╝██╔══██╗██╔═══██║████╗  ██║
  ███╔╝ ███████║██║   ██║██╔██╗ ██║
 ███╔╝  ██╔══██║██║   ██║██║╚██╗██║
███████╗██║  ██║╚██████╔╝██║ ╚████║
╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝

`);
//console.log("Serviços carregados no Dash:", state.services);
