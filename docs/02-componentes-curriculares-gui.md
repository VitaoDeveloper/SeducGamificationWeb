# Etapa 02 (GUI) — Componentes curriculares avulsos e desinscrição

**Pré-requisito:** Etapa 02 (API) implantada.
**Tela afetada:** `SalaDetailPage`, na lista de lecionamentos (`src/features/salas/`).
**Endpoints novos:** `POST /lecionamentos/:id/componentes-curriculares`, `PATCH /componentes-curriculares/:id`, `DELETE /componentes-curriculares/:id`, `DELETE /lecionamentos/:id`.

## Tarefas

1. Em cada lecionamento listado no detalhe da sala, ao lado de cada componente curricular: ícone de editar (abre um campo inline ou modal simples com o nome) e ícone de excluir (com confirmação).
2. Um botão "Adicionar matéria" por lecionamento, abrindo um campo de texto simples (não precisa do `TagsInput` da inscrição original — aqui é um componente de cada vez).
3. Tratar o erro 409 de exclusão (componente com pontuação já criada) mostrando a mensagem da API; o mesmo para nome duplicado ao adicionar.
4. No lecionamento do **próprio professor logado** (comparar com o usuário autenticado), um botão "Sair desta sala" (desinscrição), com confirmação clara (explicando que isso remove o professor e as matérias dele dali) — só habilitado quando a API permitir (pode tentar direto e tratar o 409, sem precisar pré-checar no front).

## Testes (Vitest + Testing Library, `msw`)

- Adicionar matéria a um lecionamento: aparece na lista sem reload.
- Renomear matéria: reflete na tela.
- Excluir matéria sem pontuação: some da lista.
- Excluir matéria com pontuação (mockado 409): mensagem de erro aparece, matéria continua na lista.
- Desinscrever-se de uma sala sem competições: lecionamento some da lista.
- Desinscrever-se com competições (mockado 409): mensagem de erro aparece.

## Critérios de aceite

- Os seis fluxos acima funcionam contra a API real localmente.
- `npm run test` passa.

## Fora de escopo

Mesclar componentes duplicados (mesmo limite da Etapa 02 da API).
