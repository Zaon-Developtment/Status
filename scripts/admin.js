/**
 * admin.js - Lógica Principal do Painel de Administração ZAON
 * Gerencia o objeto zaonConfig no localStorage (CRUD de Serviços, Perfil e Preferências).
 */
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
  })();*/
// ================================
// ZAON ADMIN DASHBOARD
// ================================
// Tudo neste arquivo roda 100% localmente no navegador.
// As configurações são salvas no localStorage com a chave 'zaonConfig'.
// O código está organizado por seções com comentários explicativos.
// ================================

// --- CHAVE DE ARMAZENAMENTO LOCAL ---
// =======================================
// ZAON ADMIN PANEL - VERSÃO FINAL
// =======================================
//
// Este script controla todo o painel Admin e sincroniza com o Dashboard.
// Ele salva e lê tudo de localStorage (sem backend).
//
// Funcionalidades principais:
// - Carregar e salvar configurações locais (perfil, prefs, serviços).
// - Editar nome e avatar usados no cabeçalho.
// - Adicionar, editar, ocultar (active=false) e remover serviços.
// - Alterar intervalo de atualização (SEC).
// - Exportar/importar todas as configs como .json.
// - Resetar tudo para o estado padrão.
// - Sincronizar automaticamente com o dashboard (broadcast em tempo real).
//
// IMPORTANTE: IDs esperados no HTML já foram mapeados com você.
// Se você mudar IDs no HTML depois, atualize aqui também.
//
// =======================================

// =======================================================
// ZAON ADMIN PANEL - VERSÃO FINAL
// =======================================================
//
// Visão geral:
// - Tudo roda local, sem backend
// - O estado completo mora em localStorage na chave 'zaonConfig'
// - Este painel Admin edita esse estado
// - O Dashboard lê esse mesmo estado e exibe os resultados
// - Sincronização em tempo real Admin -> Dash via BroadcastChannel("zaon-sync")
//
// O que este arquivo faz:
// 1. Carrega e mantém um objeto config = { profile, prefs, services }
// 2. Renderiza o Admin UI (perfil, serviços, prefs)
// 3. Permite editar perfil (nome/avatar)
// 4. Permite adicionar/editar/remover serviços + alternar visibilidade (active)
// 5. Permite salvar intervalo SEC para o Dash
// 6. Exportar / Importar toda a config
// 7. Reset total da config para o padrão ZAON
// 8. Notifica o Dash sempre que algo muda
//
// MUITO IMPORTANTE
// - NÃO existe catálogo fixo de serviços aqui. O catálogo "base" pertence ao Dash.
//   O Dash popula 'zaonConfig.services' (com active=true).
//   O Admin só edita o que o Dash criou/salvou.
// - Quando você reseta tudo no Admin, a gente limpa e volta pro padrão mínimo.
//   Depois o Dash vai repopular os serviços padrões dele na próxima execução.
//
// =======================================================
const BASE_SERVICES = [
  // AI / Dev
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    url: "https://status.openai.com",
    api: "https://status.openai.com/api/v2/summary.json",
    active: true
  },
  {
    id: "slack",
    name: "Slack",
    url: "https://slack-status.com",
    api: "https://slack-status.com/api/v2.0.0/current",
    active: true
  },/*
  {
    id: "notion",
    name: "Notion",
    url: "https://www.notion-status.com",
    api: null,
    defaultStatus: "none", // força visual de OK
    active: true
  },*/
  {
    id: "github",
    name: "GitHub",
    url: "https://www.githubstatus.com",
    api: "https://www.githubstatus.com/api/v2/summary.json",
    active: true
  },

  // Cloud & Google
  {
    id: "cloudflare",
    name: "Cloudflare",
    url: "https://www.cloudflarestatus.com",
    api: "https://www.cloudflarestatus.com/api/v2/summary.json",
    active: true
  },
  {
    id: "gcloud",
    name: "Google Cloud (incidentes)",
    url: "https://status.cloud.google.com",
    api: "https://status.cloud.google.com/incidents.json",
    active: true
  },
  {
    id: "gworkspace",
    name: "Google Workspace (Gmail/Drive)",
    url: "https://www.google.com/appsstatus/dashboard",
    api: "https://www.google.com/appsstatus/dashboard/incidents.json",
    active: true
  },
/*
  // Comunicação / Mídia
  {
    id: "wordpress",
    name: "WordPress.com",
    url: "https://wordpress.com/status",
    api: null,
    defaultStatus: "none", // força visual de OK
    active: true
  }, */
  {
    id: "monday",
    name: "monday.com",
    url: "https://status.monday.com",
    api: "https://status.monday.com/api/v2/summary.json",
    active: true
  },
/*
  // Redes Sociais / Meta
  {
    id: "meta",
    name: "Meta",
    url: "https://metastatus.com",
    api: null,
    defaultStatus: "none",
    active: true
  },*/
  {
    id: "linkedin",
    name: "LinkedIn",
    url: "https://www.linkedin-status.com",
    api: "https://www.linkedin-status.com/api/v2/summary.json",
    active: true
  },/*
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.google.com/appsstatus/dashboard",
    api: "https://www.google.com/appsstatus/dashboard/incidents.json",
    active: true
  }, */
/*
  // Marketing & Ads
  {
    id: "googleads",
    name: "Google Ads",
    url: "https://ads.google.com",
    api: null,
    defaultStatus: "none", // força visual de OK
    active: true
  },*/ /*
  {
    id: "aws",
    name: "Amazon Web Services (AWS)",
    url: "https://status.aws.amazon.com",
    api: null,
    defaultStatus: "none", // força visual de OK
    active: true
  },*/
  /* {
    id: "adobe",
    name: "Adobe",
    url: "https://status.adobe.com",
    api: null,
    defaultStatus: "none", // força visual de OK
    active: true
  } */
];



// -------------------------------------------------------
// 0. Constantes centrais e estado em memória
// -------------------------------------------------------

const LOCAL_STORAGE_KEY = "zaonConfig"; // chave única de storage
const SYNC_CHANNEL_NAME = "zaon-sync";  // canal de sync Admin <-> Dash

// Canal Broadcast para avisar o Dash sempre que algo muda
let syncChannel;
try {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
} catch (err) {
  console.warn("[ZAON ADMIN] BroadcastChannel não suportado:", err);
  syncChannel = null;
}

// Estado atual em memória (carregado do localStorage)
let zaonConfig = {
  profile: {
    name: "ZAON",
    avatar: "https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg"
  },
  prefs: {
    updateInterval: 60 // SECs padrão
  },
  services: [] // array de serviços [{id, name, url, api, active, ...}]
};

// Serviço que está sendo editado no modal
let currentServiceId = null;


// -------------------------------------------------------
// 1. Helpers utilitários
// -------------------------------------------------------

/**
 * showToast(msg, type)
 * Mostra uma notificação temporária no canto/tela.
 * Espera que exista <div id="toast"> no admin.html
 * type pode ser 'info', 'success', 'error'
 */
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

/**
 * broadcastUpdate(kind)
 * Envia uma mensagem pro Dashboard avisando que a config mudou.
 * O Dash vai ouvir esse canal e atualizar:
 * - nome/avatar no header
 * - serviços ativos
 * - intervalo SEC
 * sem precisar recarregar.
 */
function broadcastUpdate(kind) {
  if (!syncChannel) return;
  try {
    syncChannel.postMessage({
      type: kind,
      at: Date.now()
    });
    console.log("[ZAON ADMIN] Broadcast:", kind);
  } catch (err) {
    console.warn("[ZAON ADMIN] Falha ao broadcast:", err);
  }
}

/**
 * getFaviconUrl(service)
 * Tenta gerar um favicon bonito pro serviço baseado no domínio.
 * Se falhar, a UI cai num fallback '⚙️'.
 */
function getFaviconUrl(service) {
  if (!service || !service.url) return "";

  try {
    const host = new URL(service.url).hostname;
    // DuckDuckGo favicon service
    return `https://icons.duckduckgo.com/ip3/${host}.ico`;
  } catch (e) {
    return "";
  }
}


// -------------------------------------------------------
// 2. Persistência localStorage
// -------------------------------------------------------

/**
 * loadConfig()
 * Carrega config salva do localStorage para a memória.
 * Não faz merge com catálogo fixo nenhum.
 * Se não existir nada no localStorage (primeiro acesso),
 * mantém o objeto default (zaonConfig já declarado lá em cima).
 */
 function loadConfig() {
  const raw = localStorage.getItem("zaonConfig");

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      zaonConfig = {
        profile: parsed.profile || { name: "ZAON", avatar: "https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg" },
        prefs: parsed.prefs || { updateInterval: 60 },
        services: Array.isArray(parsed.services) ? parsed.services : []
      };

      // ⚠️ Se os serviços estiverem vazios, repopula com os base
      if (zaonConfig.services.length === 0) {
        zaonConfig.services = BASE_SERVICES.map(s => ({ ...s }));
        saveConfig("config-initialized");
      }
    } catch (err) {
      console.error("[ZAON ADMIN] Erro ao carregar config:", err);
    }
  } else {
    // ⚠️ Primeiro acesso: cria config do zero
    zaonConfig = {
      profile: { name: "ZAON", avatar: "https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg" },
      prefs: { updateInterval: 60 },
      services: BASE_SERVICES.map(s => ({ ...s }))
    };
    saveConfig("config-initialized");
  }
}



/**
 * saveConfig()
 * Salva o estado atual em localStorage,
 * re-renderiza a UI pra refletir as mudanças
 * e avisa o Dash (broadcast).
 */
function saveConfig(reason = "config-updated") {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(zaonConfig));
  } catch (e) {
    console.error("[ZAON ADMIN] saveConfig() falhou:", e);
    showToast("Erro ao salvar no navegador.", "error");
    return;
  }

  renderUI();
  broadcastUpdate(reason);
  console.log("[ZAON ADMIN] Config salva com motivo:", reason);
}

/**
 * resetToFactoryDefaults()
 * Ação do botão "Resetar Tudo".
 *
 * O que ela faz:
 * - Restaura o nome e avatar padrão ZAON.
 * - Restaura prefs.updateInterval = 60.
 * - Zera a lista de services ([])
 *   (isso força o Dash, na próxima abertura/refresh dele,
 *    a repopular os serviços padrões que ele conhece do CATALOG.)
 * - Salva e sincroniza.
 */
 function resetToFactoryDefaults() {
  // 🔥 Limpa localStorage e cache do navegador
  try {
    localStorage.removeItem("zaonConfig");
    if ("caches" in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    console.log("[ZAON] Cache e localStorage limpos.");
  } catch (e) {
    console.warn("[ZAON] Falha ao limpar cache/localStorage:", e);
  }

  // 🧠 Restaura config padrão
  zaonConfig = {
    profile: {
      name: "ZAON",
      avatar: "https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg"
    },
    prefs: {
      updateInterval: 60
    },
    services: BASE_SERVICES.map(s => ({ ...s })) // cópia limpa
  };

  saveConfig("config-reset");
  showToast("Configurações restauradas para padrão ZAON.", "info");
}


// -------------------------------------------------------
// 3. Renderização da UI
// -------------------------------------------------------

/**
 * renderHeaderAndProfile()
 * Atualiza o header do Admin e o card de perfil no painel:
 * - #adminLogo, #adminTitle (header)
 * - #profileAvatar, #profileName (card do perfil)
 * - #updateInterval (prefs)
 */
function renderHeaderAndProfile() {
  const profile = zaonConfig.profile;
  const prefs = zaonConfig.prefs;

  // Atualiza header topo
  const headerLogo = document.getElementById("adminLogo");
  const headerTitle = document.getElementById("adminTitle");

  if (headerLogo) {
    headerLogo.src = profile.avatar || "";
  }
  if (headerTitle) {
    headerTitle.innerHTML = `<b>${profile.name || "ZAON"}</b>`;
  }

  // Atualiza card Perfil à esquerda
  const profileAvatar = document.getElementById("profileAvatar");
  const profileName = document.getElementById("profileName");

  if (profileAvatar) {
    profileAvatar.src = profile.avatar || "";
  }
  if (profileName) {
    profileName.textContent = profile.name || "ZAON";
  }

  // Atualiza intervalo SEC (lado direito)
  const updateIntervalInput = document.getElementById("updateInterval");
  if (updateIntervalInput) {
    updateIntervalInput.value = prefs.updateInterval ?? 60;
  }
}

/**
 * renderServicesGrid()
 * Atualiza a coluna central com a lista de serviços.
 * Usa:
 * - #servicesGrid (container dos cards)
 * - #serviceCount
 * - #emptyServiceList
 *
 * Cada card de serviço tem:
 * - Ícone (favicon se disponível, fallback ⚙️)
 * - Nome
 * - URL
 * - Toggle (checkbox) para active ON/OFF (mostrar/ocultar no Dash)
 * - Botão Editar (abre modal de edição)
 *
 * IMPORTANTE:
 * - NÃO TEM botão "Remover" visível nesse card.
 *   Remover definitivo só dentro do modal.
 */
function renderServicesGrid() {
  const grid = document.getElementById("servicesGrid");
  const countEl = document.getElementById("serviceCount");
  const emptyEl = document.getElementById("emptyServiceList");

  if (!grid || !countEl || !emptyEl) {
    console.warn("[ZAON ADMIN] Elementos de serviços ausentes no HTML.");
    return;
  }

  const services = zaonConfig.services || [];

  // Atualiza contador total
  countEl.textContent = String(services.length);

  // Exibe/oculta aviso "Nenhum serviço configurado..."
  emptyEl.style.display = services.length === 0 ? "block" : "none";

  // Limpa grid antes de recriar
  grid.innerHTML = "";

  // Monta cada card
  services.forEach((service) => {
    // Calcula favicon
    const favUrl = getFaviconUrl(service);

    const card = document.createElement("div");
    card.className = "card service-admin-card";
    card.setAttribute("data-id", service.id);

    card.innerHTML = `
      <div class="service-header">
        <div class="service-icon-wrapper">
          ${
            favUrl
              ? `<img src="${favUrl}" class="service-icon" alt="Ícone do serviço"
                   onerror="this.remove(); this.closest('.service-icon-wrapper').textContent='⚙️';">`
              : "⚙️"
          }
        </div>
        <strong>${service.name || "Serviço"}</strong>
      </div>

      <span class="service-url">${service.url || ""}</span>

      <div class="service-controls">
        <label class="toggle-switch">
          <input type="checkbox"
                 data-id="${service.id}"
                 class="service-toggle"
                 ${service.active ? "checked" : ""}>
          <span class="slider"></span>
        </label>
        <button class="btn btn-edit-service" data-id="${service.id}">Editar</button>
      </div>
    `;

    grid.appendChild(card);
  });

  // Depois de montar o HTML de cada card, linka os eventos:
  // Toggle de visibilidade (active on/off)
  document.querySelectorAll(".service-toggle").forEach((input) => {
    input.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const checked = e.target.checked;
      toggleServiceActive(id, checked);
    });
  });

  // Botão "Editar" (que abre modal)
  document.querySelectorAll(".btn-edit-service").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      openServiceEditModal(e.target.dataset.id);
    });
  });
}

/**
 * renderUI()
 * Chama as partes de renderização principais.
 */
function renderUI() {
  renderHeaderAndProfile();
  renderServicesGrid();
  // O conteúdo dos modais é preenchido on-demand (ao abrir)
}


// -------------------------------------------------------
// 4. Perfil e Preferências
// -------------------------------------------------------

/**
 * handleEditProfile(e)
 * Salva alterações de nome e avatar através do modal "Editar Perfil".
 *
 * Fluxo:
 * - Pega `newProfileName`
 * - Se tiver novo arquivo em `newProfileAvatar`, lê como base64 e salva em zaonConfig.profile.avatar
 * - Atualiza zaonConfig
 * - saveConfig() -> que também broadcasta
 */
function handleEditProfile(e) {
  e.preventDefault();

  const newName = document.getElementById("newProfileName").value.trim();
  const newAvatarFile = document.getElementById("newProfileAvatar").files[0];

  let changedWithoutAvatar = false;

  // Atualiza nome se mudou
  if (newName && newName !== zaonConfig.profile.name) {
    zaonConfig.profile.name = newName;
    changedWithoutAvatar = true;
  }

  // Se o usuário escolheu um novo avatar (upload local)
  if (newAvatarFile) {
    const reader = new FileReader();
    reader.onload = (event) => {
      zaonConfig.profile.avatar = event.target.result; // base64
      saveConfig("config-updated");

      // Fecha modal
      const modal = document.getElementById("profileModal");
      if (modal) modal.style.display = "none";

      showToast("Perfil atualizado!", "success");
    };
    reader.onerror = () => {
      showToast("Erro ao ler imagem.", "error");
    };
    reader.readAsDataURL(newAvatarFile);

    return; // importante: sai aqui porque saveConfig já foi chamado no onload
  }

  // Se apenas o nome mudou (sem trocar avatar):
  if (changedWithoutAvatar) {
    saveConfig("config-updated");
    showToast("Nome atualizado!", "success");
  } else {
    showToast("Nenhuma alteração feita.", "info");
  }

  // Fecha modal
  const modal = document.getElementById("profileModal");
  if (modal) modal.style.display = "none";
}

/**
 * handleSavePrefs(e)
 * Salva as preferências globais (por enquanto, só o intervalo SEC).
 *
 * SEC => prefs.updateInterval (em segundos).
 *
 * Depois:
 * - saveConfig("config-updated") => escreve no localStorage
 * - broadcastUpdate => Dash ouve
 * - Dash atualiza o INTERVAL_MS e o countdown (sem recarregar).
 */
function handleSavePrefs(e) {
  e.preventDefault();

  const intervalInput = document.getElementById("updateInterval");
  if (!intervalInput) {
    showToast("Campo de intervalo não encontrado.", "error");
    return;
  }

  const val = parseInt(intervalInput.value, 10);
  if (isNaN(val) || val < 5) {
    showToast("Intervalo inválido. Use >= 5s.", "error");
    return;
  }

  zaonConfig.prefs.updateInterval = val;

  saveConfig("config-updated");
  showToast("Preferências salvas!", "success");
}


// -------------------------------------------------------
// 5. Serviços: adicionar, editar, ocultar, remover
// -------------------------------------------------------

/**
 * handleAddService(e)
 * Adiciona um novo serviço a partir do formulário "Adicionar Novo Serviço".
 *
 * Campos no seu HTML:
 * - #serviceName
 * - #serviceUrl
 * - #serviceApi
 *
 * Regras:
 * - Gera um id único simples.
 * - Cria o objeto do serviço.
 * - Por padrão active = true (visível no Dash).
 * - Salva e re-renderiza.
 */
function handleAddService(e) {
  e.preventDefault();

  const nameEl = document.getElementById("serviceName");
  const urlEl = document.getElementById("serviceUrl");
  const apiEl = document.getElementById("serviceApi");

  const name = nameEl.value.trim();
  const url = urlEl.value.trim();
  const api = apiEl.value.trim();

  if (!name || !url || !api) {
    showToast("Preencha todos os campos do serviço.", "error");
    return;
  }

  const newService = {
    id: "s" + Date.now(), // ID único baseado em timestamp
    name,
    url,
    api,
    active: true
  };

  // Adiciona o novo serviço no array
  zaonConfig.services.push(newService);

  // Persiste
  saveConfig("config-updated");

  // Limpa o form
  nameEl.value = "";
  urlEl.value = "";
  apiEl.value = "";

  showToast(`Serviço "${name}" adicionado!`, "success");
}

/**
 * openServiceEditModal(id)
 * Abre o modal "Editar Serviço" já preenchido com os dados existentes.
 *
 * O modal no HTML tem:
 * - input hidden #editServiceId
 * - #editServiceName
 * - #editServiceUrl
 * - #editServiceApi
 * - botão salvar (#editServiceForm submit)
 * - botão excluir (#deleteServiceBtn)
 */
function openServiceEditModal(id) {
  currentServiceId = id;

  const svc = zaonConfig.services.find((s) => s.id === id);
  if (!svc) {
    showToast("Serviço não encontrado.", "error");
    return;
  }

  // Preenche o modal
  document.getElementById("editServiceId").value = svc.id;
  document.getElementById("editServiceName").value = svc.name || "";
  document.getElementById("editServiceUrl").value = svc.url || "";
  document.getElementById("editServiceApi").value = svc.api || "";

  // Mostra modal
  const modal = document.getElementById("serviceEditModal");
  if (modal) {
    modal.style.display = "block";
  }
}

/**
 * handleEditService(e)
 * Salva alterações feitas no modal "Editar Serviço".
 * Atualiza nome, url e api.
 * NÃO mexe em active aqui.
 */
function handleEditService(e) {
  e.preventDefault();

  const id = document.getElementById("editServiceId").value;
  const svcIndex = zaonConfig.services.findIndex((s) => s.id === id);

  if (svcIndex === -1) {
    showToast("Erro: serviço não encontrado.", "error");
    return;
  }

  zaonConfig.services[svcIndex].name =
    document.getElementById("editServiceName").value.trim();
  zaonConfig.services[svcIndex].url =
    document.getElementById("editServiceUrl").value.trim();
  zaonConfig.services[svcIndex].api =
    document.getElementById("editServiceApi").value.trim();

  saveConfig("config-updated");

  // Fecha modal
  const modal = document.getElementById("serviceEditModal");
  if (modal) modal.style.display = "none";

  showToast("Serviço atualizado!", "success");
}

/**
 * handleDeleteService()
 * Chamado SOMENTE dentro do modal via botão #deleteServiceBtn.
 * Remove realmente o serviço do array e salva.
 * Depois fecha o modal.
 */
function handleDeleteService() {
  const id = document.getElementById("editServiceId").value;
  const svc = zaonConfig.services.find((s) => s.id === id);
  if (!svc) {
    showToast("Serviço não encontrado.", "error");
    return;
  }

  const confirmed = confirm(
    `Tem certeza que deseja remover definitivamente o serviço "${svc.name}"?`
  );
  if (!confirmed) return;

  // Remove do array
  zaonConfig.services = zaonConfig.services.filter((s) => s.id !== id);

  saveConfig("config-updated");

  // Fecha modal
  const modal = document.getElementById("serviceEditModal");
  if (modal) modal.style.display = "none";

  showToast(`Serviço "${svc.name}" removido.`, "info");
}

/**
 * toggleServiceActive(id, activeVal)
 * Chamado quando o usuário muda o toggle ON/OFF no card.
 * Isso controla se o serviço aparece no Dash.
 */
function toggleServiceActive(id, activeVal) {
  const svc = zaonConfig.services.find((s) => s.id === id);
  if (!svc) return;

  svc.active = activeVal ? true : false;

  saveConfig("config-updated");

  showToast(
    `Serviço "${svc.name}" ${svc.active ? "visível no Dashboard" : "ocultado do Dashboard"}.`,
    "info"
  );
}


// -------------------------------------------------------
// 6. Backup (Exportar) / Importar JSON
// -------------------------------------------------------

/**
 * exportConfig()
 * Faz download de um .json com a config atual completa.
 * Inclui: profile, prefs, services.
 */
function exportConfig() {
  const dataStr = JSON.stringify(zaonConfig, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "zaonConfigBackup.json";
  a.click();

  URL.revokeObjectURL(url);

  showToast("Backup exportado.", "success");
}

/**
 * triggerImport()
 * Aciona o input de arquivo escondido (#importFile).
 */
function triggerImport() {
  const fileInput = document.getElementById("importFile");
  if (fileInput) {
    // limpo pra permitir importar de novo o mesmo arquivo
    fileInput.value = "";
    fileInput.click();
  }
}

/**
 * handleImportFile(e)
 * Lê o arquivo .json selecionado e substitui TUDO na config:
 * - profile
 * - prefs
 * - services
 * Depois chama saveConfig("config-imported") e re-renderiza.
 */
function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);

      // substitui zaonConfig inteiro pelo arquivo importado
      zaonConfig = imported;

      saveConfig("config-imported");
      showToast("Configurações importadas!", "success");
    } catch (err) {
      console.error("[ZAON ADMIN] Import JSON erro:", err);
      showToast("Falha ao importar arquivo.", "error");
    }
  };
  reader.readAsText(file);
}


// -------------------------------------------------------
// 7. Inicialização e listeners
// -------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  console.log("[ZAON ADMIN] Iniciando painel Admin...");

  // 1. Carrega config atual do localStorage
  loadConfig();

  // 2. Renderiza UI completa
  renderUI();

  // ----- MODAIS -----

  const profileModal = document.getElementById("profileModal");
  const serviceEditModal = document.getElementById("serviceEditModal");

  // Botão "Alterar Perfil" abre o modal de perfil
  const editProfileBtn = document.getElementById("editProfileBtn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      // Preenche campo nome atual
      const nameField = document.getElementById("newProfileName");
      if (nameField) {
        nameField.value = zaonConfig.profile.name || "";
      }

      // Limpa o input de avatar
      const avatarInput = document.getElementById("newProfileAvatar");
      if (avatarInput) {
        avatarInput.value = "";
      }

      if (profileModal) {
        profileModal.style.display = "block";
      }
    });
  }

  // X de fechar modal (tanto perfil quanto serviço)
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      if (modal) modal.style.display = "none";
    });
  });

  // Fechar modal clicando fora
  window.addEventListener("click", (evt) => {
    if (evt.target === profileModal) {
      profileModal.style.display = "none";
    }
    if (evt.target === serviceEditModal) {
      serviceEditModal.style.display = "none";
    }
  });

  // ----- FORMULÁRIOS -----

  // Form de perfil (salva nome e avatar)
  const editProfileForm = document.getElementById("editProfileForm");
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", handleEditProfile);
  }

  // Form de adicionar serviço
  const addServiceForm = document.getElementById("addServiceForm");
  if (addServiceForm) {
    addServiceForm.addEventListener("submit", handleAddService);
  }

  // Form de edição de serviço (no modal)
  const editServiceForm = document.getElementById("editServiceForm");
  if (editServiceForm) {
    editServiceForm.addEventListener("submit", handleEditService);
  }

  // Botão "Excluir Serviço" (dentro do modal)
  const deleteServiceBtn = document.getElementById("deleteServiceBtn");
  if (deleteServiceBtn) {
    deleteServiceBtn.addEventListener("click", handleDeleteService);
  }

  // Form de preferências (SECs)
  const prefsForm = document.getElementById("prefsForm");
  if (prefsForm) {
    prefsForm.addEventListener("submit", handleSavePrefs);
  }

  // ----- BACKUP / RESTORE -----

  // Botão Exportar
  const exportBtn = document.getElementById("exportConfigBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportConfig);
  }

  // Botão Importar (abre seletor de arquivo)
  const importBtn = document.getElementById("importConfigBtn");
  if (importBtn) {
    importBtn.addEventListener("click", triggerImport);
  }

  // Input de arquivo escondido que realmente lê o .json
  const importFileInput = document.getElementById("importFile");
  if (importFileInput) {
    importFileInput.addEventListener("change", handleImportFile);
  }

  // Botão Reset Total (Resetar Tudo)
  const resetBtn = document.getElementById("resetConfigBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const sure = confirm(
        "Resetar tudo para o padrão ZAON?\nIsso vai apagar avatar customizado, serviços adicionados e prefs."
      );
      if (!sure) return;
      resetToFactoryDefaults();
    });
  }

  console.log("[ZAON ADMIN] Painel pronto.");
});
