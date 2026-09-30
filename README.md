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
| `pnpm test`       | Vitest, uma vez (`vitest run`)                  |
| `pnpm test:watch` | Vitest em modo watch                            |

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

| Rota                    | Quem entra                          |
| ----------------------- | ----------------------------------- |
| `/login`                | qualquer um                         |
| `/salas`                | professor — lista de salas por escola |
| `/salas/:salaId`        | professor — sala, lecionamentos e inscrição |
| `/salas/:salaId/alunos` | professor — alunos da sala e cadastro |
| `/salas/:salaId/competicoes` | professor — competições de cada lecionamento da sala |
| `/competicoes/:competicaoId` | professor — bimestres, grupos, componentes de pontuação e lançamentos por bimestre |
| `/conta/senha`          | qualquer um autenticado             |
| `/em-breve`             | aluno — área em construção até a Etapa 08 |

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

## Salas, lecionamento e alunos (Etapa 03)

Depois do login, o professor cai em `/salas`. Salas são **compartilhadas** entre
os professores da mesma escola: a lista não é "minhas salas", é "salas das
escolas em que atuo", com o indicador "Você leciona aqui" (tem lecionamento) ou
"Disponível para inscrição" (ainda não). Como o professor pode atuar em mais de
uma escola, a lista é agrupada por escola.

A inscrição numa sala (`POST /salas/:salaId/inscricao`) é o que declara os
componentes curriculares que ele leciona ali, e é o que dá origem à competição
(Etapa 04). A senha inicial do aluno cadastrado é o próprio código de matrícula
gerado (`26XXX`); o modal de confirmação é a única vez que esse código aparece
junto com a explicação, então ele fica em destaque e com botão de copiar.

### Limites da API que moldam a tela

Estas lacunas foram confirmadas na API e explicam decisões de interface que, sem
a nota, pareceriam bugs:

- **Não existe `GET /escolas` nem vínculo de escolas do professor.** As escolas
  oferecidas no formulário de nova sala são deduplicadas de `GET /salas`; um
  professor sem nenhuma sala não tem de onde escolher escola, e o formulário
  diz isso em vez de mostrar um select vazio.
- **Não existe `GET /salas/:id`.** O detalhe procura a sala em `GET /salas`,
  que o professor acabou de carregar e é pequena.
- **`GET /salas` não diz quem está inscrito.** Cada sala custa uma chamada extra
  a `GET /salas/:salaId/lecionamentos` para descobrir se o professor da sessão
  leciona nela. Uma falha nessa chamada secundária não esconde a sala: ela
  aparece sem o indicador de inscrição.
- **`POST /salas` não inscreve o criador.** A sala recém-criada aparece marcada
  como "Disponível para inscrição"; o critério da Etapa 03 de vê-la "marcada como
  leciona aqui" exigiria mudança na API.

## Competição, bimestres e grupos (Etapa 04)

A competição nasce de um **lecionamento** (professor + sala), então a aba
"Competições" da sala lista uma seção por lecionamento: o professor vê as
competições dos colegas e só oferece "Nova competição" onde ele mesmo leciona.
Cada competição tem exatamente **4 bimestres**, com as datas definidas de uma vez
na criação (`POST /competicoes` não aceita competição sem os quatro).

O detalhe (`/competicoes/:competicaoId`) gira em torno de **qual bimestre está em
exibição**: a página abre no bimestre aberto mais recente (e no primeiro, se não
houver nenhum aberto) e um seletor troca a lista de grupos e a composição. Grupos
são equipes que atravessam o ano; um aluno pode mudar de equipe entre bimestres
ou dentro do bimestre atual, enquanto ele estiver aberto. Com o bimestre
`ENCERRADO`, os controles de composição ficam desabilitados e só de leitura.

Decisões que valem conhecer:

- **Trocar de grupo é remover e adicionar.** A API não tem uma rota de "troca":
  `GerenciarMembros` faz `DELETE` do vínculo antigo e `POST` no novo, e devolve o
  aluno ao grupo antigo se o novo vínculo falhar — sem isso, ele ficaria sem
  grupo nenhum. O `select` de cada aluno é controlado pelos dados do servidor,
  não por estado local, então a interface nunca o mostra em dois grupos.
- **A composição é um `select` por aluno.** Como o vínculo é triplo (grupo,
  aluno, bimestre) e um aluno só cabe em um grupo por bimestre, "de quem é este
  aluno?" é exatamente o que um select responde.
- **A validação das datas é testada isoladamente.** `validarBimestres`
  (`features/competicoes/bimestres.ts`) é pura e devolve o erro por bimestre e o
  erro de conjunto (sobreposição/ordem); o formulário só a liga aos campos.
- **A sala do detalhe é deduzida do lecionamento.** Não há `GET /lecionamentos/:id`
  nem `GET /salas/:id`, então `useContextoDaCompeticao` procura o lecionamento nas
  salas do professor para achar a sala e a lista de alunos numa varredura só.

## Componentes de pontuação e lançamentos (Etapa 05)

O detalhe da competição virou abas: **Grupos** (Etapa 04), **Componentes** e
**Lançamentos**, com **Rankings** visível e desabilitada até a Etapa 06. As três
penduram a mesma escolha de bimestre, e o seletor continua acima das abas.

**Componentes** mostra um cartão por matéria com os pesos e o indicador de
fechamento — `100% ✓` ou `faltam X%`. A soma é refeita no front e arredondada a 2
casas em `avaliarPesos`, e não lida de `somaPesoPercentual`: `33.33 + 33.33 +
33.34` dá `100.00000000000001` em ponto flutuante, e sem o arredondamento uma
matéria perfeitamente fechada apareceria como "faltam 0%". O veredito do topo é o
de `POST .../validar`, o mesmo que a Etapa 07 vai consultar para recusar o
encerramento de um bimestre com pesos abertos.

**Lançamentos** traz uma linha por aluno da sala, com o campo no formato do modelo
de avaliação da escola: input numérico 1–10 com passo `0.01`, ou seletor de
rótulos. Salvar em lote é o caminho principal, e cada linha que mudou ganha o seu
próprio botão para o professor retocar um nome só.

Decisões que valem conhecer:

- **O que está no campo vem do servidor; o que foi digitado fica por cima.** O
  valor efetivo é `editados[alunoId] ?? valor já salvo`, então uma recarga por baixo
  não apaga o que está sendo digitado. E a tabela recebe `key={componente.id}`:
  sem a remontagem, a nota digitada na prova de Matemática reapareceria como se
  fosse da dissertação de Português.
- **Aluno sem nota não trava o salvamento dos outros.** Campo em branco não entra
  no lote, e a API trata a ausência como 0 no cálculo. É por isso que "nenhum
  lançamento" e "campo vazio" são a mesma coisa.
- **O bimestre encerrado trava as notas, não a leitura.** Os campos e os salvamentos
  ficam desabilitados, mas o seletor de componente continua livre: consultar um
  bimestre encerrado é justamente o que se faz com ele. Na aba de componentes, o
  formulário de criação some inteiro em vez de ficar um botão morto.
- **Um erro de regra de negócio da API aparece como está.** A soma dos pesos de uma
  matéria que passa de 100% só é detectável no servidor, que soma o que já existe
  no banco; o front valida o formato do peso, não o total da matéria.

### Limites da API que moldam a tela

- **A API não expõe `modeloAvaliacao` da escola.** Não existe rota de modelos de
  avaliação, e `GET /salas` devolve `escola: { id, nome }` por um `select`
  explícito que não inclui o campo. `modeloAvaliacaoDaEscola`
  (`features/competicoes/modelo-avaliacao.ts`) é a costura: devolve o CPS ETEC
  (`I`, `R`, `B`, `MB`) do seed da API e, quando existir a rota, muda só o corpo
  dela. Os componentes recebem o modelo por prop, então nada mais muda junto.
  O `LancamentosService` já valida o modelo por dentro e recusa com 400 valor fora
  da escala, e esse erro é exibido como a API mandou.
- **O `GET` de componentes é agrupado por matéria.** Não existe rota de componente
  solto nem listagem por componente: a tela agrupa o que a API já devolve grouped,
  e os lançamentos vêm por componente (`GET
  /componentes-pontuacao/:id/lancamentos`), com `aluno` embutido no lançamento.
- **O lançamento não tem `id`.** A chave é o par `(componentePontuacaoId, alunoId)`
  e a API faz `upsert`, então relançar a nota troca a existente em vez de duplicar
  linha na tela.

## Testes

Vitest + Testing Library + `msw`, na mesma convenção do backend
(`SeducGamification`): o arquivo de teste fica **ao lado** do arquivo testado,
como `NomeDoArquivo.spec.ts` / `.spec.tsx`.

```bash
pnpm test
```

A API não precisa estar rodando. Quem responde às requisições é o `msw`, e
`src/test/server.ts` nasce **sem handlers**: cada teste declara os seus com
`server.use(...)` e o `resetHandlers` desfaz tudo depois. Um handler fixo no
servidor compartilhado valeria para a suíte inteira, e um teste esqueceria de
desligar o mock do anterior.

| Arquivo                        | O que é                                             |
| ------------------------------ | --------------------------------------------------- |
| `src/test/setup.ts`            | jest-dom, servidor msw no ar e limpeza de sessão     |
| `src/test/server.ts`           | o `setupServer` do msw, sem handlers                 |
| `src/test/handlers.ts`         | fábricas de handler por cenário, de autenticação a lançamentos |
| `src/test/render.tsx`          | renderiza com `ToastProvider`, `AuthProvider` e `MemoryRouter` |

Dois pontos que valem saber antes de escrever o próximo teste:

- **A sessão precisa ser limpa entre os testes.** `src/lib/sessao.ts` guarda o
  token numa variável de módulo, que sobrevive de um teste para o outro no mesmo
  arquivo. O `beforeEach` do `setup.ts` faz isso; um teste que grava sessão e
  esquece de limpar derruba o seguinte.
- **Uma requisição sem handler é erro, não papel.** O msw está com
  `onUnhandledRequest: 'error'`, para o teste que esqueceu de mockar a API
  falhar em vez de passar por uma resposta vazia.

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
    pages/     telas provisórias ainda fora de feature (/em-breve)
  components/  componentes reutilizáveis (Button, Card, Table, Field, Modal, Toast)
  features/    uma pasta por domínio
    auth/      telas de login e troca de senha, contexto de sessão, rotas
    salas/     listagem, detalhe, inscrição e alunos — a Etapa 03
    competicoes/ competição, bimestres, grupos, componentes e lançamentos — as Etapas 04 e 05
  lib/         cliente HTTP, guarda da sessão, utilitários
  styles/      tokens de design e estilos globais
  test/        base dos testes: msw, setup e utilitários de render
```

`Table`, `Spinner` e o toast, criados na Etapa 01, ganharam uso na Etapa 03: as
listagens de salas e alunos são tabelas, o `carregando` de `useRequisicao`
alimenta o esqueleto do `Table`, e o toast confirma criação de sala, inscrição e
cadastro de aluno. O `Modal` também estreou aqui, no código de matrícula.

A Etapa 04 reusa a mesma base: as abas da sala saíram de `SalaDetailPage` para
`AbasDaSala` (as três telas da sala agora compartilham a barra), o `Badge`
estreou no estado Aberto/Encerrado do bimestre, e o toast passou a confirmar
criação de competição e de grupo.

A Etapa 05 acrescenta as abas da competição sobre essa mesma barra
(`role="tablist"`, com a aba de rankings já no lugar e desabilitada), e o `Table`
vira a grade de lançamento das notas, com input numérico ou `Select` de conceitos
conforme o modelo da escola. O `Badge` ganhou o indicador de fechamento da
matéria.
