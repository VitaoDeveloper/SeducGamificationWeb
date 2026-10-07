# Etapa 05 (GUI) — Editar e excluir grupo

**Pré-requisito:** Etapa 05 (API) implantada.
**Tela afetada:** aba "Grupos" da `CompeticaoDetailPage` (`src/features/competicoes/`).
**Endpoints novos:** `PATCH /grupos/:id`, `DELETE /grupos/:id`.

## Tarefas

1. Em cada grupo listado: ícone de editar (nome) e ícone de excluir.
2. O botão de excluir, ao receber 409 da API (grupo com membros), mostra a mensagem orientando a remover os membros primeiro — sem tentar automatizar essa remoção pelo front; é uma ação deliberada do professor.

## Testes (Vitest + Testing Library, `msw`)

- Renomear grupo: reflete na listagem.
- Excluir grupo vazio: some da listagem.
- Excluir grupo com membros (mockado 409): mensagem aparece, grupo continua.

## Critérios de aceite

- Os três fluxos funcionam contra a API real localmente.
- `npm run test` passa.

## Fora de escopo

Remoção em massa de membros a partir do botão de excluir grupo.
