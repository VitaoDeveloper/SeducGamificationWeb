# Diagnóstico técnico — exportação em PDF (Etapa 11)

**Data:** 2 de outubro de 2026
**Escopo:** o que foi implementado na Etapa 11 (botão "Baixar PDF" nas quatro telas de relatório) e o que a implementação deixa exposto.
**Commits:** `c5fa455` (`TipoDeRelatorio`) e `3e11684` (Etapa 11).
**Estado da suíte no momento do diagnóstico:** `npx tsc -b`, `npx oxlint` e `pnpm build` limpos; `pnpm test` com 39 arquivos e 317 testes passando.

Este documento **não propõe correções**. Cada item registra o mecanismo, a evidência e a consequência observável, para que a decisão sobre o que fazer saia de quem decide.

## Como ler

| Marca | Significado |
|---|---|
| **defeito** | comportamento errado hoje |
| **risco** | pode falhar em ambiente que os testes não alcançam |
| **limitação** | comportamento aceitável, com consequência a registrar |
| **lacuna** | sem cobertura de teste, ou critério de aceite ainda não verificado |

## Resumo

| # | Ponto | Marca | Onde |
|---|---|---|---|
| 1 | O `Content-Disposition` é inalcançável no navegador hoje | limitação | `relatorios.api.ts:182` |
| 2 | O slug deixa passar caractere não-ASCII, e o comentário promete o contrário | defeito | `relatorios.pdf.ts:146` |
| 3 | Nome do cabeçalho entra cru; nome montado entra achatado | risco | `relatorios.pdf.ts:61` |
| 4 | O nome montado não tem limite de tamanho | risco | `relatorios.pdf.ts:138` |
| 5 | O PDF inteiro fica em memória, sem progresso e sem streaming | limitação | `relatorios.api.ts:157` |
| 6 | A revogação da URL de objeto é síncrona, no mesmo instante do clique | risco | `relatorios.pdf.ts:173` |
| 7 | O `await` antes do clique consome a ativação do usuário | risco | `BaixarPdf.tsx:51` |
| 8 | Spinner branco em botão `outline` | defeito (pré-existente) | `Button.tsx:75` |
| 9 | O botão perde o foco do teclado enquanto gera | defeito | `Button.tsx:60` |
| 10 | O bloco de ação do cabeçalho não quebra linha | risco | `PageHeader.tsx:31` |
| 11 | `conferirQueEhPdf` tem dois pontos cegos | limitação | `relatorios.api.ts:206` |
| 12 | Cobertura de rotas: 3 de 4 endpoints, 1 de 4 telas | lacuna | `BaixarPdf.spec.tsx` |
| 13 | Critério de aceite nº 1 segue não verificado; o fixture não é um PDF abrível | lacuna | `handlers.ts:1004` |
| 14 | Efeitos colaterais do `responseType: 'blob'` e do `timeout` maior | risco | `relatorios.api.ts:131` |
| 15 | `TipoDeRelatorio`: o que era e o que a correção passa a garantir | correção | `relatorios.tipos.ts:212` |

---

## 1. O `Content-Disposition` é inalcançável no navegador hoje

**Limitação, com consequência maior do que parece.**

O caminho `nomeDoArquivoNaDisposicao` existe, tem quatro testes passando e, no navegador, nunca será exercido — a não ser que a API mude.

Cadeia de fatos, toda verificada:

- **Não há proxy no Vite** (`vite.config.ts:8-15`): o bloco `server` declara `port` e `strictPort`, e nenhuma chave `proxy`. O dev server não encaminha requisição nenhuma para a API. A origem da interface é `http://localhost:5173` e a da API é `http://localhost:3000` (`src/lib/api.ts:4`). Ou seja, **é cross-origin também no desenvolvimento**, não só em produção.
- O próprio `vite.config.ts:9-12` registra que "a API libera CORS apenas para http://localhost:5173". Existe, portanto, configuração de CORS na API — o que ela libera é a origem, não o cabeçalho `Content-Disposition` da resposta.
- `src/lib/api.ts:50` envia `Authorization: Bearer`, e `src/lib/api.ts:44` põe `Content-Type: application/json` num GET. Os dois headers estão fora da lista segura do CORS, o que já obriga preflight — mas esse é o menor dos pontos. O que importa é o que o navegador **devolve**.
- Os response headers liberados por padrão pelo CORS são `Cache-Control`, `Content-Language`, `Content-Length`, `Content-Type`, `Expires`, `Last-Modified` e `Pragma`. **`Content-Disposition` não está na lista.** Sem `Access-Control-Expose-Headers: Content-Disposition` na resposta, `getAllResponseHeaders()` não o expõe, o axios não o enxerga, e `headers['content-disposition']` é `undefined`.
- `relatorios.api.ts:182` trata isso: `?? null`, que cai no nome montado. O comportamento em produção é o desejado — **o nome montado é o caminho real, e hoje é o único caminho**.
- `README-API.md:661` diz apenas "Os PDFs são baixados com `Content-Type: application/pdf` e nome `relatorio-*.pdf`". Não menciona `Content-Disposition` em lugar nenhum.
- A tarefa 5 do plano (`docs/11-etapa-exportacao-pdf.md:17`) diz "lido do header `Content-Disposition` da resposta **se a API o fornecer**". A condição é mais dura do que a frase sugere: não basta a API fornecer, é preciso a API **expor**.

**Consequência para a revisão.** O teste `usa o nome do arquivo que a API mandar no Content-Disposition` (`BaixarPdf.spec.tsx:117`) **passa por um caminho que o navegador não percorre**. O msw roda em Node, onde não existe CORS, então entrega o cabeçalho de verdade e o código o lê. O teste atesta uma capacidade que depende de um cabeçalho que hoje não existe em nenhuma camada deste projeto. O teste não está errado — é a documentação de um futuro.

---

## 2. O slug deixa passar caractere não-ASCII, e o comentário do módulo diz o contrário

**Defeito de documentação, com comportamento real por trás.**

`relatorios.pdf.ts:129-137` promete nome "achatado... sem acento", e `relatorios.pdf.ts:119-122` justifica a troca de `º`/`ª` com o argumento de que, sem ela, "o arquivo sairia com caractere não-ASCII depois de o comentário dizer que não sairia".

Mas `achatar` termina em `.replace(/[^\p{Letter}\p{Number}]+/gu, '-')` (`relatorios.pdf.ts:146`), e `\p{Letter}` casa **letras Unicode de todos os alfabetos**. A função remove pontuação; ela não remove escrita.

Medido com a função exata do arquivo:

| Entrada | Saída | ASCII? |
|---|---|---|
| `São Paulo` | `sao-paulo` | sim |
| `José 2ª Série` | `jose-2a-serie` | sim |
| `Ångela` | `angela` | sim |
| `İstanbul` | `istanbul` | sim |
| `Søren` | `søren` | **não** |
| `Głów` | `głów` | **não** |
| `ßeta` | `ßeta` | **não** |
| `杭锦队` | `杭锦队` | **não** |

**Quatro de dez** nomes realistas saem não-ASCII.

A causa é dupla. `NFD` + `\p{Diacritic}` só remove o que tem decomposição canônica, e `ø` (U+00F8), `ł` (U+0142), `đ`, `æ` e `ß` não têm. E `\p{Letter}` preserva CJK e cirílico intactos — que é exatamente o conteúdo que vira `relatÃ³rio.pdf` quando o arquivo passa por e-mail ou portal de escola, o dano que o próprio comentário descreve.

Não há teste que feche esse caso: os quatro testes de slug usam `São Paulo`, `João da Silva`, `A turbo equipe 2ª`, `Equipe Alfa` e `***`.

---

## 3. Nome do cabeçalho entra cru, nome montado entra achatado

**Risco baixo, inconsistência real.**

Os dois caminhos de `nomeDoArquivoDoPdf` (`relatorios.pdf.ts:61-72`) têm regras diferentes:

- o **montado** passa por `achatar`: hífen no lugar do separador, minúsculas, sem acento;
- o **do cabeçalho** é o texto do servidor, verbatim, em `relatorios.pdf.ts:66-68`.

Consequências do segundo caminho, nenhuma coberta por teste:

- `attachment; filename="relatorio"` (sem extensão) salva um arquivo **sem extensão**. A tarefa 5 pede nome legível contendo o tipo do relatório; nesse caminho, o tipo é o que o servidor quis.
- `filename="../../x.pdf"` — o navegador neutraliza separadores no atributo `download`, então não há travessia de caminho; mas o código não registra que depende disso.
- Nome muito longo vindo do servidor não tem teto, pelo mesmo motivo do item 4.

---

## 4. O nome montado não tem limite de tamanho

**Risco.**

Não há corte em `achatar` nem em `nomeDoArquivoDoPdf`. O teto real é o do sistema de arquivos: **255 bytes por componente**, no NTFS, no APFS e no ext4.

`Equipe Alfa` vira cinco bytes. Um nome de grupo com 250 caracteres vira `relatorio-` + 250 + `.pdf` = 262 bytes, e o sistema operacional resolve truncando — o que costuma resultar em `relatorio-xxxxx...(1).pdf`, arquivo que o professor não reconhece e que não corresponde a nenhum relatório que ele tenha pedido.

Não há teste com nome longo: os testes usam nomes de 1 a 20 caracteres.

O caso é alcançável. O nome do grupo é texto livre digitado pelo professor (`src/features/competicoes/NovoGrupoForm.tsx`), e o teto real é o que a API aceitar.

---

## 5. Todo o PDF fica em memória, sem progresso e sem streaming

**Limitação, com custo mensurável.**

`api.get<Blob>(..., { responseType: 'blob' })` (`relatorios.api.ts:157`) faz o axios bufferizar a resposta inteira como `Blob` antes de resolver. Não há `onDownloadProgress`, nem `responseType: 'stream'`, nem `AbortSignal`.

Para o professor, os até 60 s de `TEMPO_LIMITE_DO_PDF` (`relatorios.api.ts:131`) são um spinner sem byte, sem barra e sem estimativa. O critério de aceite (`docs/11-etapa-exportacao-pdf.md:28`) pede estado de carregamento durante a geração, e o estado existe — mas não informa progresso.

O relatório mais pesado é o comparativo entre grupos (`/grupos/:id/relatorio-comparativo.pdf`), que carrega as séries de **todos** os grupos da competição, de todos os bimestres, com gráficos. O blob fica vivo entre `createObjectURL` e `revokeObjectURL` (`relatorios.pdf.ts:166-179`), ou seja, durante todo o download. Nenhum teste mede tamanho.

---

## 6. A revogação da URL de objeto é síncrona, no mesmo instante do clique

**Risco — e os testes não podem detectá-lo.**

`relatorios.pdf.ts:173-179` faz `appendChild` → `click()` → `remove()` → `revokeObjectURL()`, tudo no mesmo *task*, com a revogação no `finally`. Revogar a URL de objeto no mesmo instante em que o link é clicado é o ponto em que o download já começou a ser resolvido de forma assíncrona pelo navegador; há registro histórico de que a revogação imediata derruba o download em alguns motores, e o padrão que circula em bibliotecas para isso é adiar a revogação.

O teste `revoga a URL mesmo quando o clique não chega ao navegador` (`relatorios.pdf.spec.ts:125`) **afirma exatamente o comportamento que é o suspeito**, porque o espião substitui o clique e registra a chamada. No jsdom não existe download, então não há como observar o efeito: o teste passa e o campo pode falhar.

O mesmo raciocínio vale para o espião como um todo: ele prova que o link com o `href` e o `download` certos foi clicado, que é o máximo observável em jsdom.

---

## 7. O `await` antes do clique consome a ativação do usuário

**Risco — o mais provável de aparecer em produção e o menos visível nos testes.**

`BaixarPdf.tsx:51-52`: `await baixarPdfDoRelatorio(...)` e só depois `dispararDownload(...)`. O clique programático do `<a>` acontece **fora** do gesto que o originou.

A ativação transitória de usuário é o que autoriza download programático em WebKit, e ela tem prazo (no Chrome, alguns segundos). O `timeout` desta chamada é 60 s (`relatorios.api.ts:131`): a ativação pode ter expirado quando `link.click()` rodar.

No caso médio — geração de dois segundos, Chrome — funciona. No caso de WebKit/iOS, que é estrito quanto a download sem gesto, e no caso de geração lenta, é onde isso aparece.

Nenhum teste do repositório roda em navegador real: a suíte é 100% jsdom (39 arquivos). Essa classe inteira de comportamento está fora do alcance do que valida.

---

## 8. Spinner branco em botão `outline`

**Defeito, pré-existente — e não diagnosticável por teste.**

`Button.tsx:74-78` renderiza, no `loading`, `<Spinner className="border-white/40 border-t-white" />`. Esse par de classes foi calibrado para `primary` e `secondary`, que têm fundo preenchido e texto branco. O `BaixarPdf` usa `variant="outline"` (`BaixarPdf.tsx:72`), cujo fundo é transparente e o texto é `primary-700`: **um spinner branco sobre fundo claro é praticamente invisível**.

Pior: `src/lib/cn.ts` **não é tailwind-merge**. É junção de strings, e o comentário do próprio arquivo diz que "a última vence por cascade do CSS". Então as duas classes de `Spinner` (`border-primary-200 border-t-accent-600`, `Spinner.tsx:25`) e as duas de `Button` coexistem no elemento, ambas definindo `border-color` e `border-top-color`. **Quem vence é a ordem com que o Tailwind emite as utilities no stylesheet**, não a intenção do código. Não há como saber sem olhar o CSS gerado.

O `BaixarPdf` é o **segundo** lugar do projeto com `outline` + `loading`; o primeiro é `TabelaDeLancamentos.tsx:344-349`, que já tem o mesmo par. Ou seja, a mudança não introduziu o problema, mas o reproduziu — e nenhum dos dois está coberto por teste, porque o jsdom não calcula cor.

---

## 9. O botão perde o foco do teclado enquanto gera

**Defeito de acessibilidade.**

`Button.tsx:60` faz `disabled={disabled || loading}` e `Button.tsx:61` define `aria-busy`. Um elemento `disabled` não recebe foco.

O professor que aciona o botão com `Enter` e espera os 60 s tem o foco **descartado** para o `<body>` no instante do clique, e o foco não volta ao botão no `finally` — nem no sucesso, nem na falha. Para quem navega por teclado ou leitor de tela, a posição na página se perde a cada geração.

Agravante menor: o nome acessível muda de `Baixar PDF` para `Gerando o PDF…` no meio da interação (`Button.tsx:79`). Isso é razoável, mas exige que qualquer verificação posterior re-consulte o papel pelo nome novo — que é o que os testes fazem (`BaixarPdf.spec.tsx:148,157`).

---

## 10. O bloco de ação do cabeçalho não quebra linha

**Risco de layout, sem cobertura.**

`PageHeader.tsx:31` renderiza a ação em `<div className="flex shrink-0 gap-2">`: `flex` **sem** `flex-wrap`, com `shrink-0`. A Etapa 11 duplicou o número de itens nesse contêiner, de um para dois, nas quatro telas.

Os textos que passam a dividir a mesma linha não-quebrável:

| Tela | Link | Botão |
|---|---|---|
| `RelatorioGrupoPage.tsx:64,66` | "Comparar com os outros grupos" | "Baixar PDF" / "Gerando o PDF…" |
| `RelatorioComparativoGrupoPage.tsx:98,100` | "Ver o relatório do grupo" | idem |
| `RelatorioIndividualPage.tsx:67,69` | "Comparar com o grupo" | idem |
| `RelatorioComparativoAlunoPage.tsx:69` | idem | idem |

O `header` externo é `flex-wrap`, então o bloco de ação inteiro pode descer para a segunda linha — mas **dentro** dele nada quebra. Em viewport estreito, "Gerando o PDF…" (o texto mais longo, e o que existe exatamente quando o professor está esperando) somado a um link de 28 caracteres é a largura mínima dessa linha.

Nenhum teste do repositório mede layout, e nenhum dos 39 arquivos roda em viewport real.

---

## 11. `conferirQueEhPdf` tem dois pontos cegos

**Limitação deliberada, não documentada como tal.**

`relatorios.api.ts:206-216`:

- `if (tipo && !tipo.includes('application/pdf'))` — quando `content-type` **está ausente**, nada é conferido e o corpo passa. Foi escolha (uma resposta legítima sem o header não deve ser recusada), mas significa que a proteção contra HTML só existe quando o proxy pelo menos se denuncia. Um captive portal que devolve HTML com `content-type` errado — ou com nenhum — passa.
- A verificação é **só de cabeçalho**. `application/pdf` com corpo que não é PDF passa; e um erro de aplicação que por alguma razão responda `application/pdf` passa também.
- `if (!blob?.size)` depende de `data` ser realmente um `Blob`. O `responseType: 'blob'` é o que garante isso; se ele for removido e `data` voltar a ser objeto, `size` é `undefined`, a condição dispara, e a mensagem seria **"O PDF do relatório veio vazio"** — um diagnóstico errado para um bug de configuração. Não há teste para o caso.

---

## 12. Cobertura de rotas: 3 de 4 endpoints, e 1 de 4 telas

**Lacuna de teste, mensurável.**

Os testes que afirmam a **URL pedida** são três: `relatorio-individual.pdf` (`BaixarPdf.spec.tsx:71`), `relatorio.pdf` (`:132`) e `relatorio-comparativo.pdf` (`:94`).

Fica sem asserção de rota: **`/alunos/:alunoId/relatorio-comparativo-grupo.pdf`**. O valor `'relatorio-comparativo-grupo'` de `PREFIXO_DO_PDF` (`relatorios.pdf.ts:42`) só é exercitado pelo teste de **nome de arquivo** (`relatorios.pdf.spec.ts:23,33`), que passa pelo mesmo mapa mas não prova o request.

E o teste de integração de página existe em **uma** tela só: `RelatorioIndividualPage.spec.tsx:158`. As expressões `<BaixarPdf relatorio={dados} />` de `RelatorioComparativoAlunoPage.tsx:69`, `RelatorioGrupoPage.tsx:66` e `RelatorioComparativoGrupoPage.tsx:100` **nunca são renderizadas por nenhum teste**. Se a próxima pessoa trocar `dados` por `relatorio` em um desses arquivos, a suíte continua verde.

---

## 13. Critério de aceite nº 1 segue não verificado, e o fixture não é um PDF abrível

**Lacuna — declarando com precisão o que o msw entrega.**

`docs/11-etapa-exportacao-pdf.md:27` pede "geram um PDF válido, para uma competição de teste com pelo menos 2 bimestres encerrados". Isso exige a API real rodando, com dado real.

O que `pdfDoRelatorio` (`src/test/handlers.ts:1004`) entrega é uma concatenação de tokens PDF — `%PDF-1.4`, um catálogo, um `/Pages`, uma página, `trailer`, `%%EOF` — **sem tabela xref e sem offsets de objeto**. Um leitor de PDF real não o abre.

O teste serve para o que a tela faz: bytes não vazios com `Content-Type: application/pdf`, entregues ao navegador. O comentário do arquivo (`handlers.ts:995-1002`) diz isso com honestidade e está correto. O risco é outro: **a suíte verde não diz nada sobre validade de PDF**, e o critério de aceite continua em aberto.

---

## 14. Efeitos colaterais do `responseType: 'blob'` e do `timeout` maior

**Riscos que valem registro.**

- **Erro da API chega como `Blob`.** `comOCorpoDoErroLegivel` (`relatorios.api.ts:259-271`) refaz o `AxiosError` com `JSON.parse(await dados.text())`. É isso que faz o teste do 500 (`BaixarPdf.spec.tsx:162`) mostrar a frase do servidor. Mas a recriação copia `code`, `config`, `request` e o `response`: o `AxiosError` reconstruído **não é a mesma instância** que o interceptor global viu. Um interceptor futuro que compare por identidade passaria a errar nesse caminho.
- **401 desloga o professor.** `src/lib/api.ts:69` chama `limparSessao()` em qualquer 401 não marcado. É o comportamento de toda a aplicação, mas o PDF é a chamada mais longa do projeto: um token que expira **durante** a geração é mais provável aqui do que numa leitura de JSON. O resultado é o professor no login, sem relação aparente com o botão.
- **`timeout: 60000` só nesta chamada**, o que faz dela o único ponto do projeto acima de 15 s. Não há `AbortController`: se o professor navegar para outra tela durante a geração, a requisição segue, e `dispararDownload` ainda dispara o download de uma tela que já não está montada.
- **Sem teste de rede caída.** O critério `docs/11-etapa-exportacao-pdf.md:29` nomeia explicitamente "desligar a API momentaneamente". Os caminhos de rede e timeout existem (`erro-api.ts:22-23`: `ECONNABORTED` vira "A requisição demorou demais", `Network Error` vira "Não foi possível falar com o servidor"), mas **não há teste que os exercite por esta porta**. O 500 de `BaixarPdf.spec.tsx:165` tem resposta, que é outro caminho.

---

## 15. `TipoDeRelatorio`: o que era, e o que a correção passa a garantir

**Correção real, com uma propriedade nova que vale saber.**

O tipo era `RelatorioIndividual['tipo'] | RelatorioDoGrupo['tipo']` — os dois envelopes "de base". Faltavam `comparativo-grupo` e `comparativo-grupos`, que têm `tipo` próprio. O comentário dizia "dos quatro".

Efeito imediato: `PREFIXO_DO_PDF: Record<TipoDeRelatorio, string>` (`relatorios.pdf.ts:40`) passou a ser exaustivo em tempo de compilação. Um quinto tipo de relatório quebraria o build naquele mapa — propriedade útil que não existia antes.

Duas consequências de projeto que a tabela impõe agora:

- `PREFIXO_DO_PDF` é o **único** lugar do front onde a correspondência `tipo → segmento da rota` está escrita. Os quatro valores não derivam do `tipo` por regra (`coletivo-grupo` vira `relatorio`, `comparativo-grupos` vira `relatorio-comparativo`), e nada mais no código tem como detectar que eles divergiram. A tabela é a fonte, e ela é verificável só por leitura.
- Os prefixos duplicam literalmente os caminhos em `src/test/handlers.ts` — `relatoriosEmPdf`, `pdfDosRelatoriosRecusado` e `pdfDosRelatoriosComoPaginaDeErro` repetem as quatro rotas. Divergência entre elas e `PREFIXO_DO_PDF` não é detectada pelo compilador, em nenhum dos dois lados.

---

## 16. O que está correto e verificado

Para contraste, estas partes foram checadas e não têm defeito:

- **`espiarNoDownload` é necessário e correto.** Confirmei no jsdom do projeto: `URL.createObjectURL` é `undefined` (`download.ts:33-34` descreve isso com precisão), e `click` é propriedade própria de `HTMLElement.prototype`, não de `HTMLAnchorElement.prototype` — então o `delete` de `download.ts:77` **restaura** o método nativo pela cadeia, em vez de removê-lo. O helper não tem o bug que a leitura do código sugeria.
- **`dispararDownload` não vaza.** Remove o link e revoga no `finally`, inclusive quando o clique lança (`relatorios.pdf.spec.ts:125`), e não deixa `<a>` no DOM (`:121`).
- **403 sem jargão na tela.** O tratamento reusa `MENSAGEM_DE_ACESSO_AO_RELATORIO`, sem `Forbidden` nem `statusCode` (`BaixarPdf.spec.tsx:191-192`).
- **`competicaoId` do download e o da carga não podem divergir.** A tela carrega com o da query (`RelatorioIndividualPage.tsx:37,39`) e o `.pdf` usa o `dados.competicaoId` do mesmo objeto carregado.
- **O botão só aparece com o relatório na tela.** Sem `dados` não há nem rota nem nome de arquivo, e um botão que falha ao clique é pior do que um botão que não existe.
- **Verificações da etapa:** `npx tsc -b`, `npx oxlint` (zero achados, confirmado com um probe que *deve* gerar aviso), `pnpm test` (39 arquivos / 317 testes) e `pnpm build` passam.

---

## Fora do alcance deste diagnóstico

Não foram verificados, por não haver ambiente:

- o PDF real gerado pelo `pdfmake` da API, e a marcação de parcialidade (RN32);
- comportamento de download em navegador real (itens 6, 7 e 8 dependem disso);
- layout em viewport estreito (item 10);
- a decisão de produto sobre o aluno ver o botão: a API permite aluno no próprio relatório (`README-API.md:652`), e o dashboard do aluno leva às mesmas telas, então o botão aparece para ele — o plano (`docs/11-etapa-exportacao-pdf.md:13`) diz "cada uma das quatro páginas", sem distinguir perfil.
## 17. Bloqueios externos (CORS / API)

- **#1 - Content-Disposition não é exposto:** Para que o navegador enxergue Content-Disposition via axios, a API precisa retornar Access-Control-Expose-Headers: Content-Disposition nas 4 rotas .pdf. Sem isso, headers['content-disposition'] não chega ao front mesmo com CORS habilitado.
- **Impacto prático:** Hoje o front usa nome montado como fallback (
omeDoArquivoDoPdf). Isso mantém o download funcional.
- **Ação:** Cobrar do backend esse cabeçalho. Enquanto não vier, o comportamento atual é aceitável.

## 18. Decisões aplicadas nesta revisão

- #1 registrado como bloqueio externo (CORS/Expose-Headers).
- #2,#4: slug sanitizado + truncado (120) e remoção de não-ASCII remanescentes.
- #3: filename vindo do Content-Disposition sanitizado.
- #6: revokeObjectURL adiado (5s).
- #7,#9: Button não usa disabled durante loading; usa aria-disabled/aria-busy + tabIndex -1; impede clique.
- #8: spinner ajustado por variant (outline usa cores primárias).
- #10: PageHeader actions com flex-wrap + justify-end.
- #11: pontos cegos documentados em conferirQueEhPdf.
- #5,#15: limitações/observações registradas.
