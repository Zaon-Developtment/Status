/**
 * admin.js - Lógica Principal do Painel de Administração ZAON
 * Gerencia o objeto zaonConfig no localStorage (CRUD de Serviços, Perfil e Preferências).
 */

 const LOCAL_STORAGE_KEY = 'zaonConfig';

 // Estrutura de configuração padrão
 const defaultConfig = {
     profile: {
         name: 'ZAON',
         avatar: 'https://zaon-developtment.github.io/Status/files/zaon_logo.jpeg' // Logo padrão
     },
     prefs: {
         theme: 'dark', 
         updateInterval: 60, 
         filterLatam: false,
     },
     services: [
         // Serviços padrão para começar
         { id: 'aws', name: 'AWS Status', url: 'https://status.aws.amazon.com/', api: 'https://status.aws.amazon.com/summary.json', active: true },
         { id: 'gcp', name: 'Google Cloud Status', url: 'https://status.cloud.google.com/', api: 'https://status.cloud.google.com/summary.json', active: true },
         { id: 'google_workspace', name: 'Google Workspace', url: 'https://www.google.com/appsstatus/dashboard/', api: null, type: 'google', active: true },
     ]
 };
 
 let zaonConfig = {};
 let currentServiceId = null; // Usado para rastrear o serviço que está sendo editado
 
 // --- UTILS ---
 
 /**
  * Função para mostrar notificações Toast. Reutilizada do Dashboard.
  * @param {string} message - A mensagem a ser exibida.
  * @param {string} type - 'success', 'error', 'info' para cores de fundo.
  */
 function showToast(message, type = 'info') {
     const toast = document.getElementById('toast');
     toast.textContent = message;
     toast.className = `toast toast-${type}`;
     toast.style.display = 'block';
     
     setTimeout(() => {
         toast.style.display = 'none';
     }, 3000);
 }
 
 // --- PERSISTÊNCIA (LOAD/SAVE) ---
 
 /**
  * Carrega a configuração do localStorage ou usa a padrão.
  */
 function loadConfig() {
     const storedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
     if (storedConfig) {
         try {
             zaonConfig = JSON.parse(storedConfig);
             // Mescla com o padrão para garantir que novas chaves existam
             zaonConfig = { ...defaultConfig, ...zaonConfig };
             zaonConfig.prefs = { ...defaultConfig.prefs, ...zaonConfig.prefs };
             zaonConfig.profile = { ...defaultConfig.profile, ...zaonConfig.profile };
         } catch (e) {
             console.error("Erro ao carregar zaonConfig, usando padrão.", e);
             zaonConfig = defaultConfig;
         }
     } else {
         zaonConfig = defaultConfig;
     }
     // Salva de volta para garantir que a estrutura padrão seja persistida
     saveConfig();
 }
 
 /**
  * Salva a configuração atual no localStorage.
  */
 function saveConfig() {
     try {
         localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(zaonConfig));
         renderUI(); // Renderiza a interface após salvar
     } catch (e) {
         console.error("Erro ao salvar zaonConfig no localStorage.", e);
         showToast("Erro ao salvar configurações no seu navegador.", 'error');
     }
 }
 
 // --- RENDERIZAÇÃO DA INTERFACE ---
 
 /**
  * Renderiza o cabeçalho, perfil e preferências.
  */
 function renderHeaderAndProfile() {
     // 1. Cabeçalho e Perfil
     const profile = zaonConfig.profile;
     
     // Altera a URL da imagem no HEADER do Admin
     document.getElementById('adminLogo').src = profile.avatar;
     // Altera o texto do TÍTULO no HEADER do Admin
     document.getElementById('adminTitle').innerHTML = `<b>${profile.name}</b>`;
     
     // Altera a URL da imagem na SEÇÃO PERFIL (avatar grande)
     document.getElementById('profileAvatar').src = profile.avatar;
     // Altera o texto do NOME na SEÇÃO PERFIL
     document.getElementById('profileName').textContent = profile.name;
 
     // 2. Preferências
     const prefs = zaonConfig.prefs;
     document.getElementById('updateInterval').value = prefs.updateInterval;
     document.getElementById('filterLatam').checked = prefs.filterLatam;
     const themeToggle = document.getElementById('themeToggle');
     const themeText = document.getElementById('themeText');
     
     if (prefs.theme === 'dark') {
         themeToggle.checked = false; // DARK = OFF
         document.body.classList.remove('light');
         themeText.textContent = 'Escuro';
     } else {
         themeToggle.checked = true; // LIGHT = ON
         document.body.classList.add('light');
         themeText.textContent = 'Claro';
     }
 
     // Atualiza o toggle de texto imediatamente
     themeToggle.onchange = () => {
         if (themeToggle.checked) {
             themeText.textContent = 'Claro';
         } else {
             themeText.textContent = 'Escuro';
         }
     };
 }
 
 
 /**
  * Renderiza o grid de serviços monitorados na coluna central.
  */
 function renderServicesGrid() {
     const grid = document.getElementById('servicesGrid');
     const services = zaonConfig.services;
     grid.innerHTML = '';
     
     document.getElementById('serviceCount').textContent = services.length;
     document.getElementById('emptyServiceList').style.display = services.length === 0 ? 'block' : 'none';
 
     services.forEach(service => {
         const card = document.createElement('div');
         card.className = 'card service-admin-card';
         card.setAttribute('data-id', service.id);
 
         // Ícone: tenta usar favicon, senão usa um placeholder
         // NOTA: Para CORS, no ambiente de produção, este favicon.ico pode precisar de um proxy
         const iconUrl = service.api || service.url ? `${new URL(service.url).origin}/favicon.ico` : './files/zaon_logo.jpeg';
         
         card.innerHTML = `
             <div class="service-header">
                 <img src="${iconUrl}" alt="Ícone">
                 <strong>${service.name}</strong>
             </div>
             <span class="service-url">${service.url}</span>
             <div class="service-controls">
                 <label class="toggle-switch">
                     <input type="checkbox" data-id="${service.id}" class="service-toggle" ${service.active ? 'checked' : ''}>
                     <span class="slider"></span>
                 </label>
                 <button class="btn btn-edit-service" data-id="${service.id}">Editar</button>
             </div>
         `;
         grid.appendChild(card);
     });
 
     // Adiciona event listeners para os botões de edição e toggles
     document.querySelectorAll('.btn-edit-service').forEach(btn => {
         btn.addEventListener('click', (e) => openServiceEditModal(e.target.dataset.id));
     });
     document.querySelectorAll('.service-toggle').forEach(toggle => {
         toggle.addEventListener('change', (e) => toggleService(e.target.dataset.id, e.target.checked));
     });
 }
 
 /**
  * Função principal que chama todas as renderizações.
  */
 function renderUI() {
     renderHeaderAndProfile();
     renderServicesGrid();
     // A UI do modal de perfil é preenchida ao ser aberta
 }
 
 // --- GESTÃO DE SERVIÇOS (CRUD) ---
 
 /**
  * Handler para adicionar um novo serviço.
  */
 function handleAddService(e) {
     e.preventDefault();
     
     const name = document.getElementById('serviceName').value.trim();
     const url = document.getElementById('serviceUrl').value.trim();
     const api = document.getElementById('serviceApi').value.trim();
 
     if (!name || !url || !api) {
         showToast('Preencha todos os campos para adicionar o serviço.', 'error');
         return;
     }
 
     const newService = {
         id: 's' + Date.now(), // ID simples baseado em timestamp
         name: name,
         url: url,
         api: api,
         active: true,
         type: url.includes('status.cloud.google.com') || name.toLowerCase().includes('google workspace') ? 'google' : 'statuspage'
     };
 
     zaonConfig.services.push(newService);
     saveConfig();
 
     document.getElementById('addServiceForm').reset();
     showToast(`Serviço "${name}" adicionado com sucesso!`, 'success');
 }
 
 /**
  * Abre o modal de edição de serviço.
  */
 function openServiceEditModal(id) {
     currentServiceId = id;
     const service = zaonConfig.services.find(s => s.id === id);
 
     if (!service) return showToast('Serviço não encontrado.', 'error');
 
     document.getElementById('editServiceId').value = service.id;
     document.getElementById('editServiceName').value = service.name;
     document.getElementById('editServiceUrl').value = service.url;
     document.getElementById('editServiceApi').value = service.api;
     
     document.getElementById('serviceEditModal').style.display = 'block';
 }
 
 /**
  * Handler para salvar a edição de um serviço.
  */
 function handleEditService(e) {
     e.preventDefault();
     const id = document.getElementById('editServiceId').value;
     const serviceIndex = zaonConfig.services.findIndex(s => s.id === id);
 
     if (serviceIndex === -1) return showToast('Erro ao encontrar serviço para edição.', 'error');
 
     zaonConfig.services[serviceIndex].name = document.getElementById('editServiceName').value.trim();
     zaonConfig.services[serviceIndex].url = document.getElementById('editServiceUrl').value.trim();
     zaonConfig.services[serviceIndex].api = document.getElementById('editServiceApi').value.trim();
     
     // Fecha modal
     document.getElementById('serviceEditModal').style.display = 'none';
     
     saveConfig();
     showToast('Serviço atualizado com sucesso!', 'success');
 }
 
 /**
  * Handler para excluir um serviço.
  */
 function handleDeleteService() {
     const serviceId = document.getElementById('editServiceId').value;
     const serviceName = zaonConfig.services.find(s => s.id === serviceId)?.name || 'Este serviço';
 
     if (!confirm(`Tem certeza que deseja remover o serviço: ${serviceName}?`)) {
         return;
     }
 
     zaonConfig.services = zaonConfig.services.filter(s => s.id !== serviceId);
     
     // Fecha modal
     document.getElementById('serviceEditModal').style.display = 'none';
     
     saveConfig();
     showToast(`Serviço "${serviceName}" removido.`, 'info');
 }
 
 /**
  * Handler para o toggle de ativação/desativação do serviço.
  */
 function toggleService(id, isActive) {
     const service = zaonConfig.services.find(s => s.id === id);
     if (service) {
         service.active = isActive;
         saveConfig();
         showToast(`Serviço "${service.name}" ${isActive ? 'ativado' : 'desativado'} no Dashboard.`, 'info');
     }
 }
 
 // --- GESTÃO DE PERFIL ---
 
 /**
  * Handler para salvar as alterações do Perfil.
  */
 function handleEditProfile(e) {
     e.preventDefault();
     const newName = document.getElementById('newProfileName').value.trim();
     const newAvatarFile = document.getElementById('newProfileAvatar').files[0];
     
     let needsSave = false;
 
     // 1. Atualiza o nome
     if (newName && newName !== zaonConfig.profile.name) {
         zaonConfig.profile.name = newName;
         needsSave = true;
     }
     
     // 2. Atualiza o Avatar (lógica de leitura de arquivo)
     if (newAvatarFile) {
         const reader = new FileReader();
         reader.onload = function(event) {
             zaonConfig.profile.avatar = event.target.result; // Salva como Data URL (Base64)
             saveConfig(); // Salva e renderiza após a leitura do arquivo
             document.getElementById('profileModal').style.display = 'none';
             showToast('Perfil e avatar atualizados! O Dashboard usará a nova imagem.', 'success');
         };
         reader.onerror = function() {
             showToast('Erro ao ler arquivo de imagem.', 'error');
         };
         reader.readAsDataURL(newAvatarFile);
         
     } else {
         // Se NÃO HOUVE UPLOAD de arquivo, mas o nome mudou, salvamos imediatamente.
         if (needsSave) {
             saveConfig();
             showToast('Nome do painel atualizado!', 'success');
         } else {
             showToast('Nenhuma alteração de nome ou foto foi feita.', 'info');
         }
         document.getElementById('profileModal').style.display = 'none';
     }
 }
 
 // --- GESTÃO DE PREFERÊNCIAS ---
 // ... (O restante do código é mantido inalterado) ...
  
 // --- INICIALIZAÇÃO ---
  
  document.addEventListener('DOMContentLoaded', () => {
      loadConfig();
      renderUI(); // Renderiza a UI inicial após carregar a config
  
      // Ativação dos Modals
      const profileModal = document.getElementById('profileModal');
      const serviceEditModal = document.getElementById('serviceEditModal');
      
      document.getElementById('editProfileBtn').addEventListener('click', () => {
          document.getElementById('newProfileName').value = zaonConfig.profile.name; // Preenche campo
          // Limpar o campo de arquivo para não tentar re-uploadar o mesmo arquivo vazio
          document.getElementById('newProfileAvatar').value = '';
          profileModal.style.display = 'block';
      });
      
      document.querySelectorAll('.close-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              e.target.closest('.modal').style.display = 'none';
          });
      });
  
      window.onclick = function(event) {
          if (event.target == profileModal) {
              profileModal.style.display = "none";
          }
          if (event.target == serviceEditModal) {
              serviceEditModal.style.display = "none";
          }
      }
  
      // Handlers de Formulário
      document.getElementById('addServiceForm').addEventListener('submit', handleAddService);
      document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
      document.getElementById('prefsForm').addEventListener('submit', handleSavePrefs);
      document.getElementById('editServiceForm').addEventListener('submit', handleEditService);
      document.getElementById('deleteServiceBtn').addEventListener('click', handleDeleteService);
      
      // Handlers de Backup
      document.getElementById('exportConfigBtn').addEventListener('click', exportConfig);
      document.getElementById('importConfigBtn').addEventListener('click', triggerImport);
      document.getElementById('importFile').addEventListener('change', handleImportFile);
  
  });
  