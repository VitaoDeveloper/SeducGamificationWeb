# Etapa 08 (GUI) — Rankings (parcial, anual e individual)

**Pré-requisito:** Etapa 07 concluída (pelo menos um bimestre encerrado, para ter dado real).
**Equivalente na API:** `plano-implementacao/08-etapa-rankings.md`.
**Endpoints usados:** `GET /competicoes/:id/ranking?bimestreId=...` (parcial), `GET /competicoes/:id/ranking` (anual), `GET /competicoes/:id/ranking-individual`.

## Contexto para o agente

Esta é a primeira etapa em que o **aluno** também usa uma tela de verdade (até aqui, ele só tinha a página "em construção" da Etapa 02). O aluno só pode ver os rankings das competições da(s) sua(s) própria(s) sala(s) — a API deve garantir isso pelo token, mas a interface do aluno nem deve oferecer navegação para outras competições, para manter a experiência simples.

## Tarefas

1. **Aba "Ranking" na página da competição** (visão do professor, Etapa 04): três sub-visões — parcial (com seletor de bimestre), anual e individual. Tabela ordenada, com posição, nome (grupo ou aluno) e valor. Grupos/alunos empatados (campo `empate: true` da API) recebem um destaque visual (ex.: mesma posição numérica, ícone de empate).
2. **Área do aluno** (`src/features/aluno/`, substituindo a rota provisória `/em-breve` da Etapa 02):
   - `AlunoDashboardPage.tsx` (rota principal do aluno após login): mostra a(s) competição(ões) da sala dele, com um resumo do ranking do seu grupo (posição atual, no anual e no parcial do bimestre em aberto/mais recente).
   - Reaproveitar os mesmos componentes de tabela de ranking do item 1, num layout mais simples (o aluno não precisa dos controles de gestão, só de visualização).
3. Indicar claramente, nos rankings anual e individual, quando o resultado é **parcial** (nem todos os 4 bimestres encerrados) — usar o campo `bimestresEncerrados` da resposta da API.

## Critérios de aceite

- Professor vê os três rankings de uma competição com pelo menos 2 bimestres encerrados, e o anual/individual indicam claramente que o resultado ainda é parcial.
- Um cenário com grupos empatados mostra o destaque de empate nos três rankings.
- Aluno logado, ao entrar, vê o ranking do próprio grupo sem precisar navegar manualmente até a competição.
- Aluno não consegue (nem visualmente, nem por URL direta, na medida do que o front controla) acessar rankings de outra sala/competição — o mínimo aqui é a API bloquear isso (403) e a interface tratar esse erro sem quebrar.

## Fora de escopo

Resolução de empate (Etapa 09), relatórios individuais/comparativos detalhados (Etapa 10).
