import { screen, within } from '@testing-library/react'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { gravarSessao, TIPO_USUARIO } from '../../lib/sessao'
import {
  TOKEN_DE_TESTE,
  linhaDeAluno,
  linhaDeGrupo,
  rankingDeGrupo,
  rankingIndividual,
  rankingIndividualDaCompeticao,
  rankingsDaCompeticao,
  rankingsRecusados,
} from '../../test/handlers'
import { MENSAGEM_DE_ACESSO_FORA_DO_ESCOPO } from '../rankings'
import { TIPO_RANKING } from '../rankings/rankings.tipos'
import { AlunoDashboardPage } from './AlunoDashboardPage'

const COMPETICAO_ID = 'comp-1'
const ALUNO_DA_SESSAO = 'a1'

const BIMESTRE_FECHADO = 'b1'

/** A sessão do aluno: é o `id` dele que marca a linha "Você" no ranking. */
function abrirSessao() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: {
      id: ALUNO_DA_SESSAO,
      tipo: TIPO_USUARIO.ALUNO,
      codigoMatricula: '26010',
    },
  })
}

/** Os três rankings de uma competição, com o aluno da sessão no individual. */
function rankingsCompletos() {
  return [
    rankingsDaCompeticao({
      anual: rankingDeGrupo({
        competicaoId: COMPETICAO_ID,
        itens: [linhaDeGrupo({ grupoId: 'g1', nome: 'Alfa', posicao: 1, valor: 33.1 })],
      }),
      parcial: rankingDeGrupo({
        competicaoId: COMPETICAO_ID,
        tipo: TIPO_RANKING.PARCIAL,
        bimestreId: BIMESTRE_FECHADO,
        itens: [linhaDeGrupo({ grupoId: 'g1', nome: 'Alfa', posicao: 1, valor: 8.4 })],
      }),
    }),
    rankingIndividualDaCompeticao(
      rankingIndividual({
        competicaoId: COMPETICAO_ID,
        itens: [
          linhaDeAluno({ alunoId: ALUNO_DA_SESSAO, nome: 'Ana', posicao: 1, valor: 9 }),
          linhaDeAluno({ alunoId: 'a2', nome: 'Bia', posicao: 2, valor: 7 }),
        ],
      }),
    ),
  ]
}

function renderizar(rota: string) {
  return renderComSessao(<AlunoDashboardPage />, rota)
}

describe('AlunoDashboardPage', () => {
  it('abre o ranking do próprio grupo e destaca o aluno, sem navegação', async () => {
    server.use(...rankingsCompletos())
    abrirSessao()

    renderizar(`/aluno?competicaoId=${COMPETICAO_ID}&bimestreId=${BIMESTRE_FECHADO}`)

    // As três seções chegam sozinhas a partir da competição que veio no link.
    expect(await screen.findByRole('heading', { name: 'Minha posição' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ranking das equipes — ano' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ranking das equipes — bimestre' }),
    ).toBeInTheDocument()

    // A linha do aluno logado é a única marcada: o ranking responde sem ele
    // procurar o próprio nome na lista.
    const ana = await screen.findByRole('row', { name: /Ana/ })
    expect(within(ana).getByText('Você')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Bia/ })).queryByText('Você')).not.toBeInTheDocument()
  })

  it('avisa que o ranking anual ainda é parcial', async () => {
    server.use(
      rankingsDaCompeticao({
        anual: rankingDeGrupo({
          competicaoId: COMPETICAO_ID,
          bimestresEncerrados: 2,
          itens: [linhaDeGrupo({ grupoId: 'g1', nome: 'Alfa', posicao: 1, valor: 16.4 })],
        }),
      }),
      rankingIndividualDaCompeticao(
        rankingIndividual({
          competicaoId: COMPETICAO_ID,
          itens: [linhaDeAluno({ alunoId: ALUNO_DA_SESSAO, nome: 'Ana', posicao: 1, valor: 9 })],
        }),
      ),
    )
    abrirSessao()

    renderizar(`/aluno?competicaoId=${COMPETICAO_ID}`)

    expect(
      await screen.findByText('Resultado parcial — 2 de 4 bimestres encerrados. As posições acima ainda podem mudar.'),
    ).toBeInTheDocument()
  })

  it('não mostra a seção do bimestre quando o link não trouxe um', async () => {
    // Sem `bimestreId`, o parcial não pode nem ser buscado: a ausência da
    // requisição é o que o `onUnhandledRequest: 'error'` do msw confirma.
    server.use(
      rankingsDaCompeticao({
        anual: rankingDeGrupo({ competicaoId: COMPETICAO_ID, itens: [] }),
      }),
      rankingIndividualDaCompeticao(rankingIndividual({ competicaoId: COMPETICAO_ID, itens: [] })),
    )
    abrirSessao()

    renderizar(`/aluno?competicaoId=${COMPETICAO_ID}`)

    await screen.findByRole('heading', { name: 'Ranking das equipes — ano' })
    expect(
      screen.queryByRole('heading', { name: 'Ranking das equipes — bimestre' }),
    ).not.toBeInTheDocument()
  })

  it('trata o 403 de acesso fora do escopo com mensagem amigável, sem quebrar', async () => {
    server.use(...rankingsRecusados())
    abrirSessao()

    renderizar(`/aluno?competicaoId=${COMPETICAO_ID}&bimestreId=${BIMESTRE_FECHADO}`)

    expect(await screen.findByText(MENSAGEM_DE_ACESSO_FORA_DO_ESCOPO)).toBeInTheDocument()
    // A página continua de pé: o cabeçalho e as seções seguem para nova tentativa.
    expect(screen.getByRole('heading', { name: 'Meus resultados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('oferece os dois relatórios do aluno, sempre os dele', async () => {
    server.use(...rankingsCompletos())
    abrirSessao()

    renderizar(`/aluno?competicaoId=${COMPETICAO_ID}&bimestreId=${BIMESTRE_FECHADO}`)

    const cartao = (await screen.findByRole('heading', { name: 'Meus relatórios' })).closest(
      'div',
    ) as HTMLElement

    /*
     * O `alunoId` do link é o da sessão. Se viesse da URL, o dashboard viraria um
     * gerador de link para o relatório de qualquer pessoa: a API recusaria com
     * `403`, mas a tela já teria oferecido o caminho.
     */
    expect(within(cartao).getByRole('link', { name: 'Meu relatório individual' })).toHaveAttribute(
      'href',
      `/alunos/${ALUNO_DA_SESSAO}/relatorio-individual?competicaoId=${COMPETICAO_ID}`,
    )
    expect(
      within(cartao).getByRole('link', { name: 'Meu relatório comparado ao grupo' }),
    ).toHaveAttribute(
      'href',
      `/alunos/${ALUNO_DA_SESSAO}/relatorio-comparativo-grupo?competicaoId=${COMPETICAO_ID}`,
    )

    // Os relatórios de grupo não aparecem: são endereçados por `grupoId`, e a API
    // não diz ao aluno a que grupo ele pertence.
    expect(within(cartao).queryByRole('link', { name: /Do grupo/ })).not.toBeInTheDocument()
    expect(within(cartao).getAllByRole('link')).toHaveLength(2)
  })

  it('orienta a abrir pelo link quando a URL não traz a competição', async () => {
    abrirSessao()

    renderizar('/aluno')

    expect(await screen.findByText('Nenhuma competição informada.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Minha posição' })).not.toBeInTheDocument()
  })
})
