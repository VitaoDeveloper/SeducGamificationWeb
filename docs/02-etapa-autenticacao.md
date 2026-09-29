# Etapa 02 (GUI) — Autenticação

**Pré-requisito:** Etapa 01 concluída (projeto criado, design system e componentes-base prontos).
**Endpoints da API usados:** `POST /auth/login`, `POST /auth/trocar-senha` (ver `plano-implementacao/02-etapa-seed-e-autenticacao.md` do repositório da API para o contrato exato).

## Configuração de testes automatizados (Vitest)

Antes das tarefas de autenticação em si, configurar a base de testes unitários do front, no mesmo espírito do que já foi feito no back-end (`SeducGamification`, que usa Vitest com `*.spec.ts` para unitários). O objetivo é dar feedback rápido a cada etapa, sem depender de testar tudo manualmente no navegador.

1. Instalar `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` e `msw` (para simular as respostas da API nos testes, sem precisar do backend rodando).
2. Criar `vitest.config.ts` na raiz do projeto, com `environment: 'jsdom'`, `globals: true` e o `setupFiles` apontando para um arquivo de configuração (`src/test/setup.ts`) que importa `@testing-library/jest-dom` e inicializa o servidor `msw`.
3. Adicionar o script `"test": "vitest run"` (e `"test:watch": "vitest"`) ao `package.json`, espelhando a convenção do backend.
4. Convenção de nomenclatura: arquivos de teste ficam ao lado do arquivo testado, como `NomeDoArquivo.spec.ts` ou `NomeDoArquivo.spec.tsx` — mesmo padrão `*.spec.ts` do backend, adaptado para componentes React.
5. Criar `src/test/server.ts` com um servidor `msw` básico (sem handlers ainda — cada etapa seguinte adiciona os seus).

Esta configuração só precisa ser feita uma vez, aqui na Etapa 02; as etapas seguintes (03 a 11) só adicionam testes e, quando for o caso, novos handlers do `msw`.

## Contexto para o agente

O login é feito por **código de matrícula** (não e-mail), no padrão `26XXX`, tanto para professor quanto para aluno — é a mesma tela para os dois perfis; a API devolve no token qual é o tipo (`PROFESSOR` ou `ALUNO`), e é isso que decide o que a aplicação mostra depois. A senha inicial de todo mundo é o próprio código de matrícula, então é comum o usuário precisar trocá-la logo no primeiro acesso — por isso a troca de senha entra nesta etapa, junto do login, e não como algo posterior.

## Tarefas

1. **Tela de login** (`src/features/auth/LoginPage.tsx`), na rota `/login`:
   - Campos: código de matrícula, senha. Usar os componentes `Input`/`Field` e `Button` da Etapa 01.
   - Fundo com o gradiente suave lilás-rosado da referência visual (é uma das poucas telas onde ele se aplica).
   - Chama `POST /auth/login`; em caso de sucesso, guarda o token (ver item 2) e redireciona: professor vai para `/salas` (a tela inicial dele, Etapa 03), aluno vai para uma rota provisória `/em-breve` (área do aluno ainda não existe nesta rodada — só uma tela simples de "Bem-vindo(a), a área do aluno está em construção", com um botão de sair).
   - Em caso de erro (401), mostrar mensagem clara perto do formulário (não usar `alert()`).

2. **Contexto de autenticação** (`src/features/auth/AuthContext.tsx`):
   - Guarda `{ token, tipo, id }` em memória (Context/state) **e** em `localStorage`, para sobreviver a um refresh de página. Ao carregar a aplicação, ler o `localStorage` e restaurar a sessão, se houver.
   - Expor um hook `useAuth()` com `{ user, login(codigoMatricula, senha), logout() }`.
   - `logout()` limpa o token e redireciona para `/login`.

3. **Interceptor do Axios** (completar `src/lib/api.ts` da Etapa 01):
   - Anexar o header `Authorization: Bearer <token>` em toda requisição, lendo do mesmo lugar onde o `AuthContext` guarda o token.
   - Em qualquer resposta `401`, disparar o `logout()` (pode ser via um evento simples ou lendo o contexto fora do React, com uma referência mutável — documentar a abordagem escolhida) e redirecionar para `/login`.

4. **Rota protegida** (`src/app/ProtectedRoute.tsx`): componente que verifica se há usuário autenticado (via `useAuth()`); se não houver, redireciona para `/login`. Usar para envolver todas as rotas das próximas etapas.

5. **Tela de troca de senha** (`src/features/auth/TrocarSenhaPage.tsx`), na rota `/conta/senha`, acessível a partir de um menu simples no cabeçalho (nome/código do usuário logado + link "Trocar senha" + botão "Sair"):
   - Campos: senha atual, nova senha, confirmar nova senha (validação de que as duas batem, no front, antes de enviar).
   - Chama `POST /auth/trocar-senha`. Sucesso mostra uma confirmação; erro (senha atual incorreta) mostra mensagem no formulário.

6. **Layout autenticado** (`src/app/AuthenticatedLayout.tsx`): cabeçalho simples com o nome/código do usuário e o menu de conta do item 5, envolvendo as rotas protegidas das próximas etapas.

## Testes automatizados (Vitest)

- `AuthContext`: testar `login()` com sucesso (guarda token e dados do usuário, tanto em memória quanto em `localStorage`) e com falha (401 — não guarda nada, propaga o erro para a tela tratar); testar `logout()` (limpa `localStorage` e o estado); testar que, ao montar o provider com um token já presente no `localStorage`, a sessão é restaurada.
- `LoginPage`: usando Testing Library + `msw` (mockando `POST /auth/login`), testar envio do formulário com sucesso (redireciona conforme o tipo de usuário) e com erro (mostra a mensagem, sem navegar).
- `ProtectedRoute`: testar que redireciona para `/login` sem usuário autenticado, e que renderiza o conteúdo filho quando há usuário.
- Interceptor do Axios: testar que o header `Authorization` é anexado quando há token, e que uma resposta 401 dispara o `logout()`.
- `TrocarSenhaPage`: testar a validação local (nova senha e confirmação precisam bater) antes mesmo de chamar a API, e o fluxo de sucesso/erro via `msw`.

## Critérios de aceite

- Login com código de matrícula e senha válidos redireciona corretamente conforme o tipo de usuário.
- Login com credenciais inválidas mostra erro sem quebrar a tela.
- Dar refresh na página com um usuário logado mantém a sessão (não volta para o login).
- Acessar uma rota protegida sem estar logado redireciona para `/login`.
- Trocar a senha com a senha atual correta funciona; um novo login com a senha antiga passa a falhar (dependendo do estado da API nesse momento — validar manualmente contra a API rodando localmente).
- "Sair" limpa a sessão e volta para `/login`.
- `npm run test` passa, cobrindo os casos listados em "Testes automatizados (Vitest)" acima.

## Fora de escopo

Recuperação de senha esquecida (não existe na API), cadastro de usuário pela própria tela (login e senha vêm de um cadastro feito por outra pessoa — mantenedor ou professor, conforme o perfil).
