import type { RelatorioComparativoDoAluno, RelatorioComparativoDoGrupo } from './relatorios.tipos'
import {
  gruposPorBimestre,
  parcelasDaSoma,
  seriesDoComparativoDeGrupos,
  seriesDoComparativoDoAluno,
  serieDoRelatorio,
} from './series'

const ALUNO = 'a1'

/** Um relatório comparado ao grupo, com um colega no 1º bimestre só. */
function comparativoDoAluno(): RelatorioComparativoDoAluno {
  return {
    tipo: 'comparativo-grupo',
    alunoId: ALUNO,
    nome: 'Ana Souza',
    competicaoId: 'comp-1',
    competicaoNome: 'Competição da Escola',
    pontuacaoFinal: 7.88,
    bimestres: [
      {
        bimestreId: 'b1',
        numero: 1,
        valor: 8.25,
        materias: [],
        grupo: { grupoId: 'g1', nome: 'Equipe Alfa' },
        colegasDeGrupo: [
          {
            alunoId: 'a2',
            nome: 'Bruno Lima',
            valor: 6.5,
            materias: [],
          },
          {
            alunoId: 'a3',
            nome: 'Carla Souza',
            valor: 7,
            materias: [],
          },
        ],
      },
      {
        bimestreId: 'b2',
        numero: 2,
        valor: 7.5,
        materias: [],
        grupo: { grupoId: 'g2', nome: 'Equipe Beta' },
        colegasDeGrupo: [
          {
            alunoId: 'a3',
            nome: 'Carla Souza',
            valor: 7.25,
            materias: [],
          },
        ],
      },
    ],
  }
}

describe('seriesDoComparativoDoAluno', () => {
  it('inclui a linha do próprio aluno, que a API não lista entre os colegas', () => {
    const series = seriesDoComparativoDoAluno(comparativoDoAluno())

    // O aluno primeiro, os colegas por nome: a ordem estável é o que impede que a
    // legenda troque de cor a cada recarregamento.
    expect(series.map((serie) => serie.nome)).toEqual(['Ana Souza', 'Bruno Lima', 'Carla Souza'])
    expect(series[0]?.ehOProprio).toBe(true)
    expect(series.slice(1).every((serie) => !serie.ehOProprio)).toBe(true)
  })

  it('junta o mesmo colega em uma série só, com lacuna onde não dividiram grupo', () => {
    const series = seriesDoComparativoDoAluno(comparativoDoAluno())
    const carla = series.find((serie) => serie.nome === 'Carla Souza')

    // Carla está nos dois bimestres, mas em grupos diferentes: uma linha só, com o
    // intervalo em branco — e não duas séries, nem uma linha costurada.
    expect(carla?.pontos).toEqual([
      { rotulo: '1º', valor: 7 },
      { rotulo: '2º', valor: 7.25 },
    ])

    const bruno = series.find((serie) => serie.nome === 'Bruno Lima')
    expect(bruno?.pontos).toEqual([
      { rotulo: '1º', valor: 6.5 },
      { rotulo: '2º', valor: null },
    ])
  })

  it('casa o valor com o rótulo do bimestre, e não com a posição na lista', () => {
    // A API entrega os bimestres em ordem (`orderBy: numero`), mas a junção é pelo
    // rótulo: se um dia a lista vier fora de ordem, o 7,50 continua sendo do 2º
    // bimestre — e a série inteira anda junto, o que é o comportamento visível.
    const relatorio = comparativoDoAluno()
    const embaralhado = { ...relatorio, bimestres: [...relatorio.bimestres].reverse() }

    const series = seriesDoComparativoDoAluno(embaralhado)
    expect(series[0]?.pontos).toEqual([
      { rotulo: '2º', valor: 7.5 },
      { rotulo: '1º', valor: 8.25 },
    ])
  })
})

describe('gruposPorBimestre', () => {
  it('leva o grupo de cada bimestre, inclusive a falta dele', () => {
    const relatorio = comparativoDoAluno()
    const grupos = gruposPorBimestre(relatorio)

    expect(grupos.map((item) => item.rotulo)).toEqual(['1º', '2º'])
    expect(grupos[0]?.grupo?.nome).toBe('Equipe Alfa')
    expect(grupos[1]?.grupo?.nome).toBe('Equipe Beta')
  })

  it('escreve o bimestre em que o aluno não estava em equipe alguma', () => {
    const relatorio = comparativoDoAluno()
    const semGrupo: RelatorioComparativoDoAluno = {
      ...relatorio,
      bimestres: [{ ...relatorio.bimestres[0]!, grupo: null, colegasDeGrupo: [] }],
    }

    expect(gruposPorBimestre(semGrupo)[0]?.grupo).toBeNull()
  })
})

describe('seriesDoComparativoDeGrupos', () => {
  function comparativoDeGrupos(comparativo: RelatorioComparativoDoGrupo['comparativo']) {
    return {
      tipo: 'comparativo-grupos',
      grupoId: 'g1',
      nome: 'Equipe Alfa',
      competicaoId: 'comp-1',
      competicaoNome: 'Competição da Escola',
      pontuacaoFinal: 15.75,
      bimestres: [
        { bimestreId: 'b1', numero: 1, valor: 8.25, integrantes: [] },
        { bimestreId: 'b2', numero: 2, valor: 7.5, integrantes: [] },
      ],
      comparativo,
    } satisfies RelatorioComparativoDoGrupo
  }

  it('soma o próprio grupo ao comparativo, que a API devolve sem ele', () => {
    const series = seriesDoComparativoDeGrupos(
      comparativoDeGrupos([
        {
          grupoId: 'g2',
          nome: 'Equipe Beta',
          pontuacaoFinal: 14.25,
          bimestres: [
            { bimestreId: 'b1', numero: 1, valor: 7 },
            { bimestreId: 'b2', numero: 2, valor: 7.25 },
          ],
        },
      ]),
    )

    expect(series.map((serie) => serie.nome)).toEqual(['Equipe Alfa', 'Equipe Beta'])
    expect(series[0]?.ehOProprio).toBe(true)
    expect(series[1]?.ehOProprio).toBe(false)
  })

  it('mantém o eixo quando a competição tem um grupo só', () => {
    // Com `comparativo` vazio, os bimestres do gráfico só existem no relatório do
    // próprio grupo: usar o lado vazio deixaria o gráfico sem eixo.
    const series = seriesDoComparativoDeGrupos(comparativoDeGrupos([]))

    expect(series).toHaveLength(1)
    expect(series[0]?.pontos).toEqual([
      { rotulo: '1º', valor: 8.25 },
      { rotulo: '2º', valor: 7.5 },
    ])
  })

  it('deixa em branco o bimestre que o outro grupo não tem, sem encurtar o eixo', () => {
    // O eixo é a união dos bimestres de todos: usar só os do `comparativo` faria a
    // linha da Equipe Beta terminar antes da da Equipe Alfa, e o 2º bimestre dela
    // sumiria do gráfico.
    const series = seriesDoComparativoDeGrupos(
      comparativoDeGrupos([
        {
          grupoId: 'g2',
          nome: 'Equipe Beta',
          pontuacaoFinal: 7,
          bimestres: [{ bimestreId: 'b1', numero: 1, valor: 7 }],
        },
      ]),
    )

    expect(series[1]?.pontos).toEqual([
      { rotulo: '1º', valor: 7 },
      { rotulo: '2º', valor: null },
    ])
  })
})

describe('serieDoRelatorio e parcelasDaSoma', () => {
  const bimestres = [
    { numero: 1, valor: 8.25 },
    { numero: 2, valor: 7.5 },
    { numero: 3, valor: null },
  ]

  it('monta uma série com o rótulo de cada bimestre', () => {
    expect(serieDoRelatorio(bimestres, 'g1', 'Equipe Alfa')).toEqual({
      id: 'g1',
      nome: 'Equipe Alfa',
      pontos: [
        { rotulo: '1º', valor: 8.25 },
        { rotulo: '2º', valor: 7.5 },
        { rotulo: '3º', valor: null },
      ],
    })
  })

  it('devolve as parcelas da soma como vieram, sem somar', () => {
    const parcelas = parcelasDaSoma(bimestres)

    expect(parcelas).toEqual([
      { rotulo: '1º', valor: 8.25 },
      { rotulo: '2º', valor: 7.5 },
      { rotulo: '3º', valor: null },
    ])

    // A soma das parcelas não é o valor de nenhuma delas nem o total: quem totaliza é
    // a API, e o bloco só mostra de onde o número saiu.
    const soma = parcelas.reduce((total, parcela) => total + (parcela.valor ?? 0), 0)
    expect(soma).toBeCloseTo(15.75)
  })
})