'''plaintext
███████╗ █████╗  ██████╗ ███╗   ██╗
╚══███╔╝██╔══██╗██╔═══██║████╗  ██║
  ███╔╝ ███████║██║   ██║██╔██╗ ██║
 ███╔╝  ██╔══██║██║   ██║██║╚██╗██║
███████╗██║  ██║╚██████╔╝██║ ╚████║
╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
██████╗  █████╗ ███████╗██╗  ██╗
██╔══██╗██╔══██╗██╔════╝██║  ██║
██║  ██║███████║███████╗███████║
██║  ██╝██╔══██║╚════██║██╔══██║
██████╝ ██║  ██║███████║██║  ██║
╚════╝  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝

# 🛰️ ZAON Dashboard

**Painel de monitoramento de serviços em tempo real**, com visual moderno, mensagens em português e foco total na experiência do usuário.

---

## ✨ Funcionalidades

- 🔄 Atualização automática a cada 60 segundos
- 🧠 Tradução inteligente de mensagens de status
- 📊 Cards dinâmicos com ordenação por criticidade
- 🔔 Detecção de incidentes críticos com alerta visual
- 🧭 Link direto para página oficial de status
- 🧩 Suporte a múltiplos serviços com fallback visual
- 🧷 Sincronização entre abas via BroadcastChannel

---

## 🧱 Estrutura

```plaintext
📁 index.html        → Estrutura visual do painel
📁 dashboard.js      → Lógica principal e renderização
📁 style.css         → Estilos visuais e responsividade
🧠 localStorage      → Armazena configurações e serviços ativos
📡 BroadcastChannel  → Sincroniza atualizações entre abas
