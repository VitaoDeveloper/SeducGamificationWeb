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
  components/  componentes reutilizáveis (Button, Card, Table, Field, Toast)
  features/    uma pasta por domínio — entra a partir da Etapa 02
  lib/         cliente HTTP, guarda do token, utilitários
  styles/      tokens de design e estilos globais
```

`src/app/pages/ShowcasePage.tsx` é a página de validação dos tokens, e é
temporária: sai quando a tela de login entrar na rota `/`, na Etapa 02.
