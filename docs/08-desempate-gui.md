# Etapa 08 (GUI) — Revogar uma decisão de desempate

**Pré-requisito:** Etapa 08 (API) implantada.
**Tela afetada:** `src/features/competicoes/DesempateForm.tsx`, `AlertaDeDesempate.tsx`, `desempate.api.ts`, `desempate.hooks.ts`.
**Endpoint novo:** `DELETE /competicoes/:id/desempate` (query `bimestreId` opcional).

## Contexto

`resolverDesempate` (POST) já funciona como "editar": registrar uma nova ordem substitui a anterior do mesmo escopo — isso **já está implementado**, não precisa mexer. O que falta é uma ação de "limpar"/revogar, para o professor que quer voltar ao estado pendente (por exemplo, para trocar de manual para automático, ou só desfazer uma decisão).

## Tarefas

1. Em `desempate.api.ts`, adicionar `revogarDesempate(competicaoId, bimestreId?)`, chamando `DELETE /competicoes/:id/desempate` com o mesmo padrão de `aplicarCriterioAutomatico` para o parâmetro `bimestreId` (presente só quando definido).
2. Em `DesempateForm.tsx` (ou onde fizer mais sentido na árvore de componentes já existente), um botão "Limpar decisão" / "Revogar", visível quando aquele escopo já tem uma resolução registrada (a tela precisa saber disso — conferir se `listarPendenciasDeDesempate` já distingue "sem empate" de "empate resolvido"; se não distinguir, pode ser necessário buscar o estado atual via os próprios endpoints de ranking, que já devolvem `empate: true`/posição consolidada).
3. Confirmação antes de revogar, com o texto deixando claro que o escopo volta a ficar pendente e vai aparecer de novo em `AlertaDeDesempate` até ser resolvido de novo.
4. Depois de revogar, atualizar a lista de pendências e o ranking (reaproveitar os hooks já existentes em `desempate.hooks.ts`, invalidando/recarregando como as outras ações do mesmo arquivo já fazem).

## Testes (Vitest + Testing Library, `msw`, seguindo o padrão de `DesempateForm.spec.tsx` e `desempate.spec.ts` já existentes)

- Revogar um escopo com decisão manual: o alerta de pendência volta a aparecer.
- Revogar um escopo com decisão automática: mesmo comportamento.
- Revogar um escopo sem decisão nenhuma: ação não quebra (a API já é idempotente, `removidos: 0`).

## Critérios de aceite

- O fluxo funciona contra a API real localmente.
- `npm run test` passa, incluindo os testes novos lado a lado com os já existentes nos arquivos de desempate.

## Fora de escopo

Qualquer trava de prazo para revogar (mesmo limite da Etapa 08 da API).
