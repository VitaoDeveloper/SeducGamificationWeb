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

> O `.env` precisa apontar para uma API que responda. O
> `seduc-gamification.vercel.app` está no ar e atende às rotas normalmente —
> `POST /auth/login` devolve `401` para credenciais inválidas e `GET /escolas`
> devolve `401` sem token, que é o comportamento esperado das duas. A raiz `/`
> responde `Hello World!`, porque é o padrão do Nest e não indica nada sobre a
> saúde da API; para desenvolver contra a API local, use
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
`/salas` para o professor, `/aluno` para o aluno.

| Rota                    | Quem entra                          |
| ----------------------- | ----------------------------------- |
| `/login`                | qualquer um                         |
| `/salas`                | professor — lista de salas por escola |
| `/salas/:salaId`        | professor — sala, lecionamentos e inscrição |
| `/salas/:salaId/alunos` | professor — alunos da sala e cadastro |
| `/salas/:salaId/competicoes` | professor — competições de cada lecionamento da sala |
| `/competicoes/:competicaoId` | professor — bimestres, grupos, componentes, lançamentos, prévia e rankings |
| `/aluno`                | aluno — rankings da competição da sala (Etapa 08) |
| `/conta/senha`          | qualquer um autenticado             |

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

### Bloqueios

Diagnósticos escritos com causa, evidência e o que foi feito:

| Documento | Assunto | Estado |
| --- | --- | --- |
| [`docs/12-bloqueio-escolas-do-professor.md`](docs/12-bloqueio-escolas-do-professor.md) | Nova sala não oferecia as escolas vinculadas — professor com vínculo e sem salas não conseguia criar a primeira | **resolvido** com `GET /escolas` na API |

## Limites da API que moldam a tela

Estas lacunas foram confirmadas na API e explicam decisões de interface que, sem
a nota, pareceriam bugs:

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

O detalhe da competição virou abas: **Grupos** (Etapa 04), **Componentes**,
**Lançamentos**, **Prévia** (Etapa 06) e **Rankings** (Etapa 08). As quatro
primeiras penduram a mesma escolha de bimestre, e o seletor continua acima das
abas; a de rankings tem vida própria e é a última da barra.

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

## Prévia da síntese (Etapa 06)

A API só grava as sínteses no **encerramento** do bimestre (Etapa 07) e não
oferece rota de "síntese parcial". A Etapa 06 calcula no navegador o que o
encerramento vai gravar, e mostra em dois lugares: a coluna **Prévia** da tabela
de lançamentos, que acompanha a digitação nota a nota, e a aba **Prévia** da
competição, com a síntese do bimestre por aluno e por grupo.

Nenhum dos dois números é o oficial, e a interface diz isso onde o número aparece:
o cabeçalho da coluna e o rodapé da tabela carregam o texto de `AVISO_DE_PREVIA`
("Prévia — sujeita a alteração até o encerramento do bimestre"), e o painel abre
com um aviso, antes das tabelas, em vez de num rodapé.

A conta mora em `src/lib/sinteseCalculo.ts` — cópia deliberada do
`SinteseCalculoService` do backend — e a montagem dos dados, em
`features/competicoes/previa-sintese.ts`, que é quem conhece as formas que a API
devolve. São três camadas porque a conta é a mesma em dois lugares (coluna e
painel) e a montagem, não.

Decisões que valem conhecer:

- **O arredondamento é `Number(valor.toFixed(2))`, não
  `Math.round(valor * 100) / 100`.** Os dois divergem nos empates de meia casa, e o
  caso é alcançável: notas `1`, `1` e `5.25` com pesos 50/20/30 dão 2.275 na
  conta bruta — `toFixed` devolve 2.27 e `Math.round` devolve 2.28. A prévia erraria
  justamente nos centésimos que separam dois grupos no ranking. Cada etapa
  arredonda antes da próxima, que é o que o backend faz.
- **A média bimestral divide por todas as matérias do lecionamento, inclusive as
  que ainda não têm componente.** Elas valem 0 no numerador e ficam no
  denominador, que é como `calcularSintesesDosAlunos` monta a lista. Dividir só
  pelas matérias com nota mostraria uma prévia **maior** do que a que será
  gravada, e o painel avisa quais matérias estão assim para a queda da média não
  parecer reprovação em matéria que nem existe.
- **O que está no campo ganha do que está salvo, e campo vazio vale como "sem
  lançamento".** A prévia acompanha a digitação antes do "Salvar"; limpar o campo
  conta como 0, e não volta para a nota antiga. Texto fora do modelo de avaliação
  (o "8,5" e o "11" que o campo passa exibindo enquanto se digita) **não entra na
  conta** — a API o recusaria com 400, e sem a checagem o `parseFloat` o leria
  como 8.
- **Grupo sem integrante mostra "—" e não 0.** O encerramento devolve esse grupo em
  `gruposSemIntegrantes` e não grava síntese para ele; um 0 ali seria um número
  que nunca vai existir.
- **Bimestre encerrado não é recalculado.** Quem manda no número é a síntese que a
  API gravou, e a Etapa 06 deixa isso fora de escopo: a coluna some da tabela e o
  painel explica, em vez de apresentar um segundo valor para a mesma coisa.
- **Os números são sempre mostrados com duas casas e ponto.** A vírgula decimal é
  recusada pela API no lançamento, então mostrar vírgula aqui ensinaria o professor
  a digitar errado — e "8.2" do lado de "8.20" parece valor diferente.

### Limites da API que moldam a tela

- **Não existe rota de síntese parcial.** O que a prévia faz são N chamadas a
  `GET /componentes-pontuacao/:id/lancamentos`, uma por componente do bimestre, em
  paralelo (`useLancamentosDeComponentes`).
- **`modeloAvaliacao` continua sem rota.** A conta precisa converter o rótulo
  conceito em número, e o modelo que a tela assume passou a carregar também
  `niveis` (`I` = 3, `R` = 5, `B` = 8, `MB` = 10) — os do seed da API. Quando a
  rota existir, o corpo de `modeloAvaliacaoDaEscola` muda e nada mais junto.
- **Nada é gravado.** A prévia não tem salvamento; a síntese só existe depois do
  encerramento, e vem do backend.

## Rankings — parcial, anual e individual (Etapa 08)

A aba **Rankings** da competição tem três sub-visões atrás de um seletor de
botões: **Parcial** (com seletor de bimestre), **Anual** e **Individual**. As três
mostram posição, nome e pontuação, e marcam quem empatou. As sub-visões ficam
atrás de um seletor, e não empilhadas, porque as escalas são diferentes: o
parcial vai a 10, o anual soma quatro e vai a 40, e o individual é média —
mostrar as três juntas daria três colunas "Pontuação" com significados distintos,
o caminho mais curto para ler `33,10` como se fosse uma nota. Só a visão em
exibição faz requisição.

Empate é a **posição repetida** com a flag `empate: true` que a API manda; a tela
não recalcula. `formatarPosicao` escreve `1º`, `2º`…, e o ícone ao lado da
posição tem o texto "empate" só para leitor de tela. O ranking diz quando ainda é
**parcial**: com `bimestresEncerrados < 4` (função `resultadoParcial`), o anual e
o individual mostram "Resultado parcial — N de 4 bimestres encerrados". O parcial
por bimestre não leva o aviso: ele é um recorte, por definição.

A área do aluno é `/aluno` (`features/aluno/`), que substituiu a rota provisória
`/em-breve` da Etapa 02. Ela reaproveita o mesmo `SecaoDeRanking` da aba do
professor, num layout mais simples — só leitura. Todo o desenho da tabela mora em
`features/rankings/`, compartilhado pelas duas pontas.

Decisões que valem conhecer:

- **O ranking parcial só abre em bimestre encerrado.** A síntese só é gravada no
  encerramento (Etapa 07), então antes disso a API não tem o que devolver; sem
  nenhum encerrado, a aba mostra "Nenhum bimestre encerrado ainda" em vez de uma
  tabela vazia.
- **O `useRequisicao` ganhou `traduzirErro`.** A recusa de escopo chega como
  `403`/`Forbidden`, que não diz nada a quem lê; a opção reescreve a mensagem
  daquele caso e deixa o tratamento padrão para rede, timeout e erro de
  aplicação. `traduzirErroDoRanking` é quem conhece o `403`.
- **A linha do aluno no individual leva a marca "Você".** O `id` de `GET
  /auth/me` é o `alunoId`, então a tela marca a linha dele sem depender de o nome
  bater. No ranking de equipes não há como resolver o grupo do aluno — não há
  endpoint que diga a que grupo ele pertence —, e por isso não há destaque lá.
- **O atalho do fim da competição virou ação.** Encerrar o 4º bimestre mostra
  "Ver o ranking final", que abre a aba já na visão **anual** (`visaoInicial`).
  Até a Etapa 07 o botão era um aviso desabilitado.

### Limites da API que moldam a tela

- **Os rankings são endpoints de professor.** A API responde `403` para o aluno
  (`README-API.md`, seções 7 e 9), e não existe endpoint que liste as competições
  do aluno — os únicos abertos a ele são os relatórios (Etapa 10). Por isso o
  dashboard do aluno **existe e funciona**, mas a competição vem na URL, no
  formato `/aluno?competicaoId=<uuid>` (e `?bimestreId=<uuid>` para o recorte do
  bimestre). A tela chama os endpoints e trata o `403` com uma mensagem amigável,
  em vez de supor o acesso. Quando a API abrir os rankings para o aluno e
  "minhas competições", a página acende sem reescrita; `rotaDoAluno` é o que vira
  navegação.
- **O ranking individual é a mesma forma dos de equipe.** `README-API.md` não
  exemplifica a resposta de `GET /competicoes/:id/ranking-individual`; o tipo
  `RespostaDoRankingIndividual` assume o mesmo envelope, sem `bimestreId` (é
  anual). Se a API divergir, é só o tipo e o `buscarRankingIndividual`.
- **Sem lista de bimestres acessível ao aluno.** O parcial do dashboard depende de
  o link trazer `?bimestreId`; sem ele, a seção do bimestre não aparece e nenhuma
  requisição é feita.

## Relatórios — quatro telas (Etapa 10)

Quatro relatórios, quatro endpoints, e a mesma pergunta em duas direções: como o
ano do aluno foi, e como o ano do grupo foi.

| Relatório            | Rota                                | Endpoint da API                           |
| -------------------- | ----------------------------------- | ----------------------------------------- |
| Individual do aluno  | `/alunos/:id/relatorio-individual`  | `GET /alunos/:id/relatorio-individual`    |
| Aluno × grupo        | `/alunos/:id/relatorio-comparativo-grupo` | `GET /alunos/:id/relatorio-comparativo-grupo` |
| Coletivo do grupo    | `/grupos/:id/relatorio`             | `GET /grupos/:id/relatorio`               |
| Grupo × grupos       | `/grupos/:id/relatorio-comparativo` | `GET /grupos/:id/relatorio-comparativo`   |

Os quatro são **só leitura**: mostram o que a API gravou no encerramento do
bimestre, e não refazem conta nenhuma. O individual traz a linha da síntese por
bimestre e a tabela de matérias de cada um; o comparado ao grupo repete a linha do
aluno ao lado da de cada colega **do grupo daquele bimestre** — o grupo pode mudar
entre bimestres, então a lista de quem era colega é por bimestre, e a série de um
colega que saiu tem intervalo em branco, não zero; o coletivo do grupo troca a
escala: a síntese do time por bimestre mais a soma das quatro em destaque, e a
tabela de integrantes com a síntese individual de cada um; o comparado aos grupos
repete o gráfico do coletivo com uma série por equipe.

**As escalas ficam separadas por desenho, não por esforço do leitor.**
`relatorios.tipos.ts` descreve três escalas — `SINTESE_BIMESTRAL` e `MEDIA_BIMESTRAL`
(0 a 10) e `SOMA_BIMESTRAL` (0 a 40) — e o formatador `formatarPontuacao` é o
**mesmo** nas três: escreve o número que a API mandou, com duas casas, e `null`
vira traço, nunca `0.00`. Isso é proposital. Um formatador que dividisse a soma por
4 devolveria um número "que cabe" em 0 a 10 e a mistura voltaria a ser possível
precisamente por parecer inocente; quem separa é o rótulo. Por isso a pontuação
final nunca entra no eixo do gráfico: ela mora em `BlocoDaPontuacaoFinal`, que
carrega o nome da escala, o teto ("0 a 10", "0 a 40") e, no caso da soma, as
parcelas (`1º: 8.25 · 2º: 7.50 · …`) — ver a conta decomposta é o que deixa
claro que `31.80` não é uma nota.

**Os gráficos são `recharts`.** A escolha: é a lib de gráfico mais usada do
ecossistema React, é só React (sem D3 para desenhar), e linhas e barras simples —
tudo que a Etapa 10 pede — saem em uma dúzia de linhas. Não foi preciso nada além
disso, e o `recharts` é a única dependência de runtime que a Etapa 10 acrescentou.
Três decisões de uso:

- **Sem `ResponsiveContainer`.** Ele mede o pai com `ResizeObserver`, e em jsdom isso
  não existe: o gráfico sairia com 0×0 e os testes virariam teste de medidor. O
  `useLarguraDisponivel` de `GraficoDeSintese.tsx` usa o `ResizeObserver` quando há
  um e cai em 640px quando não há, o que mantém o teste determinístico.
- **Sem animação** (`isAnimationActive={false}`) e **sem costurar lacunas**
  (`connectNulls={false}`): um relatório é para ser conferido, não para parecer
  animado.
- **Legenda feita à mão, e uma tabela `sr-only` com os mesmos valores.** O recharts
  não expõe os números em texto, então a tabela é o que dá o valor a um leitor de
  tela — e o que os testes leem, sem depender de coordenadas do SVG.

O preço: o `recharts` é a maior dependência que o projeto tem, e ele entrou no
**bundle principal** (422 kB → 781 kB minificado, 129 kB → 233 kB gzip), porque
`CompeticaoDetailPage` importa `RelatoriosDaCompeticao` pelo barrel de
`features/relatorios`, e o barrel também exporta as quatro telas e o
`GraficoDeSintese`. Quem paga isso é a tela de login, que é a primeira de todas.
Separar exigiria duas mudanças — `React.lazy` nas quatro rotas e import direto
(pelo caminho do arquivo, não pelo barrel) na aba de relatórios — e só compensa se
o gráfico entrar em uso com frequência; quando entrar, o `Suspense` de cada rota
tem que ter uma espera que não pisque entre dois renders. Fica anotado aqui como
dívida conhecida, e não escondido atrás de um número redondo.

A navegação para os quatro relatórios vem de três lugares: a aba **Relatórios**
da competição (uma tabela por grupo e outra por aluno), a coluna "Ver relatório"
da composição de grupos da Etapa 04, e o bloco "Meus relatórios" do dashboard do
aluno. O `alunoId` do link do aluno sai **da sessão**, nunca da URL: um id na
query transformaria o dashboard num gerador de link para o relatório de qualquer
pessoa — a API recusaria com `403`, mas a tela já teria oferecido o caminho. Os
relatórios de grupo não aparecem para o aluno porque são endereçados por
`grupoId`, e não existe endpoint que diga a ele a que grupo pertence.

O `403` vira uma frase — a mesma mensagem amigável que os rankings usam, sem
`Forbidden` nem `statusCode` na tela. Nenhum relatório é montado se a tela não
sabe o id: a página carrega, mostra "Informe o identificador…" e não chama a API.

### Limites da API que moldam a tela

- **A soma do grupo é a soma, e a média do aluno é a média.** `pontuacaoFinal`
  chega de cada endpoint já no sentido certo (média para o aluno, soma para o
  grupo), e a tela escreve o que chegou.
- **`comparativo` e `colegasDeGrupo` não incluem quem está lendo.** O
  `relatorio-comparativo-grupo` lista os *outros* integrantes, e o
  `relatorio-comparativo` lista os *outros* grupos. As séries de quem está lendo
  saem do relatório principal (em `series.ts`), e é por isso que esse arquivo é um
  módulo puro sem JSX: a regra de junção por `alunoId` é o que garante que a linha
  do aluno e a do colega que mudou de grupo se cruzem sem se costurar.
- **`GET /grupos/:id/relatorio` descobre a competição pelo grupo.** Por isso a rota
  do relatório de grupo não leva `competicaoId`; as de aluno levam, porque a API
  só exige quando o aluno participa de mais de uma competição.
- **Sem "minhas competições".** A tela do aluno continua recebendo a competição na
  URL (`/aluno?competicaoId=`), e o bloco de relatórios some quando o link não
  trouxe uma, com o aviso que explica o porquê.

## Exportação em PDF (Etapa 11)

As mesmas quatro telas, com um botão **Baixar PDF** no cabeçalho, ao lado do link
que leva ao outro relatório. A rota é a do JSON com `.pdf` no fim
(`/alunos/:id/relatorio-individual.pdf`, `/grupos/:id/relatorio.pdf`, …), e a
resposta é entregue como `blob`, não como o JSON que a tela já sabia ler.

**O botão não pergunta se a competição acabou.** A API gera o PDF parcial e
carimba nele que o resultado é parcial (RN32, `README-API.md` 11.13); reimplementar
essa regra na tela criaria um segundo lugar onde a decisão pode divergir da
gravada no servidor — e o pior desfecho seria recusar um PDF que a API entregaria
de bom grado.

**O nome do arquivo é montado no front, e o `Content-Disposition` quando vier.**
A API promete `Content-Type: application/pdf` e o nome `relatorio-*.pdf`, mas não
promete o cabeçalho que diz o nome — e sem ele o navegador salva o arquivo como
`download`. Então o nome nasce do relatório que já está na tela:
`<prefixo-da-rota>-<nome-achatado>.pdf`, que dá
`relatorio-individual-joao-da-silva.pdf` e `relatorio-equipe-alfa.pdf`. O prefixo
é o mesmo segmento da rota (o coletivo do grupo é `relatorio`, o comparativo é
`relatorio-comparativo`), o que faz o nome dizer, sem abrir, qual relatório é. O
achatamento tira acento, troca separador por hífen e troca `º`/`ª` por `o`/`a` —
`Turma 2ª` sai `turma-2a`, e não `turma-2ª` depois de um comentário que prometeu
tirar acento. Quando a API mandar `Content-Disposition` (nos dois formatos,
`filename` e `filename*`), ele tem precedência: é a fonte que o servidor controla.

**Duas conferências que evitam o arquivo que existe e não é o relatório.** Um `200`
nem sempre é o que parece: um proxy ou um portal de captive no caminho da API
devolve a própria página de erro em HTML, com status 200, e o axios não teria como
desconfiar. Salvar esse HTML como `.pdf` daria ao professor um arquivo que abre e
não é relatório. Então a chamada recusa um `Content-Type` que não seja
`application/pdf` e um corpo vazio — e o `403` de escopo sai com a mesma frase
amigável dos relatórios em JSON, porque o PDF respeita exatamente as mesmas regras
de acesso.

**O `Content-Type` faz o erro da API chegar como blob.** Com `responseType: 'blob'`,
a resposta de erro também vem como `Blob`, e não como o JSON que `mensagemDeErro`
sabe ler: sem ler o corpo, todo erro viraria o mesmo "Request failed with status
code 500", que é o axios falando e não o servidor. `mensagemDoErroDoPdf` por isso
é **assíncrona** — é o único `await` no caminho do erro.

Três outras decisões que valem saber antes de mexer:

- **`relatorios.pdf.ts` é um módulo puro**, sem JSX e sem axios, com a rota, o nome
  e o `dispararDownload`. É ele que permite testar a regra do nome do arquivo sem
  navegador, e é ele que impede a tela de conhecer `Content-Disposition`.
- **O `dispararDownload` cria um `<a>`, clica e apaga**, e revoga a URL de objeto no
  `finally` — inclusive quando o clique não chega ao navegador. Não existe
  `window.download`; a URL de objeto segura o PDF inteiro na memória enquanto
  ninguém a revogar.
- **O `timeout` do PDF é 60 s, e só ele.** Os 15 s globais foram calibrados para o
  JSON; o PDF é montado no servidor, com gráficos e tabelas, e estourar o tempo
  devolveria um timeout quando a resposta estava a caminho.

### Limites da API que moldam a tela

- **O `Content-Disposition` é opcional, e talvez não chegue.** Nada na documentação
  garante o cabeçalho de nome, e é por isso que o nome é sempre montado no front (o
  cabeçalho, quando vier, só substitui esse nome). Some a isso a regra do CORS: a
  interface roda em `:5173` e a API em `:3000`, e **`Content-Disposition` não é um
  cabeçalho liberado por padrão** — sem
  `Access-Control-Expose-Headers: Content-Disposition` na resposta, o navegador
  simplesmente não deixa o JavaScript lê-lo, mesmo que a API o mande. O
  `Content-Type`, ao contrário, é liberado, e é por isso que a conferência do PDF
  funciona de qualquer jeito. Ou seja: o caminho que funciona sempre é o nome
  montado; o do cabeçalho é o bônus, se a API decidir liberá-lo.
- **O `competicaoId` do download sai do relatório carregado, não da URL.** A rota
  da tela nem sempre o traz — ele é opcional na API —, mas o relatório que já
  carregou sabe qual competição é esta, e sem mandá-lo a API devolve 400 quando o
  aluno participa de mais de uma. Nos relatórios de grupo nada é mandado, porque a
  rota não tem o parâmetro.
- **A formatação do PDF é responsabilidade da API.** Nenhuma regra de layout, de
  página ou de carimbo de parcialidade foi reimplementada aqui: a interface consome
  e baixa o arquivo.

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
| `src/test/handlers.ts`         | fábricas de handler por cenário, de autenticação a rankings |
| `src/test/render.tsx`          | renderiza com `ToastProvider`, `AuthProvider` e `MemoryRouter` |
| `src/test/download.ts`         | espiona o download, porque o jsdom não o implementa — a Etapa 11 |

Três pontos que valem saber antes de escrever o próximo teste:

- **A sessão precisa ser limpa entre os testes.** `src/lib/sessao.ts` guarda o
  token numa variável de módulo, que sobrevive de um teste para o outro no mesmo
  arquivo. O `beforeEach` do `setup.ts` faz isso; um teste que grava sessão e
  esquece de limpar derruba o seguinte.
- **Uma requisição sem handler é erro, não papel.** O msw está com
  `onUnhandledRequest: 'error'`, para o teste que esqueceu de mockar a API
  falhar em vez de passar por uma resposta vazia.
- **`URL.createObjectURL` não existe no jsdom, e o clique de um `<a>` com `href`
  faz o jsdom imprimir "Not implemented: navigation".** Um teste que vai até o
  fim da cadeia do download — resposta em blob, URL de objeto, link, clique —
  precisa do `espiarNoDownload()` de `src/test/download.ts`, que troca os três por
  espiões e devolve `baixados` com o nome e o blob de cada arquivo entregue ao
  navegador. Chame o `restaurar()` no `afterEach`: os espiões são globais.

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
  components/  componentes reutilizáveis (Button, Card, Table, Field, Modal, Toast)
  features/    uma pasta por domínio
    auth/      telas de login e troca de senha, contexto de sessão, rotas
    salas/     listagem, detalhe, inscrição e alunos — a Etapa 03
    competicoes/ competição, bimestres, grupos, componentes, lançamentos e
                prévia de síntese — as Etapas 04, 05 e 06
    rankings/  tipos, chamadas e componentes dos três rankings — a Etapa 08
    relatorios/ as quatro telas de relatório, o gráfico e a central de links — as Etapas 10 e 11
    aluno/     dashboard do aluno (`/aluno`), sobre os rankings — a Etapa 08
  lib/         cliente HTTP, guarda da sessão, fórmulas de síntese e utilitários
  styles/      tokens de design e estilos globais
  test/        base dos testes: msw, setup, espião de download e utilitários de render
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

A Etapa 06 não traz componente novo: ela reaproveita o `Table` nas duas pontas (a
coluna de prévia na tabela de lançamentos e as duas tabelas do painel) e o `Badge`
no contador de integrantes do grupo. O que ela acrescenta é
`src/lib/sinteseCalculo.ts` — a cópia das fórmulas do backend, que fica em `lib`
justamente para não depender de feature, porque a conta é a mesma em dois lugares
e nenhuma delas é dona dela.

A Etapa 08 acende a aba de rankings que estava desabilitada e cria a feature
`aluno/`, que aposenta a pasta `app/pages/` e a rota `/em-breve`. `rankings/`
nasce como feature própria porque a tabela é a mesma para os dois perfis: o
professor a vê em três sub-visões na competição, e o aluno, em seções no
dashboard. O `Table` continua sendo a grade, agora com esqueleto de carga também
na primeira leitura do ranking.

A Etapa 10 cria `relatorios/` com as quatro telas e não traz componente novo de
interface: o `Table` reaparece nas tabelas de matérias e de integrantes, o `Card`
nos blocos de resultado e o `Badge` na escala de cada bloco. O que é novo é o
`GraficoDeSintese`, que embrulha o `recharts` e entrega legenda e tabela `sr-only`
para o gráfico — de modo que nenhuma tela do projeto precisa conhecer a lib.

A Etapa 11 fecha a rodada sem trazer componente novo de interface também: o
`BaixarPdf` é o `Button` com `loading` e `loadingText` — os dois que a Etapa 03
já usava no formulário de sala e a Etapa 07 no encerramento do bimestre — mais o
toast. O que ela acrescenta são dois módulos: `relatorios.pdf.ts`, que é puro e
detém a rota `.pdf`, o nome do arquivo e o `dispararDownload`, e o
`src/test/download.ts`, que resolve a lacuna do jsdom para os testes de download.
Ela também conserta um tipo da Etapa 10 que só a nova etapa usou: `TipoDeRelatorio`
tinha só dois dos quatro `tipo`, o que faria o mapa de rota do PDF recusar duas das
quatro telas em tempo de compilação.
