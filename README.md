## Seduc Gamification Web

Interface do sistema de competições gamificadas entre equipes de alunos, para
professores e estudantes de escolas técnicas. Front-end do
[`SeducGamification`](https://github.com/VitaoDeveloper/SeducGamification) (API
NestJS).

## Rodando

```bash
pnpm install
cp .env.example .env   # ajuste VITE_API_BASE_URL
pnpm dev
```

> O `.env` precisa apontar para uma API que responda. O `seduc-gamification.vercel.app`
> hoje é um deploy de preenchimento: responde `Hello World!` em `/` e 500 em
> `/auth/login`. Para desenvolver contra a API local, use
> `VITE_API_BASE_URL=http://localhost:3000`.

| Script            | O que faz                                       |
| ----------------- | ----------------------------------------------- |
| `pnpm dev`        | Servidor de desenvolvimento                    |
| `pnpm build`      | Typecheck (`tsc -b`) e build de produção        |
| `pnpm preview`    | Serve o build de produção                       |
| `pnpm lint`       | oxlint                                          |

A API não tem prefixo global de rota, então `VITE_API_BASE_URL` é só a origem
(`http://localhost:3000`) e os caminhos das chamadas são relativos à raiz
(`/auth/login`, `/salas`).

## A porta 5173 é obrigatória

O CORS da API libera apenas `http://localhost:5173`. O `vite.config.ts` fixa a
porta com `strictPort`, de propósito: se a 5173 estiver ocupada e o Vite subir
na 5174, o navegador bloqueia o preflight e a interface deixa de falar com a
API sem nenhuma mensagem de erro no console do Vite. Com `strictPort`, o
dev server falha na inicialização, o que é um problema visível.

## Autenticação

O login é por **código de matrícula** (padrão `26XXX`), o mesmo para professor e
aluno. A tela é uma só; quem decide o que aparece depois é o token, que carrega o
tipo (`PROFESSOR` ou `ALUNO`) e manda a pessoa para a rota inicial do perfil —
`/salas` para o professor, `/em-breve` para o aluno, que ainda não tem área.

| Rota           | Quem entra                          |
| -------------- | ----------------------------------- |
| `/login`       | qualquer um                         |
| `/salas`       | professor — tela provisória da Etapa 03 |
| `/conta/senha` | qualquer um autenticado            |
| `/em-breve`    | aluno — área em construção até a Etapa 08 |

### Onde a sessão mora

`src/lib/sessao.ts` guarda token e usuário, fora do React, porque dois
consumidores precisam ler isso e um deles não é componente: o interceptor de
`src/lib/api.ts` e o `AuthProvider`. A dependência fica de baixo para cima — o
provider conhece a guarda, nunca o contrário.

O 401 não recarrega a página: o interceptor chama `limparSessao()`, o
`AuthProvider` acorda com o usuário nulo, o `ProtectedRoute` redireciona para o
login e guarda em `state` a rota que a pessoa tentava abrir, para ela voltar
para lá depois de entrar.

**401 tem dois significados na API**, e a distinção importa: token expirado
(derruba a sessão) e credencial recusada no corpo da requisição (é erro do
formulário). `POST /auth/trocar-senha` devolve 401 com "Senha atual incorreta",
que é o segundo caso — sem a marcação `semSessaoAoExpirar` nessa chamada, o
professor errava a senha atual e era expulso para o login.

## Design system

Os tokens de cor, tipografia, forma e sombra ficam em
[`src/styles/tokens.css`](src/styles/tokens.css) e são a fonte única de
verdade. Nenhum componente escreve cor literal no `className`: se surgir uma
necessidade nova, ela vira um token ali, com nome e comentário, para as
próximas etapas reaproveitarem em vez de redefinirem cores soltas pelo código.

Dois pontos que valem conhecer antes de mexer nas cores:

- **Preenchimento com texto branco usa os tons 600, não os 500.** Os 500 da
  paleta de marca ficam em 4.39:1 e 4.13:1 com branco, abaixo das 4.5:1 do
  WCAG AA para texto de corpo. As razões de cada token estão no arquivo.
- **Borda de controle usa `--color-line-strong`, não `--color-line`.** A borda
  é o que identifica o campo, então precisa de 3:1 (WCAG 1.4.11), e
  `--color-line` fica em 1.26:1 sobre branco.

O fundo em gradiente é reservado à tela de login e ao cabeçalho do dashboard.
Listagens, formulários e tabelas ficam em branco e cinza, porque são o dia a dia
do professor.

## Estrutura

```
src/
  app/         rotas e providers globais
    pages/     telas provisórias (/salas e /em-breve), uma por destino de rota
  components/  componentes reutilizáveis (Button, Card, Table, Field, Toast)
  features/    uma pasta por domínio — `auth` por enquanto
    auth/      telas de login e troca de senha, contexto de sessão, rotas
  lib/         cliente HTTP, guarda da sessão, utilitários
  styles/      tokens de design e estilos globais
```

`src/components/Table.tsx`, `Spinner` e o sistema de toast já existem desde a
Etapa 01, mas ainda não têm tela que os use: a Etapa 02 é toda formulário, e o
erro e a confirmação ficam no formulário, perto do campo que os causou. O toast
entra junto com a primeira listagem, na Etapa 03.
