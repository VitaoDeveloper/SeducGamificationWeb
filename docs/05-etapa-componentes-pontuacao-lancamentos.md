# Etapa 05 (GUI) — Componentes de pontuação e lançamentos

**Pré-requisito:** Etapa 04 concluída (competição, bimestres e grupos navegáveis).
**Equivalente na API:** `plano-implementacao/05-etapa-componentes-pontuacao-lancamentos.md`.
**Endpoints usados:** `POST /bimestres/:id/componentes-pontuacao`, `GET /bimestres/:id/componentes-pontuacao`, `POST /bimestres/:id/componentes-pontuacao/validar`, `POST /componentes-pontuacao/:id/lancamentos`, `GET /componentes-pontuacao/:id/lancamentos`, `POST /componentes-pontuacao/:id/lancamentos/lote`.

## Contexto para o agente

Os componentes de pontuação são definidos **por matéria e por bimestre**, com peso percentual — o professor precisa ver, para cada matéria do lecionamento, se os pesos já somam 100% ou não (a API expõe isso em `/validar`). O valor lançado depende do modelo de avaliação da escola (numérico 1-10, ou conceitual I/R/B/MB) — a API já valida isso no backend, mas a interface deve adaptar o campo de lançamento ao modelo (um número, ou um seletor com os rótulos), para reduzir erro na entrada.

## Tarefas

1. **Aba "Componentes de pontuação"** na página da competição (Etapa 04), para o bimestre selecionado: lista, agrupada por matéria (`ComponenteCurricular`), os componentes já criados com seus pesos, e um indicador visual por matéria ("100% ✓" ou "faltam X%"), usando `GET .../componentes-pontuacao` + `POST .../validar`.
2. **Criar componente de pontuação** (`NovoComponenteForm.tsx`): matéria (select, dentre as do lecionamento), nome (ex.: "Prova bimestral"), peso percentual. `POST /bimestres/:id/componentes-pontuacao`. Desabilitar esta ação se o bimestre estiver encerrado.
3. **Aba "Lançamentos"**, para um componente de pontuação selecionado: uma tabela com um aluno por linha (todos os matriculados na sala) e um campo de nota por linha, no formato certo conforme o modelo de avaliação da escola (input numérico com passo de 0.01 e limite 1-10; ou um select com os rótulos do modelo conceitual). Salvar em lote (`POST .../lancamentos/lote`) com um botão "Salvar lançamentos", e também permitir salvar linha a linha (`POST .../lancamentos`), à escolha do agente — o importante é não obrigar o professor a salvar aluno por aluno se ele for preencher a turma toda de uma vez.
4. Alunos sem nota lançada aparecem com o campo vazio, sem bloquear o salvamento dos demais (a API já trata ausência como 0 no cálculo).
5. Bloquear toda a tela de lançamentos (campos desabilitados, com uma mensagem) se o bimestre estiver `ENCERRADO`.

## Critérios de aceite

- Criar componentes cuja soma dê 100% numa matéria mostra o indicador de "fechado"; criar menos que isso mostra quanto falta.
- Lançar notas de vários alunos de uma vez, em lote, e salvar funciona.
- Lançar uma nota fora da escala do modelo (se o agente optar por também validar no front, além do backend) é barrado antes de enviar; de todo modo, um erro vindo da API é exibido de forma clara.
- Com o bimestre encerrado, a tela de componentes e lançamentos fica somente leitura.

## Fora de escopo

Cálculo e persistência de sínteses (isso é on-demand no backend — Etapa 07 da GUI cuida da visão de acompanhamento), predefinições de avaliação (fora do alpha também na API).
