# Diagnóstico — formulário de criação de sala não oferece as escolas vinculadas

**Data:** 2026-10-01 (após a Etapa 08)
**Onde:** interface (`SeducGamificationWeb`) + API (`https://seduc-gamification.vercel.app/`)
**Estado:** **aberto — bloqueado por falta de rota na API.** Nada foi alterado no código até aqui.
**Severidade:** bloqueia o primeiro uso do sistema por qualquer professor que ainda não tenha sala.

---

## 1. O sintoma

Professor autenticado, com vínculo válido com **duas instituições** no banco. Ao abrir
"Nova sala", o formulário responde que ele não está vinculado a nada e **desabilita o
botão "Criar sala"**:

> Nenhuma escola aparece para você ainda. O vínculo entre professor e escola é feito pelo
> mantenedor, direto no banco de dados — sem ele a API recusa a criação da sala.

O vínculo existe e está correto. A mensagem está errada, e a tela impede a criação.

---

## 2. Causa raiz

**A lista de escolas do formulário não vem da API: é deduzida das salas já existentes.**

O encadeamento é este:

```
NovaSalaForm (escolas={...})                    src/features/salas/NovaSalaForm.tsx:10
  ↑
SalasListPage — deduz as escolas dos grupos     src/features/salas/SalasListPage.tsx:32
  ↑
useSalasAgrupadasPorEscola — agrupa por escola   src/features/salas/salas.hooks.ts:54
  ↑
useSalasDoProfessor                             src/features/salas/salas.hooks.ts:28
  ↑
GET /salas                                      src/features/salas/salas.api.ts:13
```

`GET /salas` devolve **salas**, e cada sala traz `escola: { id, nome }` embutida. Uma
escola só entra na lista do formulário se **já existir ao menos uma sala naquela escola**.

Com vínculo em duas escolas e **zero salas**, a resposta é `[]` → a lista de escolas é
vazia → o formulário mostra o aviso e trava o botão (`NovaSalaForm.tsx:108` e `:172`).

### Por que isso é um beco sem saída

O `POST /salas` exige `escolaId` (`README-API.md:398`), e a API valida que o professor
está vinculado à escola (`README-API.md:401`). Mas a única fonte de `escolaId` que a
interface tem é `GET /salas` — que está vazia. **O professor está impedido de criar a
primeira sala porque ainda não existe nenhuma sala.** Só o(seed) ou uma sala criada por
outro professor da mesma escola desbloqueia.

A school lista também é usada como trava de envio (`NovaSalaForm.tsx:73`): sem escola
escolhida, nem o `POST` é tentado.

### Agravante: a mensagem está factualmente errada

O texto culpa o vínculo ("sem ele a API recusa a criação"), sugerindo que o cadastro
está incompleto. O vínculo existe. Quem lê a tela é levado a procurar um problema que
não tem — e a pista real (faltam salas, não vínculos) não aparece em lugar nenhum.

---

## 3. Evidência coletada na API

Verificado contra o deploy em `https://seduc-gamification.vercel.app/`.

### Rotas que existem (401 = existe, barrada pela guarda de auth)

| Rota | Código | Interpretação |
| --- | --- | --- |
| `GET /salas` | `401` | Existe |
| `GET /salas/x/lecionamentos` | `401` | Existe |
| `GET /auth/me` | `401` | Existe |
| `GET /` | `200` — `Hello World!` | Health check |

### Rotas que não existem (404 = rota inexistente)

| Rota | Código |
| --- | --- |
| `GET /escolas` | `404` |
| `GET /escolas/` | `404` |
| `GET /salas/escolas` | `404` |
| `GET /professor/vinculos` | `404` |
| `GET /escolas/vinculadas` | `404` |
| `GET /escolas/minhas` | `404` |
| `GET /auth/escolas` | `404` |
| `GET /me/escolas` | `404` |
| `GET /vinculos` | `404` |
| `GET /professores` | `404` |
| `GET /escolas/:id` | `404` |
| `GET /xyz` (controle) | `404` |

**O `404` é confiável aqui.** A API em deploy é a real, não o placeholder que o
`README.md` descrevia: `POST /auth/login` responde `401` com o corpo do NestJS
(`{"message":"Código de matrícula ou senha inválidos.","error":"Unauthorized","statusCode":401}`)
e `GET /auth/me` responde `"Token de autenticação ausente."` — são as duas respostas de
uma API autenticada funcionando. O controle `/xyz` → `404` confirma que 404 significa
"rota não existe", e não "algo redirecionado".

`README-API.md:59` confirma por escrito: *"o cadastro de escolas, modelos de avaliação,
professores e vínculos professor–escola é feito pelo **mantenedor, direto no banco de
dados** — não há GUI nem endpoint para isso."*

---

## 4. Limite conhecido, registrado antes — e por que a nota anterior não bastava

O `README.md:97-100` já registrava isto, na seção "Limites da API que moldam a tela":

> **Não existe `GET /escolas` nem vínculo de escolas do professor.** As escolas oferecidas
> no formulário de nova sala são deduplicadas de `GET /salas`; um professor sem nenhuma
> sala não tem de onde escolher escola, e o formulário diz isso em vez de mostrar um
> select vazio.

A limitação estava documentada e o comportamento era **intencional e testado** — a
`NovaSalaForm.spec.tsx` cobria o aviso e o botão desabilitado. O que faltou foi perceber
que o efeito é o oposto de "uma tela vazia e honesta": **é um travamento que impede o
primeiro uso do sistema**. A nota descrevia a consequência errada. A Etapa 08 não
causou o problema, mas foi quando ele apareceu para alguém de verdade.

---

## 5. Por que não dá para resolver só no front

Sem endpoint que liste as escolas vinculadas, a interface não tem como obter **um único
UUID de escola** para mandar no `POST /salas`. As alternativas na interface são todas
inviáveis:

- **Campo de texto para o professor digitar o UUID** — o UUID existe no banco, mas o
  mantenedor é quem o conhece; o professor não tem como saber. Transforma um problema de
  back-end em trabalho manual do usuário.
- **Chutar ids sequenciais** — os ids são UUID. Não é adivinhável.
- **Criar a sala sem escola e corrigir depois** — o `POST` valida `escolaId` e o vínculo
  (`README-API.md:401`); a chamada é recusada.
- **Criar uma sala "semente" automaticamente** — a interface não tem como criar a sala
  que precisa existir para destravar a si mesma.

A correção é do lado da API.

---

## 6. Proposta de correção

### 6.1 Na API — uma rota nova

```
GET /escolas
```

Devolve **apenas as escolas vinculadas ao professor autenticado** — o mesmo recorte de
segurança que `GET /salas` já aplica (RN27: um professor pode atuar em mais de uma
escola). Resposta no mesmo formato reduzido que `GET /salas` já usa para `escola`:

```json
[{ "id": "uuid", "nome": "Escola Estadual de Exemplo" }]
```

Sem paginação: o universo é o número de vínculos do professor, da ordem de unidades.

Isso destrava o professor sem ampliar a exposição de nada — ele só vê as escolas em que
**já** está vinculado, que é a mesma informação que `POST /salas` valida.

### 6.2 No front — quatro arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/features/salas/salas.api.ts` | nova função `listarEscolas()` chamando `GET /escolas` |
| `src/features/salas/salas.hooks.ts` | hook `useEscolasVinculadas()` sobre `useRequisicao` |
| `src/features/salas/SalasListPage.tsx` | `escolas` passa a vir do hook, e não da dedução sobre `grupos` |
| `src/test/handlers.ts` | fábrica `escolasVinculadas([...])` para os testes |

**Fallback enquanto a rota não existe na API:** manter a dedução atual como plano B
(`grupos` → escolas deduplicadas) faz a tela continuar funcionando como hoje em
ambientes com API antiga, e passar a usar `GET /escolas` quando ela responder 200. A
troca só acontece se a chamada **não** falhar — assim um erro de rede não apaga as
escolas que a dedução já tinha acertado.

### 6.3 Correção da mensagem (independe do endpoint)

O texto atual culpa o vínculo. Passa a dizer a verdade nos dois casos:

- **Com escolas vindas da API e nenhuma disponível** → "Nenhuma escola vinculada ao seu
  usuário. O vínculo é feito pelo mantenedor, direto no banco."
- **Com a dedução e nenhuma sala** → "Você ainda não tem salas em nenhuma escola. Crie a
  primeira sala aqui para se inscrever." — e o botão **habilitado**, porque essa é a
  única forma de sair do beco.

Enquanto `GET /escolas` não existir na API, é esse segundo texto e o botão habilitado
que resolvem o travamento do professor: ele informa nome e ano, envia, e o `POST` é
recusado pela API **com a mensagem verdadeira** sobre o vínculo — que é a resposta certa,
mesmo que o UUID siga unknowable. Melhor um erro honesto da API que um botão morto com
diagnóstico errado.

> **Alcance real de 6.3.** Habilitar o botão sem `escolaId` conhecido **não** faz a sala
> ser criada: o envio precisa do UUID, que só 6.1 fornece. O ganho de 6.3 é mais estreito —
> tirar o diagnóstico falso da tela e deixar a recusa real da API aparecer no lugar, com o
> botão util. A saída completa é 6.1.

---

## 7. Como confirmar a correção

1. `GET /escolas` na API devolve as duas escolas do professor.
2. Abrir "Nova sala" mostra o campo **Escola** com as duas opções (hoje o campo nem
   aparece, porque só aparece com mais de uma).
3. Criar a sala em uma delas funciona e a lista passa a agrupá-la.
4. `npm run test` passa, incluindo o caso "sem escola vinculada" e o "escolas vindas da
   API, não da dedução".

---

## 8. Rastreabilidade

- `README-API.md:59` — schools/vínculos sem endpoint (fonte da regra atual).
- `README-API.md:398, 401` — `POST /salas` exige `escolaId` e professor vinculado.
- `README-API.md:207` — RN27, professor pode atuar em mais de uma escola.
- `README-API.md:216` — professores só acessam recursos das escolas vinculadas (`403`/`404`).
- `README.md:97-100` — a limitação registrada, com a consequência descrita de forma incompleta.
- `src/features/salas/SalasListPage.tsx:32` — a dedução que causa o travamento.
- `src/features/salas/NovaSalaForm.tsx:108, 172` — o aviso e o botão desabilitado.
- `src/features/salas/salas.hooks.ts:54` — `useSalasAgrupadasPorEscola`.
- `src/features/salas/salas.api.ts:13` — `GET /salas`, única fonte de `escola` no front.
