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



// ------------------------------------------------------
// 1. CANAL DE SINCRONIZAÇÃO COM O DASHBOARD
// ------------------------------------------------------
//
// Vamos usar BroadcastChannel para mandar mensagens
// entre o Admin e o Dashboard. Nome combinado: "zaon-sync"
//
const syncChannel = new BroadcastChannel("zaon-sync");

function broadcastUpdate(type) {
  // Chamamos isso sempre que algo importante muda.
  // O Dashboard pode ouvir e reagir sem reload.
  try {
    syncChannel.postMessage({
      type,
      timestamp: Date.now(),
    });
    console.log("[ZAON ADMIN] Broadcast enviado:", type);
  } catch (err) {
    console.warn("[ZAON ADMIN] Falha ao broadcast:", err);
  }
}



// ------------------------------------------------------
// 2. CONFIGURAÇÃO PADRÃO / ESTRUTURA DE DADOS
// ------------------------------------------------------
//
// Esta é a "fábrica" do sistema. O reset volta para isso.
// O Dashboard também deve refletir esses dados.
//
// - profile: nome e avatar exibidos no header (Admin e Dashboard)
// - prefs: SEC de atualização
// - services: lista de serviços monitorados
//
// OBS: 'active: true' significa "mostrar no Dashboard".
//      'active: false' = oculto no Dashboard, mas ainda aparece no Admin.
//      Se um serviço for EXCLUÍDO, ele some de vez.
// ------------------------------------------------------

const LOCAL_STORAGE_KEY = "zaonConfig";

// Catálogo base (o mesmo conceito do CATALOG do dash.js).
// Isso aqui será usado na rotina de reset, e para garantir mínimo inicial.
const BASE_SERVICES = [
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    url: "https://status.openai.com/",
    api: "https://status.openai.com/api/v2/summary.json",
    active: true,
  },
  {
    id: "slack",
    name: "Slack",
    url: "https://slack-status.com/",
    api: "https://slack-status.com/api/v2/summary.json",
    active: true,
  },
  {
    id: "notion",
    name: "Notion",
    url: "https://status.notion.so/",
    api: "https://status.notion.so/api/v2/summary.json",
    active: true,
  },
  {
    id: "github",
    name: "GitHub",
    url: "https://www.githubstatus.com/",
    api: "https://www.githubstatus.com/api/v2/summary.json",
    active: true,
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    url: "https://www.cloudflarestatus.com/",
    api: "https://www.cloudflarestatus.com/api/v2/summary.json",
    active: true,
  },
  {
    id: "gcp",
    name: "Google Cloud (incidentes)",
    url: "https://status.cloud.google.com/",
    api: "https://status.cloud.google.com/incidents.json",
    active: true,
  },
  {
    id: "google_workspace",
    name: "Google Workspace (Gmail/Drive)",
    url: "https://www.google.com/appsstatus/dashboard/",
    api: "https://www.google.com/appsstatus/dashboard/incidents.json",
    active: true,
  },
  {
    id: "discord",
    name: "Discord",
    url: "https://discordstatus.com/",
    api: "https://discordstatus.com/api/v2/summary.json",
    active: true,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    url: "https://status.dropbox.com/",
    api: "https://status.dropbox.com/api/v2/summary.json",
    active: true,
  },
  {
    id: "reddit",
    name: "Reddit",
    url: "https://www.redditstatus.com/",
    api: "https://www.redditstatus.com/api/v2/summary.json",
    active: true,
  },
  {
    id: "wordpress",
    name: "WordPress.com",
    url: "https://wpcomstatus.com/",
    api: "https://wpcomstatus.com/api/v2/summary.json",
    active: true,
  },
  {
    id: "monday",
    name: "monday.com",
    url: "https://status.monday.com/",
    api: "https://status.monday.com/api/v2/summary.json",
    active: true,
  },
];

// Config padrão geral (reset volta pra isso)
const DEFAULT_CONFIG = {
  profile: {
    name: "ZAON",
    avatar:
      "https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg",
  },
  prefs: {
    // SEC / intervalo de atualização em segundos
    updateInterval: 60,
  },
  services: [...BASE_SERVICES],
};

// Estado vivo em memória (editável)
let zaonConfig = {};
// Serviço atualmente em edição no modal
let currentServiceId = null;



// ------------------------------------------------------
// 3. TOAST / NOTIFICAÇÕES
// ------------------------------------------------------
//
// Exibe mensagens rápidas (sucesso, erro etc.) por alguns segundos.
//
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



// ------------------------------------------------------
// 4. CARREGAR E SALVAR CONFIG
// ------------------------------------------------------
//
// loadConfig():
//   - Lê localStorage.
//   - Faz merge defensivo com DEFAULT_CONFIG (garante campos novos).
//   - NÃO sobrescreve nada automaticamente.
//
// saveConfig():
//   - Escreve no localStorage.
//   - Re-renderiza a UI.
//   - Notifica o Dashboard via broadcastUpdate().
//
// resetToFactoryDefaults():
//   - Volta tudo pro estado "fábrica/primeiro uso".
//   - Salva + rerender + broadcast.
//
// IMPORTANTE: tudo gira ao redor de LOCAL_STORAGE_KEY = 'zaonConfig'.
//

function loadConfig() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) || {};

      // Merge defensivo: garante que todas as chaves existam
      zaonConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        profile: {
          ...DEFAULT_CONFIG.profile,
          ...(parsed.profile || {}),
        },
        prefs: {
          ...DEFAULT_CONFIG.prefs,
          ...(parsed.prefs || {}),
        },
        services: Array.isArray(parsed.services)
          ? parsed.services
          : [...DEFAULT_CONFIG.services],
      };
    } catch (err) {
      console.error("[ZAON ADMIN] Erro lendo localStorage, usando padrão:", err);
      zaonConfig = structuredClone(DEFAULT_CONFIG);
    }
  } else {
    // Primeira vez: usa padrão de fábrica
    zaonConfig = structuredClone(DEFAULT_CONFIG);
  }
}

function saveConfig() {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(zaonConfig)
    );
    // Depois de salvar, atualiza UI
    renderUI();
    // E avisa o Dashboard que mudou (perfil, serviços, prefs...)
    broadcastUpdate("config-updated");
  } catch (e) {
    console.error("[ZAON ADMIN] Falha ao salvar config:", e);
    showToast("Erro ao salvar no navegador.", "error");
  }
}

function resetToFactoryDefaults() {
  // Restaura o objeto inteiro como se fosse primeira vez
  zaonConfig = structuredClone(DEFAULT_CONFIG);

  // Persiste e re-renderiza
  saveConfig();

  // Mensagem visual
  showToast("Configurações resetadas para padrão ZAON.", "info");

  // Informar dashboard para aplicar reset
  broadcastUpdate("config-reset");
}



// ------------------------------------------------------
// 5. RENDERIZAÇÃO DA INTERFACE
// ------------------------------------------------------
//
// Temos 3 áreas principais:
//   - Perfil / Cabeçalho
//   - Lista de Serviços
//   - Preferências (SEC)
//
// Cada uma tem sua função de render.
//
// renderUI() chama tudo.
// ------------------------------------------------------

// Função utilitária: gera URL de favicon baseada no domínio
function getFaviconOrFallback(service) {
  // 1. tenta extrair host
  let host = "";
  try {
    host = new URL(service.url).hostname;
  } catch (e) {
    host = "";
  }

  // 2. monta favicon via DuckDuckGo (ícones públicos)
  if (host) {
    // Exemplo: https://icons.duckduckgo.com/ip3/status.cloud.google.com.ico
    return `https://icons.duckduckgo.com/ip3/${host}.ico`;
  }

  // 3. fallback: engrenagem/ícone padrão
  // você pode trocar depois por um caminho do seu projeto tipo "./files/gear.png"
  return "";
}

// Renderiza header + card de perfil + pré-preenche preferências
function renderHeaderAndProfile() {
  const profile = zaonConfig.profile || {};
  const prefs = zaonConfig.prefs || {};

  // HEADER (logo + título)
  const headerLogo = document.getElementById("adminLogo");
  const headerTitle = document.getElementById("adminTitle");
  if (headerLogo) {
    headerLogo.src = profile.avatar || DEFAULT_CONFIG.profile.avatar;
  }
  if (headerTitle) {
    headerTitle.innerHTML = `<b>${profile.name || DEFAULT_CONFIG.profile.name}</b>`;
  }

  // CARD DE PERFIL (avatar grande + nome grande)
  const profileAvatar = document.getElementById("profileAvatar");
  const profileName = document.getElementById("profileName");
  if (profileAvatar) {
    profileAvatar.src = profile.avatar || DEFAULT_CONFIG.profile.avatar;
  }
  if (profileName) {
    profileName.textContent = profile.name || DEFAULT_CONFIG.profile.name;
  }

  // PREFERÊNCIAS (intervalo SEC)
  const updateIntervalInput = document.getElementById("updateInterval");
  if (updateIntervalInput) {
    updateIntervalInput.value = prefs.updateInterval ?? DEFAULT_CONFIG.prefs.updateInterval;
  }
}

// Renderiza a coluna central com TODOS os serviços
function renderServicesGrid() {
  const grid = document.getElementById("servicesGrid");
  const countEl = document.getElementById("serviceCount");
  const emptyEl = document.getElementById("emptyServiceList");

  if (!grid || !countEl || !emptyEl) return;

  const services = zaonConfig.services || [];

  // Atualiza contador
  countEl.textContent = services.length.toString();

  // Mostra/oculta mensagem "vazio"
  emptyEl.style.display = services.length === 0 ? "block" : "none";

  // Limpa grid
  grid.innerHTML = "";

  // Cria card visual pra cada serviço
  services.forEach((service) => {
    const card = document.createElement("div");
    card.className = "card service-admin-card";
    card.setAttribute("data-id", service.id);

    // Monta URL do favicon
    const iconUrl = getFaviconOrFallback(service);

    // HTML interno do card
    card.innerHTML = `
      <div class="service-header">
        <div class="service-icon-wrapper">
          ${
            iconUrl
              ? `<img src="${iconUrl}" class="service-icon" alt="Ícone do serviço" onerror="this.remove(); this.closest('.service-icon-wrapper').textContent='⚙';">`
              : "⚙"
          }
        </div>
        <strong>${service.name}</strong>
      </div>

      <span class="service-url">${service.url}</span>

      <div class="service-controls">
        <!-- Toggle de visibilidade (OCULTAR do Dash) -->
        <label class="toggle-switch">
          <input
            type="checkbox"
            data-id="${service.id}"
            class="service-toggle"
            ${service.active ? "checked" : ""}>
          <span class="slider"></span>
        </label>

        <!-- Botão de edição abre modal -->
        <button class="btn btn-edit-service" data-id="${service.id}">Editar</button>

        <!-- Botão de remoção (DELETE permanente) -->
        <button class="btn btn-danger btn-remove-service" data-id="${service.id}">Remover</button>
      </div>
    `;

    grid.appendChild(card);
  });

  // ====== LISTENERS DINÂMICOS DOS CARDS ======

  // 1. Abrir modal de edição
  document.querySelectorAll(".btn-edit-service").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      openServiceEditModal(id);
    });
  });

  // 2. Toggle "active" (ocultar/mostrar no Dash)
  document.querySelectorAll(".service-toggle").forEach((toggle) => {
    toggle.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const checked = e.target.checked;
      toggleServiceActive(id, checked);
    });
  });

  // 3. Remover serviço (excluir mesmo)
  document.querySelectorAll(".btn-remove-service").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      handleDeleteService(id);
    });
  });
}

// Chama todas as renderizações relevantes
function renderUI() {
  renderHeaderAndProfile();
  renderServicesGrid();
  // Modal de perfil é preenchido on-open
}



// ------------------------------------------------------
// 6. CRUD DE SERVIÇOS
// ------------------------------------------------------
//
// - Adicionar serviço novo
// - Abrir modal de edição
// - Salvar edição
// - Remover (excluir mesmo do array)
// - Ativar/Desativar (ocultar no Dash)
//

// Adiciona um novo serviço usando o formulário "Adicionar Novo Serviço"
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

  // Criar objeto do serviço
  const newService = {
    id: "s" + Date.now(), // ID baseado no timestamp (simples)
    name,
    url,
    api,
    active: true,
  };

  // Adiciona no array e salva
  zaonConfig.services.push(newService);
  saveConfig();

  // Limpa campos
  nameEl.value = "";
  urlEl.value = "";
  apiEl.value = "";

  showToast(`Serviço "${name}" adicionado!`, "success");
}

// Abre modal com dados do serviço selecionado
function openServiceEditModal(id) {
  currentServiceId = id;
  const service = zaonConfig.services.find((s) => s.id === id);
  if (!service) {
    showToast("Serviço não encontrado.", "error");
    return;
  }

  // Preenche campos no modal
  document.getElementById("editServiceId").value = service.id;
  document.getElementById("editServiceName").value = service.name;
  document.getElementById("editServiceUrl").value = service.url;
  document.getElementById("editServiceApi").value = service.api;

  // Abre modal
  const modal = document.getElementById("serviceEditModal");
  if (modal) {
    modal.style.display = "block";
  }
}

// Salva alterações após editar no modal
function handleEditService(e) {
  e.preventDefault();

  const id = document.getElementById("editServiceId").value;
  const idx = zaonConfig.services.findIndex((s) => s.id === id);

  if (idx === -1) {
    showToast("Erro ao salvar: serviço não encontrado.", "error");
    return;
  }

  zaonConfig.services[idx].name =
    document.getElementById("editServiceName").value.trim();
  zaonConfig.services[idx].url =
    document.getElementById("editServiceUrl").value.trim();
  zaonConfig.services[idx].api =
    document.getElementById("editServiceApi").value.trim();

  saveConfig();

  // fecha modal
  const modal = document.getElementById("serviceEditModal");
  if (modal) {
    modal.style.display = "none";
  }

  showToast("Serviço atualizado!", "success");
}

// Remover serviço PERMANENTEMENTE
function handleDeleteService(idFromButton = null) {
  // Caso seja chamado a partir do modal, lemos do campo hidden
  const serviceId =
    idFromButton || document.getElementById("editServiceId").value;

  const svc = zaonConfig.services.find((s) => s.id === serviceId);
  const svcName = svc ? svc.name : "este serviço";

  if (!svc) {
    showToast("Serviço não encontrado.", "error");
    return;
  }

  const confirmed = confirm(`Remover "${svcName}" permanentemente?`);
  if (!confirmed) return;

  // Filtra fora
  zaonConfig.services = zaonConfig.services.filter(
    (s) => s.id !== serviceId
  );

  saveConfig();

  // Fecha modal se estiver aberto
  const modal = document.getElementById("serviceEditModal");
  if (modal) {
    modal.style.display = "none";
  }

  showToast(`Serviço "${svcName}" removido.`, "info");
}

// Alterna active / oculto
// active=true → aparece no Dash
// active=false → oculto no Dash
function toggleServiceActive(id, activeVal) {
  const svc = zaonConfig.services.find((s) => s.id === id);
  if (!svc) return;

  svc.active = activeVal;
  saveConfig();

  showToast(
    `Serviço "${svc.name}" ${activeVal ? "visível no Dashboard" : "ocultado do Dashboard"
    }.`,
    "info"
  );
}



// ------------------------------------------------------
// 7. PERFIL (NOME + AVATAR DO HEADER)
// ------------------------------------------------------
//
// handleEditProfile():
// - lê nome novo e/ou avatar novo do modal "Editar Perfil"
// - avatar é lido como Base64 DataURL e salvo local
// - atualiza zaonConfig.profile e salva
//
// Abrir/fechar modal também é tratado no init.
//

function handleEditProfile(e) {
  e.preventDefault();

  const newName = document
    .getElementById("newProfileName")
    .value.trim();
  const newAvatarFile =
    document.getElementById("newProfileAvatar").files[0];

  let updated = false;

  // Atualiza nome
  if (newName && newName !== zaonConfig.profile.name) {
    zaonConfig.profile.name = newName;
    updated = true;
  }

  // Atualiza avatar (se foi enviado arquivo)
  if (newAvatarFile) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      zaonConfig.profile.avatar = ev.target.result; // Base64
      saveConfig();

      // Fecha modal
      const modal = document.getElementById("profileModal");
      if (modal) modal.style.display = "none";

      showToast("Perfil (nome/foto) atualizado!", "success");
    };
    reader.onerror = () => {
      showToast("Erro ao ler imagem.", "error");
    };
    reader.readAsDataURL(newAvatarFile);
    return; // Importante: sai aqui porque saveConfig já foi chamado no onload
  }

  // Se só mudou o nome:
  if (updated) {
    saveConfig();
    showToast("Nome atualizado!", "success");
  } else {
    showToast("Nenhuma alteração feita.", "info");
  }

  // Fecha modal
  const modal = document.getElementById("profileModal");
  if (modal) modal.style.display = "none";
}



// ------------------------------------------------------
// 8. PREFERÊNCIAS (SEC / INTERVALO DE ATUALIZAÇÃO)
// ------------------------------------------------------
//
// handleSavePrefs():
//  - Lê o campo "updateInterval"
//  - Atualiza zaonConfig.prefs.updateInterval
//  - Salva e sincroniza com Dash.
//  - Não mexemos ainda em tema/filtro latam por sua decisão.
//

function handleSavePrefs(e) {
  e.preventDefault();

  const intervalInput = document.getElementById("updateInterval");
  if (!intervalInput) {
    showToast("Campo de intervalo não encontrado.", "error");
    return;
  }

  const val = parseInt(intervalInput.value, 10);
  if (isNaN(val) || val < 5) {
    showToast("Intervalo inválido. Use um valor >= 5s.", "error");
    return;
  }

  zaonConfig.prefs.updateInterval = val;
  saveConfig();

  showToast("Preferências salvas!", "success");
}



// ------------------------------------------------------
// 9. BACKUP / RESTAURAÇÃO
// ------------------------------------------------------
//
// exportConfig():
//   - Baixa um arquivo JSON com o estado atual (zaonConfig).
//
// triggerImport():
//   - Simula clique no <input type="file"> escondido.
//
// handleImportFile():
//   - Lê o JSON escolhido
//   - Sobrescreve zaonConfig com esse JSON
//   - Salva + rerenderiza + broadcast
//

function exportConfig() {
  // Só dados personalizáveis (é exatamente o zaonConfig atual)
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

function triggerImport() {
  const fileInput = document.getElementById("importFile");
  if (fileInput) {
    fileInput.value = ""; // limpa antes de abrir
    fileInput.click();
  }
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);

      // Aqui a gente não faz merge defensivo.
      // A importação SUBSTITUI TUDO que existe,
      // conforme você pediu.
      zaonConfig = imported;

      saveConfig();
      showToast("Configurações importadas!", "success");

      broadcastUpdate("config-imported");
    } catch (err) {
      console.error("[ZAON ADMIN] Erro ao importar JSON:", err);
      showToast("Falha ao importar arquivo.", "error");
    }
  };
  reader.readAsText(file);
}



// ------------------------------------------------------
// 10. INICIALIZAÇÃO / EVENT LISTENERS
// ------------------------------------------------------
//
// Quando a página admin carrega (DOMContentLoaded):
//   1. Carrega config do localStorage
//   2. Renderiza UI inicial
//   3. Conecta todos os botões, formulários e modais
//   4. Garante fechamento de modal por clique fora
//   5. Ativa o botão de RESET TOTAL
//

document.addEventListener("DOMContentLoaded", () => {
  // 1. Carregar config atual
  loadConfig();

  // 2. Renderizar tudo
  renderUI();

  // --- MODAL DE PERFIL ---
  const profileModal = document.getElementById("profileModal");
  const serviceEditModal = document.getElementById("serviceEditModal");

  // Abrir modal "Editar Perfil"
  const editProfileBtn = document.getElementById("editProfileBtn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      // Preenche campo de nome atual
      const nameField = document.getElementById("newProfileName");
      if (nameField) {
        nameField.value = zaonConfig.profile.name || "";
      }

      // Limpa input de arquivo
      const avatarField = document.getElementById("newProfileAvatar");
      if (avatarField) {
        avatarField.value = "";
      }

      if (profileModal) profileModal.style.display = "block";
    });
  }

  // X (close) dos modais
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      if (modal) {
        modal.style.display = "none";
      }
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

  // --- FORMULÁRIOS E BOTÕES PRINCIPAIS ---

  // Adicionar novo serviço
  const addServiceForm = document.getElementById("addServiceForm");
  if (addServiceForm) {
    addServiceForm.addEventListener("submit", handleAddService);
  }

  // Editar serviço (modal salvar)
  const editServiceForm = document.getElementById("editServiceForm");
  if (editServiceForm) {
    editServiceForm.addEventListener("submit", handleEditService);
  }

  // Botão remover serviço dentro do modal
  const deleteServiceBtn = document.getElementById("deleteServiceBtn");
  if (deleteServiceBtn) {
    deleteServiceBtn.addEventListener("click", () => {
      handleDeleteService(); // vai ler o ID atual do modal
    });
  }

  // Salvar perfil
  const editProfileForm = document.getElementById("editProfileForm");
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", handleEditProfile);
  }

  // Preferências (SEC)
  const prefsForm = document.getElementById("prefsForm");
  if (prefsForm) {
    prefsForm.addEventListener("submit", handleSavePrefs);
  }

  // Exportar config
  const exportBtn = document.getElementById("exportConfigBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportConfig);
  }

  // Importar config
  const importBtn = document.getElementById("importConfigBtn");
  if (importBtn) {
    importBtn.addEventListener("click", triggerImport);
  }

  // Input de arquivo escondido (import)
  const importFileInput = document.getElementById("importFile");
  if (importFileInput) {
    importFileInput.addEventListener("change", handleImportFile);
  }

  // RESET TOTAL (a gente ainda vai colocar o botão no HTML depois)
  const resetBtn = document.getElementById("resetConfigBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const c = confirm(
        "Tem certeza que quer resetar tudo para os padrões ZAON?\nIsso apaga avatar personalizado, serviços adicionados, e preferências."
      );
      if (!c) return;
      resetToFactoryDefaults();
    });
  }

  console.log("[ZAON ADMIN] Painel carregado e pronto.");
});
