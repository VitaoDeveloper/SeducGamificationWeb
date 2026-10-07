# Etapa 06 (GUI) — Editar e excluir componente de pontuação

**Pré-requisito:** Etapa 06 (API) implantada.
**Tela afetada:** aba "Componentes" da `CompeticaoDetailPage` (`src/features/competicoes/`).
**Endpoints novos:** `PATCH /componentes-pontuacao/:id`, `DELETE /componentes-pontuacao/:id`.

## Tarefas

1. Em cada componente listado (dentro de cada matéria): ícone de editar (nome e peso, reaproveitando o formulário de criação em modo edição) e ícone de excluir.
2. O indicador de "soma de pesos" da matéria (já existente) precisa atualizar imediatamente após editar ou excluir um componente, sem exigir reload.
3. **Confirmação reforçada** no excluir: se o componente já tiver lançamentos (a tela de lançamentos já carrega essa informação, ou pode-se checar via `GET` dos lançamentos antes de confirmar), o modal de confirmação deve avisar explicitamente "Este componente já tem N nota(s) lançada(s); elas serão apagadas junto." — não deixar isso implícito.
4. Ambos os botões desabilitados/ocultos quando o bimestre estiver `ENCERRADO` (mesma régua já usada nas telas de lançamento).

## Testes (Vitest + Testing Library, `msw`)

- Editar nome/peso de um componente: indicador de soma da matéria atualiza corretamente.
- Tentar editar para um peso que estoura 100% (mockado 400): mensagem aparece, valor não é salvo.
- Excluir componente sem lançamentos: confirmação simples, some da lista.
- Excluir componente com lançamentos: confirmação menciona a quantidade de notas que serão apagadas.
- Bimestre encerrado: botões de editar/excluir não aparecem (ou aparecem desabilitados).

## Critérios de aceite

- Os fluxos acima funcionam contra a API real localmente.
- `npm run test` passa.

## Fora de escopo

Editar componente de bimestre encerrado.
