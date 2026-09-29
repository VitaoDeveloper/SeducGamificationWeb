# Etapa 10 (GUI) — Relatórios (tela)

**Pré-requisito:** Etapa 09 concluída.
**Equivalente na API:** `plano-implementacao/10-etapa-relatorios-json.md`.
**Endpoints usados:** `GET /alunos/:id/relatorio-individual`, `GET /alunos/:id/relatorio-comparativo-grupo`, `GET /grupos/:id/relatorio`, `GET /grupos/:id/relatorio-comparativo`.

## Contexto para o agente

São quatro relatórios, com escopo diferente por perfil: o **aluno** só acessa o seu próprio individual e os do seu grupo; o **professor** acessa qualquer um dentro das competições que criou. As comparações anuais são feitas bimestre a bimestre (mesma escala, 0 a 10) — a pontuação final do grupo (soma, até 40) deve aparecer **separada**, nunca somada visualmente com valores em escala 0-10, para não confundir quem está lendo.

## Tarefas

1. **Relatório individual do aluno** (`RelatorioIndividualPage.tsx`): síntese por bimestre (gráfico de linha ou barras simples, 4 pontos) e por matéria em cada bimestre (tabela), pontuação final (média) em destaque.
2. **Relatório individual comparado ao grupo** (`RelatorioComparativoAlunoPage.tsx`): o gráfico acima, com uma linha/série por integrante do grupo (do bimestre correspondente — lembrar que o grupo pode mudar entre bimestres), permitindo comparar visualmente.
3. **Relatório coletivo do grupo** (`RelatorioGrupoPage.tsx`): síntese do grupo por bimestre (gráfico), pontuação final (soma) em destaque, e uma tabela com os integrantes de cada bimestre e suas sínteses individuais.
4. **Relatório coletivo comparado a outros grupos** (`RelatorioComparativoGrupoPage.tsx`): o gráfico do item 3, com uma série por grupo da competição.
5. **Navegação:** a partir da página da competição (professor) e do dashboard do aluno (Etapa 08), links claros para os relatórios pertinentes. O professor, ao ver um grupo ou aluno específico (ex.: na tela de composição de grupos da Etapa 04), deve ter um atalho direto para o relatório daquela pessoa/grupo.
6. **Tratamento de erro de acesso (403):** se o back recusar (aluno tentando ver relatório de outro grupo, por exemplo), mostrar uma mensagem clara de acesso não permitido, sem expor detalhes técnicos.
7. Para gráficos, usar uma lib leve já comum no ecossistema React (ex.: `recharts`), documentando a escolha — não é necessário nada mais sofisticado que linhas/barras simples neste alpha.

## Testes automatizados (Vitest)

- Testar, para cada um dos quatro relatórios, a renderização com dados mockados (`msw`), incluindo o caso de erro 403 (mensagem amigável, sem detalhe técnico).
- Testar a função/formatador que mantém separadas a escala bimestral (0-10) e a pontuação final do grupo (soma, até 40) — garantir que nenhum lugar do código soma ou mistura as duas por engano.
- Testar a navegação a partir da página da competição e do dashboard do aluno até os relatórios corretos (ex.: o link do aluno sempre aponta para o próprio relatório, nunca para o de outro).

## Critérios de aceite

- Professor acessa os quatro relatórios de um grupo/aluno de uma competição sua.
- Aluno acessa o próprio relatório individual e os do seu grupo, e recebe uma mensagem clara (não um erro técnico) ao tentar acessar o de outro grupo.
- As comparações anuais mostram os valores bimestre a bimestre (0-10) e a pontuação final do grupo (até 40) em blocos visualmente separados.
- Os gráficos renderizam corretamente com uma competição de teste com pelo menos 2 bimestres encerrados.
- `npm run test` passa, cobrindo os casos da seção de testes automatizados.

## Fora de escopo

Exportação em PDF (Etapa 11) — aqui os relatórios só existem como tela.
