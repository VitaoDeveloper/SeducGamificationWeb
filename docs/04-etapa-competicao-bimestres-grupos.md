# Etapa 04 (GUI) — Competição, bimestres e grupos

**Pré-requisito:** Etapa 03 concluída (salas, lecionamento e alunos funcionando).
**Equivalente na API:** `plano-implementacao/04-etapa-competicao-bimestres-grupos.md`.
**Endpoints usados:** `POST /competicoes`, `GET /competicoes/:id`, `GET /lecionamentos/:id/competicoes`, `POST /competicoes/:id/grupos`, `POST /grupos/:id/membros`, remoção/troca de membro, `GET /competicoes/:id/grupos?bimestreId=`.

## Contexto para o agente

A competição nasce de um lecionamento (professor + sala). Um lecionamento pode ter mais de uma competição ao longo do ano. Toda competição tem exatamente 4 bimestres, com datas definidas na criação. Grupos são criados dentro da competição, e um aluno só entra em grupo se estiver matriculado na sala da competição; a composição do grupo é por bimestre (o aluno pode trocar de equipe entre bimestres, ou dentro do bimestre atual, enquanto ele estiver aberto).

## Tarefas

1. **Aba "Competições" na sala** (a partir do detalhe da sala, Etapa 03): lista as competições de cada lecionamento daquela sala (`GET /lecionamentos/:id/competicoes`), com um botão "Nova competição" por lecionamento em que o professor logado está inscrito.
2. **Criar competição** (`NovaCompeticaoForm.tsx`): nome da competição e as datas de início/fim dos 4 bimestres (um bloco de datas por bimestre, com validação no front de que estão em ordem crescente e não se sobrepõem). `POST /competicoes`.
3. **Detalhe da competição** (`CompeticaoDetailPage.tsx`, rota `/competicoes/:id`): dados gerais, os 4 bimestres com seu número, datas e situação (Aberto/Encerrado — badge visual), e a lista de grupos com seus integrantes no bimestre selecionado (seletor de bimestre no topo da página, reaproveitado pelas próximas etapas que também dependem de "qual bimestre estou vendo"). Esta página vai ganhar mais abas nas etapas seguintes (componentes de pontuação, lançamentos, rankings) — pensar a navegação (abas ou menu lateral) já prevendo isso.
4. **Criar grupo** (`NovoGrupoForm.tsx`): nome do grupo. `POST /competicoes/:id/grupos`.
5. **Gerenciar membros do grupo:** dentro do grupo, para o bimestre selecionado, uma lista de alunos da sala com um seletor de qual grupo cada um está (ou um componente de arrastar/soltar, à escolha do agente — uma lista com um `select` por aluno é suficiente para o alpha). Trocar o grupo de um aluno chama a rota de troca/remoção + adição. Bloquear a edição (desabilitar os controles, com uma mensagem) se o bimestre selecionado estiver `ENCERRADO`.

## Testes automatizados (Vitest)

- Função pura de validação das datas dos 4 bimestres (ordem crescente, sem sobreposição): testar isoladamente, com casos válidos e inválidos, antes mesmo de ligar ao formulário.
- `NovaCompeticaoForm`: testar que a validação acima bloqueia o envio quando as datas estão erradas, e que o envio funciona (via `msw`) quando estão corretas.
- Gerenciamento de membros do grupo: testar que a interface impede (ou trata o erro de) colocar o mesmo aluno em dois grupos no mesmo bimestre, e que os controles ficam desabilitados quando o bimestre está `ENCERRADO`.
- `CompeticaoDetailPage`: testar a troca de bimestre selecionado atualizando a lista de grupos exibida (mockando respostas diferentes por `bimestreId`).

## Critérios de aceite

- Criar uma competição a partir de um lecionamento gera os 4 bimestres corretamente, visíveis no detalhe.
- Criar 2 grupos e distribuir os alunos da sala entre eles funciona.
- Tentar colocar um aluno em dois grupos no mesmo bimestre é impedido pela própria interface (ou mostra o erro da API de forma clara, se a validação ficar só no backend).
- Trocar um aluno de grupo, no bimestre aberto, reflete imediatamente na tela.
- Com o bimestre selecionado marcado como encerrado (simulado via API/banco de teste), os controles de composição de grupo ficam desabilitados.
- `npm run test` passa, cobrindo os casos da seção de testes automatizados.

## Fora de escopo

Componentes de pontuação e lançamentos (Etapa 05), cálculo e exibição de sínteses (Etapa 06), encerramento em si (Etapa 07).
