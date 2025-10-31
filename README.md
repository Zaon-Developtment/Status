```plaintext
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
```
# 🛰️ ZAON Dashboard

**Painel de monitoramento de serviços em tempo real**, com visual moderno, mensagens em português e foco total na experiência do usuário.

Feito para quem quer controle, clareza e velocidade — sem complicação.

---

## ✨ Funcionalidades

- 🔄 Atualização automática a cada 60 segundos
- 🧠 Tradução inteligente de mensagens de status (inglês → português)
- 📊 Cards dinâmicos com ordenação por criticidade
- 🔔 Detecção de incidentes críticos com alerta visual
- 🧭 Link direto para página oficial de status
- 🧩 Suporte a múltiplos serviços com fallback visual
- 🧷 Sincronização entre abas via BroadcastChannel
- 🧑‍💼 Painel Admin para ativar/desativar serviços, salvar preferências, trocar nome e foto de perfil

---

## 🧱 Estrutura do projeto

```plaintext
📁 index.html           → Estrutura visual do painel principal
📁 dash.js         → Lógica de monitoramento, renderização e sincronização
📁 admin.html           → Painel de controle para ativar/desativar serviços
📁 admin.js             → Lógica do painel Admin e persistência via localStorage
📁 style.css            → Estilos visuais e responsividade
🧠 localStorage         → Armazena configurações e serviços ativos
📡 BroadcastChannel     → Sincroniza atualizações entre abas abertas