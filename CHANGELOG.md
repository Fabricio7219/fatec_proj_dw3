# Changelog

## v1.1.0 — 2025-11-03

Principais mudanças:

- Autenticação e papéis
  - Prioridade do papel admin garantida no login Google (nunca rebaixar para docente/aluno).
  - Respeita ADMIN_AUTO_ADMINS e (opcional) ADMIN_AUTO_DOMAIN para promover admin automaticamente.
  - Aluno novo redireciona para completar-perfil até criar Participante/RA.
  - /api/auth/me ajustado para refletir cadastroCompleto corretamente e priorizar admin.

- Palestras e QR
  - Suporte a tipo de palestra (palestra/exposição) com pontos padrão (0.15/0.20).
  - Geração e impressão de QR com mensagem de boas-vindas e palestrante.

- Presença e Pontos
  - Presença (saída) concede pontos da palestra ao atingir limiar e registra histórico (Pontuacao).
  - Envio de certificado por email ao atingir tempo mínimo (configurável).
  - Novo endpoint para creditar voluntariado (admin/docente), com logging em Pontuacao.

- Painel do Administrador
  - CRUD de palestras com pontos e tipo.
  - Gerenciamento de docentes (adicionar/remover) e crédito de voluntariado por RA.
  - Listagem de inscrições e detalhe de presenças por palestra.

- Utilitários e infra
  - Novo passaporte Google centralizado (src/config/passportGoogle.js).
  - Scripts de manutenção (drop de índice RA, criação de admin, conversões, geração de PDF).
  - .env.example atualizado.

Notas:
- Recomenda-se configurar ADMIN_AUTO_ADMINS no .env para garantir acesso ao painel admin após limpeza do banco.
- O fluxo com returnTo (QR) faz upsert mínimo em Usuario para robustez.
