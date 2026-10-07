# Etapa 04 (GUI) — Editar e excluir competição (e corrigir datas de bimestre)

**Pré-requisito:** Etapa 04 (API) implantada.
**Tela afetada:** `CompeticaoDetailPage` (`src/features/competicoes/`).
**Endpoints novos:** `PATCH /competicoes/:id`, `PATCH /bimestres/:id`, `DELETE /competicoes/:id`.

## Tarefas

1. Botão "Editar nome" no cabeçalho da página da competição.
2. Em cada card de bimestre (área de "Bimestres" já existente), um ícone de editar que só aparece **habilitado** quando o bimestre está `ABERTO` e sem componentes de pontuação criados ainda (checar com o que a tela já tem carregado, para não precisar de uma chamada extra só para decidir se mostra o botão — e, de todo modo, tratar o 409 da API se o usuário tentar mesmo assim, por segurança). Abre um formulário com as mesmas validações de data já usadas na criação da competição (reaproveitar a validação, não duplicar).
3. Botão "Excluir competição" (com confirmação), tratando o 409 com a mensagem da API quando a competição já tiver uso.

## Testes (Vitest + Testing Library, `msw`)

- Editar nome da competição: reflete no cabeçalho.
- Editar data de um bimestre elegível: reflete no card.
- Tentar editar/excluir com resposta 409 mockada: mensagem da API aparece, nada muda na tela.
- Excluir competição "vazia": volta para a listagem de competições do lecionamento.

## Critérios de aceite

- Os fluxos acima funcionam contra a API real localmente.
- `npm run test` passa.

## Fora de escopo

Reabertura de bimestre encerrado.
