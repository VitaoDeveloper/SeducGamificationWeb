import { screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import {
  API,
  aluno,
  bimestre,
  componentesDoBimestre,
  grupo,
  lancamento,
  listagemDeLancamentos,
  materia,
  materiaFechada,
  membro,
} from '../../test/handlers'
import { MODELO_NUMERICO } from './modelo-avaliacao'
import { PreviaDaSintese } from './PreviaDaSintese'
import { AVISO_DE_PREVIA } from './TabelaDeLancamentos'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre, GrupoComMembros } from './competicoes.tipos'
import type { Lancamento, MateriaComPesos } from './componentes-pontuacao.tipos'
import type { Aluno } from '../salas/salas.tipos'

/*
 * O painel é a etapa 06 vista pelo professor: a mesma conta da coluna da tabela
 * de lançamentos, mas sobre o bimestre inteiro. O teste que a doc exige está no
 * primeiro caso — lançamentos de mais de uma matéria, conferindo a média entre
 * elas — e os outros cercam os estados em que o número mostrado seria enganoso:
 * a matéria que ainda não tem componente, o bimestre encerrado e o grupo sem
 * integrante.
 *
 * Os números são os do exemplo 1 do `docs/03-regras-de-calculo.md` da API: a Ana
 * com 8/10/6 na prova, no caderno e no projeto de Matemática dá 7,8 na matéria,
 * e com 8,6 na dissertação de Português fecha 8,2 de síntese bimestral.
 */

const ANA = aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' })
const BIA = aluno({ id: 'a2', nome: 'Bia', codigoMatricula: '26011' })

const ALUNOS = [ANA, BIA]

const MATEMATICA = materiaFechada('mat-1', 'Matemática', ['Prova', 50], ['Caderno', 20], ['Projeto', 30])
const PORTUGUES = materiaFechada('mat-2', 'Português', ['Dissertação', 100])
const GEOGRAFIA = materia({ componenteCurricularId: 'mat-3', materiaNome: 'Geografia' })

/** As notas da Ana: 7,8 em Matemática e 8,6 em Português, fechando 8,2. */
const NOTAS_DA_ANA: Lancamento[] = [
  lancamento('mat-1-cp1', ANA, '8'),
  lancamento('mat-1-cp2', ANA, '10'),
  lancamento('mat-1-cp3', ANA, '6'),
  lancamento('mat-2-cp1', ANA, '8.6'),
]

function bimestreDoTeste(situacao: Bimestre['situacao'] = SITUACAO_BIMESTRE.ABERTO): Bimestre {
  return bimestre({ id: 'b1', competicaoId: 'comp-1', numero: 1, situacao })
}

/**
 * Os dois handlers que o painel consome: os componentes do bimestre e, para cada
 * componente, os lançamentos dele.
 *
 * A listagem de lançamentos é a da fábrica justamente porque ela filtra por
 * componente: a prévia dispara uma chamada por componente do bimestre, e é a
 * mesma resposta servindo a todas.
 */
function comCenario(materias: MateriaComPesos[], notas: readonly Lancamento[] = []) {
  return [
    http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
      HttpResponse.json(componentesDoBimestre(String(params.id), materias)),
    ),
    ...listagemDeLancamentos([...notas]),
  ]
}

function grupoDoBimestre(id: string, nome: string, integrantes: readonly Aluno[] = []): GrupoComMembros {
  return {
    ...grupo({ id, nome, competicaoId: 'comp-1' }),
    membrosGrupos: integrantes.map((aluno) => membro(id, aluno, 'b1')),
  }
}

/**
 * A linha de um aluno na tabela de alunos do painel.
 *
 * Casa pelo prefixo do nome porque ele abre a linha: o nome e a matrícula estão
 * na mesma célula, e as duas Span dela ficam coladas no texto do jsdom (o `block`
 * que as separa é só CSS, não entra na conta do nome acessível).
 */
async function linhaDoAluno(nome: string) {
  return screen.findByRole('row', { name: new RegExp(`^${nome}`) })
}

describe('PreviaDaSintese', () => {
  it('faz a média entre as matérias de dois componentes e mostra as parcelas', async () => {
    server.use(...comCenario([MATEMATICA, PORTUGUES], NOTAS_DA_ANA))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={ALUNOS}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    // Uma coluna por matéria, que é o que deixa a média conferível à mão: sem as
    // parcelas o professor teria de confiar no número final.
    expect(await screen.findByRole('columnheader', { name: 'Matemática' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Português' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader', { name: 'Síntese do bimestre' })).toHaveLength(2)

    const linhaDaAna = await linhaDoAluno('Ana')
    // 8×0,5 + 10×0,2 + 6×0,3 = 7,8 e a dissertação valendo 8,6.
    expect(within(linhaDaAna).getByText('7.80')).toBeInTheDocument()
    expect(within(linhaDaAna).getByText('8.60')).toBeInTheDocument()
    // E a média simples das duas: (7,8 + 8,6) / 2 = 8,2.
    expect(within(linhaDaAna).getByText('8.20')).toBeInTheDocument()
  })

  it('trata aluno sem lançamento como 0, e mostra a linha dele mesmo assim', async () => {
    server.use(...comCenario([MATEMATICA, PORTUGUES], NOTAS_DA_ANA))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={ALUNOS}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    // A Bia não tem nota em componente nenhum. A prévia não a esconde nem põe
    // "—" no lugar: a API grava 0 para quem não tem lançamento.
    const linhaDaBia = await linhaDoAluno('Bia')
    expect(within(linhaDaBia).getAllByText('0.00')).toHaveLength(3)
  })

  it('conta a matéria sem componente na média e avisa qual ela é', async () => {
    server.use(...comCenario([MATEMATICA, PORTUGUES, GEOGRAFIA], NOTAS_DA_ANA))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={ALUNOS}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    // A Geografia ainda não tem componente: entra como 0 e divide a média com as
    // outras duas, o que é como o encerramento monta a conta. Sem o aviso, a
    // queda da média pareceria reprovação numa matéria que nem existe.
    expect(
      await screen.findByText(
        'Geografia ainda não tem componente de pontuação neste bimestre e vale 0 na média, até você configurar os pesos.',
      ),
    ).toBeInTheDocument()

    // (7,8 + 8,6 + 0) / 3 = 5,4666… → 5,47
    expect(within(await linhaDoAluno('Ana')).getByText('5.47')).toBeInTheDocument()
  })

  it('avisa que é prévia, e não a nota que o encerramento vai gravar', async () => {
    server.use(...comCenario([MATEMATICA], NOTAS_DA_ANA))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={ALUNOS}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    // O aviso é o primeiro elemento do painel, não um rodapé: a diferença entre
    // "esta é a nota" e "esta é a nota por enquanto" precisa entrar antes do
    // número, e não depois que o professor já leu o número.
    expect(await screen.findByText(AVISO_DE_PREVIA)).toBeInTheDocument()
    expect(
      screen.getByText(/A síntese oficial é gravada pela API no encerramento do bimestre\./),
    ).toBeInTheDocument()
  })

  it('média dos integrantes do grupo, e "—" no grupo que não tem ninguém', async () => {
    server.use(...comCenario([MATEMATICA, PORTUGUES], NOTAS_DA_ANA))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={ALUNOS}
        grupos={[grupoDoBimestre('g1', 'Turma da Ana', [ANA, BIA]), grupoDoBimestre('g2', 'Vazio')]}
        modelo={MODELO_NUMERICO}
      />,
    )

    // (8,2 + 0) / 2 = 4,1 — a média das sínteses bimestrais, e não a soma delas.
    const linhaDoGrupo = await screen.findByRole('row', { name: /Turma da Ana/ })
    expect(within(linhaDoGrupo).getByText('4.10')).toBeInTheDocument()
    expect(within(linhaDoGrupo).getByText('2 integrantes')).toBeInTheDocument()

    // O grupo sem integrante não recebe 0: o encerramento devolve ele em
    // `gruposSemIntegrantes` e não grava síntese, então 0 seria um número que
    // nunca vai existir.
    const linhaDoVazio = screen.getByRole('row', { name: /Vazio/ })
    expect(within(linhaDoVazio).getByText('0 integrantes')).toBeInTheDocument()
    expect(within(linhaDoVazio).getByText('—')).toBeInTheDocument()
  })

  it('ordena os alunos por nome, como o encerramento os percorre', async () => {
    server.use(...comCenario([MATEMATICA]))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={[BIA, ANA]}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    await linhaDoAluno('Ana')
    expect(screen.getAllByRole('row').map((linha) => linha.textContent)).toEqual([
      expect.stringContaining('Aluno'),
      expect.stringContaining('Ana'),
      expect.stringContaining('Bia'),
      expect.stringContaining('Grupo'),
    ])
  })

  /*
   * Bimestre encerrado, quem manda no número é a síntese que a API gravou, e a
   * Etapa 06 deixa recalcular isso fora de escopo. Recalcular aqui mostraria um
   * segundo valor para a mesma coisa, sem meio de saber qual é o bom.
   */
  it('não calcula com o bimestre encerrado, e diz por quê', async () => {
    server.use(...comCenario([MATEMATICA, PORTUGUES], NOTAS_DA_ANA))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste(SITUACAO_BIMESTRE.ENCERRADO)}
        alunos={ALUNOS}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    expect(
      await screen.findByText(/O 1º Bimestre está encerrado, e a síntese dele já foi gravada pela API\./),
    ).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Matemática' })).not.toBeInTheDocument()
    expect(screen.queryByText('8.20')).not.toBeInTheDocument()
  })

  it('manda configurar os componentes quando o bimestre ainda não tem nenhum', async () => {
    // A API devolve uma entrada por componente curricular do lecionamento, e
    // lista vazia é o lecionamento sem matéria nenhuma.
    server.use(...comCenario([]))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={ALUNOS}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    expect(
      await screen.findByText(/Este bimestre ainda não tem componente de pontuação\./),
    ).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Síntese do bimestre' })).not.toBeInTheDocument()
  })

  it('avisa que não há aluno matriculado para calcular', async () => {
    server.use(...comCenario([MATEMATICA, PORTUGUES], NOTAS_DA_ANA))

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={[]}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    expect(
      await screen.findByText(/Nenhum aluno matriculado nesta sala ainda, então não há o que calcular\./),
    ).toBeInTheDocument()
  })

  it('mostra o erro de quem falha ao buscar as notas, sem esconder a tabela', async () => {
    server.use(
      http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
        HttpResponse.json(componentesDoBimestre(String(params.id), [MATEMATICA])),
      ),
      http.get(`${API}/componentes-pontuacao/:id/lancamentos`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falha ao listar.' }, { status: 500 }),
      ),
    )

    renderComSessao(
      <PreviaDaSintese
        bimestre={bimestreDoTeste()}
        alunos={ALUNOS}
        grupos={[]}
        modelo={MODELO_NUMERICO}
      />,
    )

    expect(await screen.findByText('Falha ao listar.')).toBeInTheDocument()
    // Com o aviso, o professor sabe que os 0,00 da tela são falta de dado, e
    // não reprovação: a tabela continua no lugar, vazia de notas.
    expect(within(await linhaDoAluno('Ana')).getAllByText('0.00')).toHaveLength(2)
  })
})
