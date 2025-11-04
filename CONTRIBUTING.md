# Guia de Contribuição

Obrigado por contribuir com o projeto FatecWeek! Este guia explica como preparar seu ambiente, padrões de contribuição e como enviar suas mudanças.

## Preparando o ambiente

1. Fork e clone seu repositório
2. Instale dependências: `npm install`
3. Crie um `.env` a partir de `.env.example` e ajuste as variáveis necessárias
4. Rode o servidor: `npm run dev`

## Fluxo de trabalho

- Crie uma branch para cada mudança

```bash
git checkout -b feat/sua-melhoria
```

- Faça commits pequenos e descritivos; preferimos Conventional Commits

Exemplos:

- `feat(auth): prioriza admin no fluxo de login`
- `fix(presenca): corrige cálculo de tempo de permanência`
- `chore(ci): adiciona pipeline de lint`
- `docs(readme): atualiza instruções de setup`

- Abra um Pull Request (PR) explicando o que mudou e como testar

## Padrões de código

- Node 18+, padrão CommonJS (require/module.exports)
- Evite duplicação de código; extraia utilitários para `src/utils`
- Não exponha segredos (.env, chaves) no repositório ou commits

## Testes manuais mínimos

Antes de abrir o PR, valide:

- Login com Google (admin/docente/aluno)
- Painel admin abre e carrega palestras, docentes e inscrições
- Criar/editar palestra e gerar/imprimir QR
- Fluxo de presença: entrada/saída, créditos de pontos e (se aplicável) certificado
- Inscrição e cancelamento

## Documentação

- Adicione/atualize `.env.example` quando novas variáveis forem necessárias
- Atualize `README.md` e `DEPLOY.md` com qualquer mudança relevante de setup ou operação
- Adicione notas no `CHANGELOG.md` (se a mudança for significativa)

## Revisão e merge

- O PR será revisado, e podem ser solicitadas alterações
- Mantenha a branch atualizada (rebase) até a aprovação
- Após aprovado, será feito o merge na `main` e incluído no próximo release

Obrigado por colaborar! 😊
