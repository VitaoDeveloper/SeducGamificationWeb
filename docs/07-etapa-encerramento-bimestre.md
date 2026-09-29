# Etapa 07 (GUI) — Encerramento de bimestre

**Pré-requisito:** Etapa 06 concluída (prévia de síntese disponível).
**Equivalente na API:** `plano-implementacao/07-etapa-encerramento-bimestre.md`.
**Endpoints usados:** `POST /bimestres/:id/encerrar`.

## Contexto para o agente

Encerrar um bimestre é uma ação **irreversível** na API (lançamentos, pesos e composição de grupo ficam congelados depois disso) — a interface precisa deixar isso muito claro antes de confirmar. A API pode recusar o encerramento se algum peso de matéria não somar 100%, e pode devolver, no sucesso, uma lista de empates detectados nas sínteses de grupo daquele bimestre.

## Tarefas

1. **Botão "Encerrar bimestre"**, visível no bimestre selecionado (página da competição, Etapa 04), habilitado só quando a situação é `ABERTO`.
2. **Modal de confirmação**, explicando em linguagem simples o que vai acontecer (lançamentos e composição de grupo desse bimestre não poderão mais ser alterados) e pedindo confirmação explícita antes de chamar a API.
3. **Chamada e tratamento da resposta:**
   - Erro (pesos não fecham 100% em alguma matéria): mostrar exatamente quais matérias estão pendentes, com um atalho para voltar à Etapa 05 e completar.
   - Sucesso: atualizar a situação do bimestre na tela (badge "Encerrado"), substituir o painel de "prévia" da Etapa 06 pelas sínteses **oficiais** agora retornadas/persistidas (usar os mesmos endpoints de ranking/relatório das próximas etapas para buscar esse dado definitivo, já que o encerramento em si só devolve confirmação + eventuais empates).
   - Se a resposta indicar empates: mostrar um alerta visível (ex.: banner no topo da página da competição) listando os grupos empatados, com um link direto para a tela de desempate (Etapa 09).
4. Se o bimestre encerrado for o **4º** da competição, destacar isso na tela (ex.: "Competição concluída — confira o ranking final"), com atalho para a Etapa 08.

## Testes automatizados (Vitest)

- Testar o modal de confirmação: só chama a API depois da confirmação explícita, nunca ao simplesmente abrir o modal.
- Testar, via `msw`, o tratamento da resposta de erro (pesos pendentes) — a lista de matérias pendentes exibida bate com o payload mockado.
- Testar o tratamento da resposta de sucesso com empates: o alerta aparece com os grupos corretos.
- Testar que, ao encerrar o 4º bimestre (mockado), a tela sinaliza a conclusão da competição.

## Critérios de aceite

- Encerrar um bimestre com todos os pesos corretos muda visivelmente a situação para "Encerrado" e desabilita as ações de edição das etapas 04-06 para aquele bimestre.
- Tentar encerrar com pesos pendentes mostra a lista de matérias faltantes, sem quebrar a tela.
- Um cenário de teste com empate no bimestre encerrado mostra o alerta corretamente.
- Encerrar o 4º bimestre sinaliza a conclusão da competição.
- `npm run test` passa, cobrindo os casos da seção de testes automatizados.

## Fora de escopo

Encerramento automático por data (não existe na API ainda), resolução do desempate em si (Etapa 09).
