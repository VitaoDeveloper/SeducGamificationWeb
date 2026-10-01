# Diagnóstico — formulário de criação de sala não oferece as escolas vinculadas

**Data:** 2026-10-01 (após a Etapa 08)
**Onde:** interface (`SeducGamificationWeb`) + API (`SeducGamification`)
**Estado:** **resolvido.** `GET /escolas` existe na API e a interface consome.
**Severidade (quando aberto):** bloqueava o primeiro uso do sistema por qualquer
professor que ainda não tivesse sala.

---

## 1. O sintoma

Professor autenticado, com vínculo válido com **duas instituições** no banco. Ao abrir
"Nova sala", o formulário respondia que ele não estava vinculado a nada e **desabilitava o
botão "Criar sala"**:

> Nenhuma escola aparece para você ainda. O vínculo entre professor e escola é feito pelo
> mantenedor, direto no banco de dados — sem ele a API recusa a criação da sala.

O vínculo existia e estava correto. A mensagem estava errada, e a tela impedia a criação.

---

## 2. Causa raiz

**A lista de escolas do formulário não vinha da API: era deduzida das salas já existentes.**

O encadeamento era este:

```
NovaSalaForm (escolas={...})                    src/features/salas/NovaSalaForm.tsx:10
  ↑
SalasListPage — deduzia as escolas dos grupos   src/features/salas/SalasListPage.tsx:32
  ↑
useSalasAgrupadasPorEscola — agrupava por escola   src/features/salas/salas.hooks.ts:54
  ↑
useSalasDoProfessor                             src/features/salas/salas.hooks.ts:28
  ↑
GET /salas                                      src/features/salas/salas.api.ts:13
```

`GET /salas` devolve **salas**, e cada sala traz `escola: { id, nome }` embutida. Na API,
`SalasService.listarDoProfessor` filtra apenas por escola:

```ts
const vinculos = await this.prisma.vinculoProfessor.findMany({ where: { professorId } })
const escolasIds = [...new Set(vinculos.map((v) => v.escolaId))]
return this.prisma.sala.findMany({ where: { escolaId: { in: escolasIds } }, /* ... */ })
```

Uma escola só entrava na lista do formulário se **já existisse ao menos uma sala naquela
escola**. Com vínculo em duas escolas e **zero salas**, a resposta era `[]` → a lista de
escolas vazia → o formulário mostrava o aviso e travava o botão (`NovaSalaForm.tsx:108` e
`:172`).

### Por que isso é um beco sem saída

O `POST /salas` exige `escolaId` (`README-API.md:398`), e a API valida que o professor está
vinculado à escola (`README-API.md:401`). Mas a única fonte de `escolaId` que a interface
tinha era `GET /salas` — que estava vazia. **O professor era impedido de criar a primeira
sala porque ainda não existia nenhuma sala.**

A schools lista também era usada como trava de envio (`NovaSalaForm.tsx:73`): sem escola
escolhida, nem o `POST` era tentado.

### Agravante: a mensagem estava factualmente errada

O texto culpava o vínculo ("sem ele a API recusa a criação"), sugerindo que o cadastro
estava incompleto. O vínculo existia. Quem lia a tela era levado a procurar um problema
que não tem — e a pista real (faltam salas, não vínculos) não aparecia em lugar nenhum.

---

## 3. Evidência coletada

### O que a API não tinha

Nenhum controller expunha rota com "escola" no caminho — `salas`, `alunos`,
`lecionamentos`, `competicoes`, `grupos`, `bimestres`, `componentes-pontuacao`,
`lancamentos`, `desempate`, `rankings`, `relatorios`, `relatorios-pdf`. Não havia módulo
`escola` em `src/modules/`. Só existia `prisma/seed.ts` e o serviço compartilhado
`acesso-escolar.util.ts`.

Verificado também no deploy (`https://seduc-gamification.vercel.app/`): todos os caminhos
candidatos devolviam `404`, e o controle `/xyz` → `404` confirmava que o código significa
"rota não existe".

`README-API.md:59` confirma por escrito: *"o cadastro de escolas, modelos de avaliação,
professores e vínculos professor–escola é feito pelo **mantenedor, direto no banco de
dados** — não há GUI nem endpoint para isso."*

### Correção de um erro da versão anterior deste documento

A primeira redação dizia: *"Só o(seed) … desbloqueia."* **Isso é falso, e era a causa
raiz do problema em ambiente novo.** `prisma/seed.ts:72-114` cria um `ModeloAvaliacao`, uma
`Escola`, um `Professor` e um `VinculoProfessor` — e **nenhuma `Sala`**. Depois da linha 114
só há `console.log`. Como `GET /salas` devolve vazio justamente quando não há sala, todo
ambiente recém-semeado nascia travado.

### Limite conhecido, registrado antes

O `README.md` já registrava isto, em "Limites da API que moldam a tela" — mas descrevia a
consequência errada: *"o formulário diz isso em vez de mostrar um select vazio"*. O
comportamento era **intencional e testado** (`NovaSalaForm.spec.tsx` cobria o aviso e o botão
desabilitado). O que faltou foi perceber que o efeito não era uma tela vazia e honesta: era
um travamento que impedia o primeiro uso do sistema.

---

## 4. Por que não dava para resolver só no front

Sem endpoint que liste as escolas vinculadas, a interface não tinha como obter **um único
UUID de escola** para mandar no `POST /salas`. As alternativas na interface eram todas
inviáveis:

- **Campo de texto para o professor digitar o UUID** — o UUID existe no banco, mas o
  mantenedor é quem o conhece; o professor não tem como saber.
- **Chutar ids** — os ids são UUID. Não é adivinhável.
- **Criar a sala sem escola e corrigir depois** — o `POST` valida `escolaId` e o vínculo
  (`README-API.md:401`); a chamada é recusada.
- **Criar uma sala "semente" automaticamente** — a interface não tem como criar a sala que
  precisa existir para destravar a si mesma.
- **Fallback com dedução sobre `GET /salas`** — foi descartado: só existe durante a janela
  entre deploy da API e do front, e como o msw e o `onUnhandledRequest` resolvem pela
  primeira rota que casa, manter as duas fontes na tela só adicionaria uma superfície de
  teste para um problema que a API resolve de vez.

A correção precisava ser do lado da API.

---

## 5. O que foi feito

### 5.1 Na API — `GET /escolas`

Novo módulo `src/modules/escolas/`, seguindo o mesmo desenho dos outros recursos
(`SalasModule` como modelo):

```
src/modules/escolas/
  escolas.controller.ts   @Controller('escolas') + @UseGuards(AuthGuard)
  escolas.service.ts      consulta a tabela de vínculos
  escolas.module.ts
```

Devolve **apenas as escolas vinculadas ao professor autenticado** — o mesmo recorte de
segurança que `GET /salas` já aplica (RN27: um professor pode atuar em mais de uma escola):

```json
[{ "id": "uuid", "nome": "Escola Estadual de Exemplo" }]
```

A consulta sai da tabela `vinculos_professores`, e não de `salas`:

```ts
const vinculos = await this.prisma.vinculoProfessor.findMany({
  where: { professorId: professor.id },
  select: { escola: { select: { id: true, nome: true } } },
  orderBy: { escola: { nome: 'asc' } },
})
return vinculos.map((vinculo) => vinculo.escola)
```

O vínculo tem chave primária composta `(professorId, escolaId)`, então a lista já vem sem
repetição. A ordem por nome é de interface: é a ordem em que o professor reconhece as
instituições, e nenhuma outra propriedade distingue uma da outra.

**Segurança.** Não existe `APP_GUARD` global na API — `AuthGuard` é aplicado por controller.
Sem `@UseGuards(AuthGuard)` no `@Controller('escolas')`, a rota vira pública e expõe o
cadastro de escolas a chamada anônima. O `exigirProfessor` no service devolve `403` para o
perfil de aluno, como nas demais rotas de professor.

Isso não amplia exposição alguma: o professor só vê as escolas em que **já** está
vinculado, que é a mesma informação que o `POST /salas` valida.

### 5.2 No front — quatro arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/features/salas/salas.api.ts` | nova função `listarEscolas()` chamando `GET /escolas` |
| `src/features/salas/salas.hooks.ts` | hook `useEscolasVinculadas()` sobre `useRequisicao` |
| `src/features/salas/SalasListPage.tsx` | `escolas` passa a vir do hook, e não da dedução sobre `grupos` |
| `src/test/handlers.ts` | fábrica `escolasVinculadas([...])` para os testes |

A dedução sobre `grupos` foi removida de `SalasListPage`. A falha das escolas passou a
derrubar a página com o botão "Tentar de novo", junto com a das salas — sem elas o
formulário não abre, e um erro silencioso seria um botão morto com outra mensagem errada.

O formulário também só abre **depois** que `GET /escolas` respondeu. Sem essa trava, clicar
em "Nova sala" durante a leitura abriria o formulário com a lista ainda vazia e repetiria a
mensagem falsa — o vínculo existiria, a resposta é que não havia chegado. É a mesma
armadilha do diagnóstico original, em outra janela de tempo.

### 5.3 Correção da mensagem

O texto passou a dizer a verdade sobre o único caso em que a criação é mesmo impossível:

> Nenhuma escola está vinculada ao seu usuário. O vínculo entre professor e escola é feito
> pelo mantenedor, direto no banco de dados — sem ele a API recusa a criação da sala.

Lista vazia agora significa uma coisa só: a API respondeu `GET /escolas` sem nenhuma. O botão
continua desabilitado nesse caso, porque sem `escolaId` o `POST /salas` não tem o que
mandar.

> **Proposta 6.3 da versão anterior deste documento — "habilitar o botão e deixar a API
> recusar" — foi descartada por ser tecnicamente errada.** Com `escolas = []`,
> `NovaSalaForm.tsx:88` avalia `(escolas[0] as EscolaResumo).id` e lança `TypeError` dentro do
> `try`. O `catch` chama `mensagemDeErro(TypeError, ...)`, que retorna a alternativa
> genérica ("Não foi possível criar a sala. Tente de novo."). **A requisição nunca sairia do
> browser** — o professor leria uma mensagem de falha de rede, que é pior que o estado
> anterior, porque esconde a causa.

---

## 6. Como confirmar a correção

1. `GET /escolas` na API devolve as escolas vinculadas do professor autenticado.
2. Professor com vínculo e **nenhuma sala** abre "Nova sala" e vê o campo **Escola** com as
   opções da API — o campo não aparecia antes, porque só aparece com mais de uma.
3. Criar a sala em uma delas funciona e a lista passa a agrupá-la.
4. Professor sem nenhum vínculo vê o aviso novo, com o botão desabilitado.
5. `npm run test` e `npm run lint` passam no front; `pnpm test:e2e` e `pnpm lint` passam na
   API.

Cobertura dos testes novos:

- **API** (`test/escolas.e2e-spec.ts`) — vínculo único, dois vínculos sem repetir, professor
  sem vínculo (lista vazia), escola sem nenhuma sala (o caso que travava), `403` para aluno,
  `401` sem token.
- **Front** (`SalasListPage.spec.tsx`) — oferece as escolas vinculadas sem nenhuma sala
  cadastrada (envia `escolaId`), mostra o select com mais de uma escola, não afirma "nenhuma
  escola vinculada" enquanto `GET /escolas` está em voo, e trata a falha da rota com alerta e
  nova tentativa.

---

## 7. Rastreabilidade

### Interface

- `src/features/salas/SalasListPage.tsx` — a dedução que causava o travamento foi removida; as
  escolas vêm de `useEscolasVinculadas`.
- `src/features/salas/salas.hooks.ts` — `useEscolasVinculadas`; `useSalasAgrupadasPorEscola`.
- `src/features/salas/salas.api.ts` — `listarEscolas()` (`GET /escolas`); `listarSalas()`
  (`GET /salas`).
- `src/features/salas/NovaSalaForm.tsx` — o aviso e o botão condicionado a `semEscolas`.
- `src/test/handlers.ts` — `escolasVinculadas()`, `salasDoProfessor()`, `semSalas()`,
  `salasSemHandlerDeEscolas()`.

### API

- `src/modules/escolas/escolas.controller.ts` — `@Controller('escolas')` + `@UseGuards(AuthGuard)`.
- `src/modules/escolas/escolas.service.ts` — consulta a `vinculos_professores`.
- `src/modules/escolas/escolas.module.ts` — registrado em `src/app.module.ts:37`.
- `test/escolas.e2e-spec.ts` — os seis casos acima.
- `prisma/schema.prisma:84-92` — `model VinculoProfessor`, chave composta
  `(professorId, escolaId)`.
- `prisma/seed.ts:72-114` — cria escola, professor e vínculo, e nenhuma sala.

### Contrato

- `README-API.md:398, 401` — `POST /salas` exige `escolaId` e professor vinculado.
- `README-API.md:207` — RN27, professor pode atuar em mais de uma escola.
- `README-API.md:216` — professores só acessam recursos das escolas vinculadas (`403`/`404`).
- `src/modules/shared/acesso-escolar.util.ts:15-31` — `exigirVinculoProfessorEscola`, o mesmo
  recorte que a nova rota aplica.
