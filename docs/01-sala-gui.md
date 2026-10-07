# Etapa 01 (GUI) — Editar e excluir sala

**Pré-requisito:** Etapa 01 (API) implantada.
**Tela afetada:** `SalaDetailPage` e `SalasListPage` (`src/features/salas/`).
**Endpoints novos:** `PATCH /salas/:id`, `DELETE /salas/:id`.

## Tarefas

1. `src/features/salas/salas.api.ts`: adicionar `atualizarSala(id, dto)` e `excluirSala(id)`.
2. Em `SalaDetailPage`, um botão "Editar" que abre o mesmo formulário de criação (`NovaSalaForm`), reaproveitado em modo edição (campos pré-preenchidos, `escolaId` não editável — a sala não troca de escola).
3. Um botão "Excluir sala", com confirmação (modal), chamando `excluirSala`. Em caso de erro 409 (sala com alunos ou lecionamentos), mostrar a mensagem exata que a API devolve, sem reinterpretar — é ela quem sabe qual dos dois bloqueios se aplica.
4. Após excluir com sucesso, voltar para `SalasListPage` e atualizar a lista.

## Testes (Vitest + Testing Library, mockando a API com `msw`)

- Editar sala: formulário pré-preenchido, envio funciona, tela reflete o novo nome.
- Excluir sala vazia: confirmação → sucesso → volta para a listagem sem a sala excluída.
- Excluir sala com dependentes: a mensagem de erro da API (mockada) aparece tal como veio, sem a tela quebrar.

## Critérios de aceite

- Os dois fluxos funcionam de ponta a ponta contra a API real localmente.
- `npm run test` passa.

## Fora de escopo

Qualquer fluxo de mover alunos entre salas.
