# Etapa 03 (GUI) — Editar e excluir aluno

**Pré-requisito:** Etapa 03 (API) implantada.
**Tela afetada:** `AlunosListPage` (dentro de `SalaDetailPage`, `src/features/salas/`).
**Endpoints novos:** `PATCH /alunos/:id`, `DELETE /alunos/:id`.

## Tarefas

1. Em cada linha da listagem de alunos: ícone de editar (modal simples só com o nome, código de matrícula fica visível mas não editável) e ícone de excluir (confirmação).
2. Tratar o 409 de exclusão (aluno com histórico) mostrando a mensagem da API, deixando claro que o aluno já participou de alguma competição e por isso não pode ser removido por aqui.

## Testes (Vitest + Testing Library, `msw`)

- Editar nome: reflete na listagem.
- Excluir aluno sem histórico: some da listagem.
- Excluir aluno com histórico (mockado 409): mensagem aparece, aluno continua listado.

## Critérios de aceite

- Os três fluxos funcionam contra a API real localmente.
- `npm run test` passa.

## Fora de escopo

Transferência entre salas (mesmo limite da Etapa 03 da API).
