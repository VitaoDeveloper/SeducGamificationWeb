# Etapa 07 (GUI) — Excluir um lançamento específico

**Pré-requisito:** Etapa 07 (API) implantada.
**Tela afetada:** tabela de lançamentos (`src/features/competicoes/`, aba "Lançamentos").
**Endpoint novo:** `DELETE /componentes-pontuacao/:id/lancamentos/:alunoId`.

## Tarefas

1. Em cada linha da tabela de lançamentos com nota já salva, um ícone pequeno de "limpar" ao lado do campo, distinto visualmente do botão "Salvar" — para deixar claro que é uma ação diferente (apagar, não só limpar o campo de texto sem salvar).
2. Confirmação antes de excluir (pode ser leve, tipo um `Popconfirm`/tooltip de confirmação, já que é uma ação reversível na prática — o professor pode relançar a nota).
3. Depois de excluir, o campo volta ao estado vazio e a coluna "Prévia" (Etapa 06 do plano original) recalcula sem a nota desse aluno.

## Testes (Vitest + Testing Library, `msw`)

- Excluir um lançamento: campo volta a vazio, prévia recalcula.
- Excluir num bimestre encerrado: ação não disponível (campos já somente leitura, conforme a regra já existente).

## Critérios de aceite

- O fluxo funciona contra a API real localmente.
- `npm run test` passa.

## Fora de escopo

Desfazer (undo) de uma exclusão — o professor relança a nota manualmente se precisar.
