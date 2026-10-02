import { rotuloCurtoDoBimestre } from './relatorios.tipos'
import type {
  RelatorioComparativoDoAluno,
  RelatorioComparativoDoGrupo,
} from './relatorios.tipos'

/**
 * Montagem das séries que o gráfico e o bloco de soma consomem.
 *
 * Fica num módulo sem JSX — e por isso é um `.ts` — porque é a parte da Etapa 10
 * que dá para testar sem navegador: as três escalas convivem nas mesmas respostas
 * da API, e a montagem das séries é onde essa mistura acontece. Um gráfico que
 * mostrasse a soma do grupo (0 a 40) numa linha do eixo de 0 a 10 nasceria aqui, e
 * o teste deste arquivo é o que impede que ele nasça.
 *
 * Os rótulos dos bimestres saem sempre de `rotuloCurtoDoBimestre`, para que o `1º`
 * do eixo, o do gráfico e o da tabela de parcelas sejam o mesmo bimestre com o
 * mesmo nome.
 */

/**
 * Uma série do comparativo: uma pessoa (aluno) ou uma equipe (grupo), com o que
 * ela valia em cada bimestre.
 *
 * `ehOProprio` marca a série do aluno ou do grupo que está sendo lido. É o que
 * permite a página desenhar essa linha mais grossa e lembrar no texto de quem é
 * o relatório — num comparativo com oito séries, a linha sem nome é sempre a que
 * o leitor procura primeiro.
 */
export interface SerieComparativa {
  id: string
  nome: string
  ehOProprio: boolean
  pontos: Array<{ rotulo: string; valor: number | null }>
}

/**
 * Um bimestre e o grupo em que o aluno estava nele.
 *
 * O grupo **pode mudar de bimestre para bimestre**, e essa é a razão de o
 * comparativo ser desenhado assim: quem compara o aluno com o time quer saber com
 * quem ele estava, e em qual bimestre. A lista vai para o texto abaixo do gráfico
 * porque essa informação não cabe em uma linha.
 */
export interface GrupoDoBimestre {
  rotulo: string
  numero: number
  grupo: { grupoId: string; nome: string } | null
}

/**
 * Uma série só, para quem é um só — o aluno no relatório individual e o grupo no
 * relatório coletivo.
 *
 * Os bimestres vêm em ordem da API (`orderBy: numero`), e a série usa o mesmo
 * rótulo do eixo (`1º`, `2º`…) nos dois lugares: se o gráfico e a tabela usassem
 * nomes diferentes para o mesmo bimestre, quem conferisse um pelo outro teria que
 * adivinhar a correspondência.
 *
 * Sem `ehOProprio` porque com uma série só a linha é necessariamente a de quem se
 * está lendo, e o `GraficoDeSintese` só usa o destaque quando há mais de uma.
 */
export function serieDoRelatorio(
  bimestres: Array<{ numero: number; valor: number | null }>,
  id: string,
  nome: string,
): Omit<SerieComparativa, 'ehOProprio'> {
  return {
    id,
    nome,
    pontos: bimestres.map((bimestre) => ({
      rotulo: rotuloCurtoDoBimestre(bimestre.numero),
      valor: bimestre.valor,
    })),
  }
}

/**
 * As parcelas da soma do grupo: as sínteses bimestrais que a compuseram.
 *
 * Não é uma soma calculada aqui — são os valores que a API devolveu, na ordem dos
 * bimestres, para o bloco da pontuação final mostrar de onde o total saiu. É o
 * parágrafo `8.25 + 7.50 + …` que impede a leitura de "31.80" como nota de
 * bimestre, e por isso ele escreve `null` como `—`, e não como 0: bimestre não
 * encerrado não entra na conta com valor nenhum.
 */
export function parcelasDaSoma(
  bimestres: Array<{ numero: number; valor: number | null }>,
): Array<{ rotulo: string; valor: number | null }> {
  return bimestres.map((bimestre) => ({
    rotulo: rotuloCurtoDoBimestre(bimestre.numero),
    valor: bimestre.valor,
  }))
}

/**
 * As séries do relatório comparado ao grupo: o aluno e cada colega, com lacuna
 * nos bimestres em que não dividiram equipe.
 *
 * A junção é por `alunoId` e nunca por nome nem por posição: o mesmo colega pode
 * aparecer em dois grupos diferentes ao longo do ano, e ele deve sair como **uma**
 * série com um intervalo em branco entre os períodos em que não estavam juntos —
 * foi assim no papel, e é assim no gráfico. Um valor `null` nesse ponto é a
 * informação ("não estávamos no mesmo grupo"), não uma nota faltando; o recharts
 * desenha o intervalo, e a escala continua sendo a mesma de 0 a 10.
 *
 * O aluno da sessão é sempre o primeiro da lista, e os colegas vêm por nome —
 * a ordem estável é o que faz a legenda não trocar de cor a cada recarregamento.
 */
export function seriesDoComparativoDoAluno(
  relatorio: RelatorioComparativoDoAluno,
): SerieComparativa[] {
  const rotulos = relatorio.bimestres.map((bimestre) => ({
    rotulo: rotuloCurtoDoBimestre(bimestre.numero),
    numero: bimestre.numero,
  }))

  const porAluno = new Map<string, { nome: string; valores: Map<string, number | null> }>()

  function dadosDoAluno(alunoId: string, nome: string) {
    const existente = porAluno.get(alunoId)
    if (existente) return existente

    const criados = { nome, valores: new Map<string, number | null>() }
    porAluno.set(alunoId, criados)
    return criados
  }

  for (const bimestre of relatorio.bimestres) {
    const rotulo = rotuloCurtoDoBimestre(bimestre.numero)

    // O próprio aluno entra pela linha do relatório, e não pelos colegas: a API
    // não o lista em `colegasDeGrupo` (são os *outros*), e sem esta linha ele
    // ficaria fora do próprio comparativo.
    dadosDoAluno(relatorio.alunoId, relatorio.nome).valores.set(rotulo, bimestre.valor)

    for (const colega of bimestre.colegasDeGrupo) {
      dadosDoAluno(colega.alunoId, colega.nome).valores.set(rotulo, colega.valor)
    }
  }

  const series: SerieComparativa[] = []
  for (const [alunoId, dados] of porAluno) {
    series.push({
      id: alunoId,
      nome: dados.nome,
      ehOProprio: alunoId === relatorio.alunoId,
      pontos: rotulos.map(({ rotulo }) => ({ rotulo, valor: dados.valores.get(rotulo) ?? null })),
    })
  }

  return series.sort((a, b) => {
    if (a.ehOProprio !== b.ehOProprio) return a.ehOProprio ? -1 : 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

/** O grupo de cada bimestre, na ordem dos bimestres, para o texto do relatório. */
export function gruposPorBimestre(
  relatorio: RelatorioComparativoDoAluno,
): GrupoDoBimestre[] {
  return relatorio.bimestres.map((bimestre) => ({
    rotulo: rotuloCurtoDoBimestre(bimestre.numero),
    numero: bimestre.numero,
    grupo: bimestre.grupo,
  }))
}

/**
 * As séries do relatório comparado aos grupos: o próprio grupo e os demais.
 *
 * A API manda em `comparativo` **só os outros** grupos, então a série do grupo
 * lido sai da lista de bimestres do próprio relatório. Sem somar os dois lados
 * aqui, o gráfico mostraria a competição sem o time de quem está lendo — e a
 * comparação perderia o próprio objeto da comparação.
 */
export function seriesDoComparativoDeGrupos(
  relatorio: RelatorioComparativoDoGrupo,
): SerieComparativa[] {
  /*
   * O eixo é a **união** dos bimestres de todos os grupos, em ordem crescente. Não é
   * o lado do `comparativo` nem o do relatório: cada grupo traz os bimestres em que
   * ele pontuou, e escolher um dos lados deixaria de fora o bimestre que o outro time
   * não tem — o gráfico compararia séries com larguras diferentes, que é como um
   * valor de um bimestre vira o valor de outro.
   */
  const numeros = [
    ...new Set([
      ...relatorio.bimestres.map((bimestre) => bimestre.numero),
      ...relatorio.comparativo.flatMap((grupo) => grupo.bimestres.map((b) => b.numero)),
    ]),
  ].sort((a, b) => a - b)

  const rotulos = numeros.map((numero) => rotuloCurtoDoBimestre(numero))

  function pontosDo(bimestres: Array<{ numero: number; valor: number | null }>) {
    return rotulos.map((rotulo) => {
      const bimestre = bimestres.find((candidato) => rotuloCurtoDoBimestre(candidato.numero) === rotulo)
      return { rotulo, valor: bimestre?.valor ?? null }
    })
  }

  const proprio: SerieComparativa = {
    id: relatorio.grupoId,
    nome: relatorio.nome,
    ehOProprio: true,
    pontos: pontosDo(relatorio.bimestres),
  }

  const outros: SerieComparativa[] = relatorio.comparativo.map((grupo) => ({
    id: grupo.grupoId,
    nome: grupo.nome,
    ehOProprio: false,
    pontos: pontosDo(grupo.bimestres),
  }))

  return [proprio, ...outros].sort((a, b) => {
    if (a.ehOProprio !== b.ehOProprio) return a.ehOProprio ? -1 : 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}