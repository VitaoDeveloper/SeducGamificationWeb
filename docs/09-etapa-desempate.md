# Etapa 09 (GUI) — Desempate

**Pré-requisito:** Etapa 08 concluída (rankings exibindo empates).
**Equivalente na API:** `plano-implementacao/09-etapa-desempate.md`.
**Endpoints usados:** `POST /competicoes/:id/desempate`, `GET /competicoes/:id/desempate/pendencias`, `POST /competicoes/:id/desempate/aplicar-automatico?bimestreId=...`.

## Contexto para o agente

Esta tela é só do **professor**. Regra de negócio: em caso de empate, o professor pode desempatar manualmente até o fechamento do bimestre; sem isso, vence o critério automático (média dos integrantes nos componentes de maior peso). No alpha da API, o critério automático não é aplicado sozinho por um job — existe um endpoint que o simula, disparado manualmente. A interface deve deixar claro que essa ação também é, na prática, "forçar o critério automático agora".

## Tarefas

1. **Alerta persistente de pendência:** enquanto houver empates não resolvidos numa competição (`GET .../desempate/pendencias`), mostrar um banner na página da competição (reaproveitando o alerta já introduzido na Etapa 07), com um botão "Resolver desempate".
2. **Tela/modal de desempate manual** (`DesempateForm.tsx`): lista os grupos empatados (do bimestre ou do ranking anual, conforme a pendência) e permite ao professor arrastar/reordenar ou escolher a posição de cada um (um `select` de posição por grupo é suficiente). `POST /competicoes/:id/desempate` com a ordem escolhida.
3. **Ação "Aplicar critério automático agora"**: botão secundário na mesma tela, com um texto explicando a regra (compara a média dos integrantes nos componentes de maior peso) e um aviso de que, no sistema real, isso só aconteceria automaticamente no prazo — aqui é uma ação manual de simulação/força. Confirmação antes de disparar (`POST .../aplicar-automatico`).
4. Depois de resolvido (manual ou automático), atualizar o ranking (Etapa 08) para refletir a ordem definida, e remover o alerta de pendência.

## Testes automatizados (Vitest)

- `DesempateForm`: testar que o envio da ordem manual monta o payload esperado pela API (mockada) e que, após o sucesso, o alerta de pendência é removido.
- Testar o botão "Aplicar critério automático agora": exige confirmação antes de chamar a API, e trata sucesso/erro corretamente.
- Testar que o banner de pendência só aparece quando `GET .../desempate/pendencias` (mockado) retorna algo, e some quando a lista fica vazia.

## Critérios de aceite

- Um cenário com 2 grupos empatados no ranking parcial: resolver manualmente pela tela funciona, e o ranking passa a refletir a nova ordem.
- O mesmo cenário, usando "aplicar critério automático agora", também funciona e o ranking reflete o resultado.
- O alerta de pendência desaparece depois que o desempate é resolvido.
- A tela deixa claro, em texto, a diferença entre as duas ações (manual vs. automático) antes do professor decidir.
- `npm run test` passa, cobrindo os casos da seção de testes automatizados.

## Fora de escopo

Job agendado que aplica o critério automático sozinho (não existe na API ainda), notificação fora da própria aplicação (e-mail, push).
