# Etapa 03 (GUI) — Salas, lecionamento e alunos

**Pré-requisito:** Etapa 02 concluída (login, sessão e rotas protegidas funcionando).
**Equivalente na API:** `plano-implementacao/03-etapa-salas-alunos-lecionamento.md`.
**Endpoints usados:** `GET /salas`, `POST /salas`, `POST /salas/:salaId/inscricao`, `GET /salas/:salaId/lecionamentos`, `GET /salas/:salaId/alunos`, `POST /salas/:salaId/alunos`.

## Contexto para o agente

Esta é a tela inicial do professor depois do login (`/salas`). Salas são **compartilhadas** entre os professores da mesma escola — a lista não é "minhas salas", é "salas da(s) escola(s) em que atuo", com indicação de onde o professor já está inscrito (lecionamento) e onde ainda não. Um professor pode atuar em mais de uma escola: se `GET /salas` trouxer escolas diferentes, agrupar visualmente por escola.

Cadastrar um aluno cria a pessoa e a matrícula na sala ao mesmo tempo. A senha inicial do aluno é o próprio código de matrícula gerado (`26XXX`) — a tela precisa deixar isso bem visível na hora do cadastro, para o professor repassar ao aluno.

## Tarefas

1. **Listagem de salas** (`src/features/salas/SalasListPage.tsx`, rota `/salas`): busca `GET /salas`, agrupada por escola, com indicador "Você leciona aqui" / "Disponível para inscrição". Ação principal no `PageHeader`: "Nova sala".
2. **Criar sala** (`NovaSalaForm.tsx`): escola (select, se houver mais de uma vinculada), nome, ano letivo. `POST /salas`.
3. **Inscrever-se numa sala** (`InscricaoForm.tsx`): campo de componentes curriculares (tags, pelo menos um obrigatório). `POST /salas/:salaId/inscricao`.
4. **Detalhe da sala** (`SalaDetailPage.tsx`, rota `/salas/:id`): dados da sala + lista de lecionamentos (`GET /salas/:salaId/lecionamentos`, professores e componentes de cada um). Abas ou links para "Alunos" (item 5) e, a partir da Etapa 04, "Competições".
5. **Listagem de alunos da sala** (`AlunosListPage.tsx`, rota `/salas/:id/alunos`): busca `GET /salas/:salaId/alunos`. Ação principal: "Novo aluno".
6. **Cadastrar aluno** (`NovoAlunoForm.tsx`): campo nome. `POST /salas/:salaId/alunos`. Ao ter sucesso, mostrar modal de confirmação com nome, código de matrícula e a informação de que a senha inicial é esse mesmo código, com botão de copiar.

## Testes automatizados (Vitest)

- `NovaSalaForm` e `InscricaoForm`: testar validação local (campos obrigatórios, pelo menos um componente curricular) e o envio via `msw` (sucesso e erro, ex.: 403).
- `NovoAlunoForm`: testar que, após sucesso, o modal de confirmação exibe o `codigoMatricula` retornado pela API mockada.
- `SalasListPage`: testar o agrupamento por escola e a marcação "leciona aqui" vs. "disponível para inscrição", a partir de uma resposta mockada de `GET /salas` com mais de uma escola.
- Estados de carregamento e lista vazia das páginas de listagem (salas e alunos).

## Critérios de aceite

- Professor cria uma sala e ela aparece imediatamente marcada como "leciona aqui".
- Um segundo professor da mesma escola vê a sala e consegue se inscrever com 2 componentes curriculares.
- Tentar se inscrever de novo numa sala já inscrita mostra o erro da API de forma legível.
- Cadastrar um aluno mostra o código de matrícula com destaque e ele aparece na listagem da sala.
- Cadastrar vários alunos em sequência funciona sem recarregar a página.
- `npm run test` passa, cobrindo os casos da seção de testes automatizados.

## Fora de escopo

Edição/remoção de sala e aluno, transferência de aluno entre salas, competição (Etapa 04).
