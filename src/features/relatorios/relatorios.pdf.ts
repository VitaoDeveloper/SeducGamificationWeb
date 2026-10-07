/**
 * O PDF dos relatórios: o nome do arquivo e o download no navegador.
 *
 * É um módulo **puro** — sem JSX e sem axios — por duas razões que a Etapa 10 já
 * mostrou valer a pena: a regra do nome do arquivo é testável sem navegador, e a
 * tela não precisa conhecer `Content-Disposition` nem `createObjectURL`. Quem
 * chama é `baixarPdfDoRelatorio` (em `relatorios.api.ts`), que sabe HTTP, e o
 * `BaixarPdf`, que sabe estado.
 *
 * As duas regras deste módulo — a rota e o nome do arquivo — dependem só de qual
 * relatório é (`tipo`), nunca dos números dele: por isso o módulo inteiro trabalha
 * com `TipoDeRelatorio`, e não com o relatório inteiro.
 *
 * **Por que o nome é montado aqui e não pela API.** A API documenta que baixa
 * `relatorio-*.pdf` e manda `Content-Type: application/pdf`, mas não promete
 * `Content-Disposition` (`README-API.md`, seção 11.13). Sem ele, o nome vem do
 * `download` do link — e um link gerado sem nome deixa o professor com um arquivo
 * chamado `download` na pasta de downloads, quatro vezes. Então o nome é sempre
 * montado a partir do que a tela já tem em mãos, e o cabeçalho, **quando vier**,
 * só tem precedência se trouxer um nome de verdade.
 *
 * O formato é `<prefixo>-<nome>.pdf` (`relatorio-individual-joao-silva.pdf`), e o
 * prefixo é o mesmo segmento da rota: o nome do arquivo diz, sem abrir, qual
 * relatório é — o individual não é o comparado ao grupo, ainda que os dois sejam
 * do mesmo aluno.
 */

import type { TipoDeRelatorio } from './relatorios.tipos'

/* ------------------------------------------------------------ prefixo da rota -- */

/**
 * O segmento da rota `.pdf` de cada relatório, e também o prefixo do arquivo.
 *
 * Os quatro valores não derivam do `tipo` da resposta por regra: `coletivo-grupo`
 * vira `relatorio` e `comparativo-grupos` vira `relatorio-comparativo`. São as
 * rotas que a API montou, e por isso a tabela é o único lugar onde a correspondência
 * está escrita — nenhum outro arquivo sabe dela.
 *
 * Nota (#15): a exaustividade aqui é útil. Atenção à duplicidade com os handlers de teste
 * (`src/test/handlers.ts`) — divergências entre essas tabelas não são detectadas pelo compilador.
 */
export const PREFIXO_DO_PDF: Record<TipoDeRelatorio, string> = {
  individual: 'relatorio-individual',
  'comparativo-grupo': 'relatorio-comparativo-grupo',
  'coletivo-grupo': 'relatorio',
  'comparativo-grupos': 'relatorio-comparativo',
}

/* ------------------------------------------------------------------- o nome -- */

/**
 * O nome do arquivo, a partir do relatório e do cabeçalho da resposta.
 *
 * O nome da pessoa vai "achatado": sem acento, minúsculo, com hífen no lugar do
 * espaço (`Equipe Alfa` → `equipe-alfa`). Acento em nome de arquivo é o tipo de
 * coisa que abre em outro sistema — o e-mail do professor para a coordenação, o
 * portal da escola — e vira `relatÃ³rio.pdf` ou um `?` no caminho.
 *
 * O que sobra quando o nome não tem nada aproveitável (um grupo chamado "***", um
 * aluno sem nome gravado) é o prefixo sozinho: um arquivo nomeado, e não
 * `relatorio-individual-.pdf`.
 */
export function nomeDoArquivoDoPdf(
  tipo: TipoDeRelatorio,
  nome: string | null | undefined,
  disposicao?: string | null,
): string {
  const doCabecalho = nomeDoArquivoNaDisposicao(disposicao)

  if (doCabecalho) return doCabecalho

  const achatado = achatar(nome)
  return `${PREFIXO_DO_PDF[tipo]}${achatado ? `-${achatado}` : ''}.pdf`
}

/**
 * O nome que o `Content-Disposition` da resposta manda, ou `null`.
 *
 * A API não promete esse cabeçalho, mas mandando, ele tem precedência sobre o
 * nome montado aqui: é a fonte que o servidor controla, e um servidor que
 * nomeia o arquivo tem motivo para ter um nome melhor que o da tela.
 *
 * São lidos os dois formatos do cabeçalho: o `filename="..."` simples e o
 * `filename*=UTF-8''...` da RFC 5987 (percent-encoded), que é o que sobrevive
 * quando o nome leva acento. O `filename*` vem primeiro quando os dois existem,
 * porque é o mais específico. Um cabeçalho sem `filename` — o `inline` de quem
 * quer abrir o PDF na aba em vez de baixar — devolve `null`, e o nome montado pela
 * tela entra no lugar.
 */
export function nomeDoArquivoNaDisposicao(disposicao: string | null | undefined): string | null {
  if (!disposicao) return null

  const codificado = /filename\*\s*=\s*[^']*'[^']*'([^;]+)/i.exec(disposicao)
  if (codificado?.[1]) {
    const nome = decodificarPercent(codificado[1].trim())
    if (nome) return nome
  }

  const simples = /filename\s*=\s*"?([^";]+)"?/i.exec(disposicao)
  if (simples?.[1]) {
    const nome = simples[1].trim()
    if (nome) return nome
  }

  return null
}

/** `UTF-8''relat%C3%B3rio.pdf` → `relatório.pdf`; texto simples passa direto. */
function decodificarPercent(valor: string): string {
  try {
    return decodeURIComponent(valor)
  } catch {
    return valor
  }
}

/**
 * Os indicadores de ordem do português, que o Unicode não decompõe.
 *
 * `º` e `ª` não têm decomposição canônica — o `NFD` não os transforma em `o` e
 * `a` — e mesmo assim aparecem em nome de grupo e de sala ("Turma 2ª"), porque é
 * assim que o português escreve número de ordem; o projeto inteiro escreve "1º
 * bimestre". Sem esta troca eles atravessariam a remoção de acentos e o arquivo
 * sairia com caractere não-ASCII depois de o comentário dizer que não sairia.
 */
const ORDINAIS: Record<string, string> = {
  'º': 'o',
  'ª': 'a',
}

/**
 * Achata um nome para dentro de um nome de arquivo: `João da Silva` →
 * `joao-da-silva`.
 *
 * A sequência é ordinais → diacríticos → qualquer coisa que não for letra ou
 * número → hífen. Separar por hífen em vez de apagar é o que mantém "Equipe Alfa"
 * e "EquipeAlfa" como dois nomes distintos, e é a diferença entre uma pasta de
 * downloads legível e `equipealfa`.
 */
function achatar(nome: string | null | undefined): string {
  if (!nome) return ''

  const LIMITA_SLUG = 120
  const achatado = nome
    .replace(/[ªº]/g, (ordinal) => ORDINAIS[ordinal] ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (achatado.length <= LIMITA_SLUG) return achatado
  return achatado.slice(0, LIMITA_SLUG).replace(/-+$/, '')
}
/* -------------------------------------------------------------- o download -- */

/**
 * Entrega o blob ao navegador como download e solta a URL de objeto.
 *
 * Não existe `window.download`: o que existe é um link com `href` apontando para
 * uma URL de objeto, `download` com o nome do arquivo, e um clique. Por isso o
 * link é criado, clicado e removido em seguida — ele não pertence à página, e a
 * URL de objeto é revogada assim que o navegador a lê, porque ela segura o PDF
 * inteiro na memória enquanto ninguém a revogar.
 *
 * A revogação vai no `finally`: um navegador que recusou o clique (política de
 * segurança) não pode deixar o blob pendurado, e o erro de quem chamou — se
 * houver — é mais interessante do que uma URL vazada.
 *
 * A revogação é adiada (5s) para reduzir o risco de o download ser interrompido
 * em alguns navegadores (WebKit) ao revogar imediatamente após o clique.
 */
export function dispararDownload(blob: Blob, nomeDoArquivo: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = nomeDoArquivo
  link.style.display = 'none'

  try {
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}