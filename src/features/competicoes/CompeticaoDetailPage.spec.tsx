import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { gravarSessao, TIPO_USUARIO } from '../../lib/sessao'
import {
  API,
  ESCOLA_A,
  PROFESSOR_DE_TESTE,
  TOKEN_DE_TESTE,
  aluno,
  bimestre,
  competicao,
  componentesDoBimestre as componentesDoBimestreResposta,
  grupo,
  lecionamento,
  listagemDeLancamentos,
  materiaFechada,
  membro,
  sala,
  salasDoProfessor,
  validacaoDePesos,
} from '../../test/handlers'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import { CompeticaoDetailPage } from './CompeticaoDetailPage'
import { ROTA_COMPETICAO_DETALHE, rotaDaCompeticao } from './rotas'

const SALA = sala({ id: 'sala-1', nome: '2º DS', escola: ESCOLA_A })

const LECIONAMENTO = lecionamento({ id: 'lec-1', salaId: SALA.id })

const ALUNOS = [
  aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' }),
  aluno({ id: 'a2', nome: 'Bia', codigoMatricula: '26011' }),
]

const BIMESTRES = [
  bimestre({ id: 'b1', competicaoId: 'comp-1', numero: 1, situacao: SITUACAO_BIMESTRE.ABERTO }),
  bimestre({ id: 'b2', competicaoId: 'comp-1', numero: 2, situacao: SITUACAO_BIMESTRE.ENCERRADO }),
  bimestre({ id: 'b3', competicaoId: 'comp-1', numero: 3, situacao: SITUACAO_BIMESTRE.ENCERRADO }),
  bimestre({ id: 'b4', competicaoId: 'comp-1', numero: 4, situacao: SITUACAO_BIMESTRE.ENCERRADO }),
]

const COMPETICAO = competicao({
  id: 'comp-1',
  nome: 'Copa do Conhecimento',
  lecionamentoId: LECIONAMENTO.id,
})

/** Uma matéria fechada em 100%, para as abas de componentes e lançamentos. */
const MATEMATICA_FECHADA = materiaFechada('mat-1', 'Matemática', ['Prova bimestral', 100])

function abrirSessao() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: {
      id: PROFESSOR_DE_TESTE,
      tipo: TIPO_USUARIO.PROFESSOR,
      codigoMatricula: '26001',
    },
  })
}

/** Grupos diferentes por bimestre: `Alpha` no b1 e `Beta` no b2. */
function grupos() {
  return http.get(`${API}/competicoes/:id/grupos`, ({ request }) => {
    const bimestreId = new URL(request.url).searchParams.get('bimestreId')

    if (bimestreId === 'b2') {
      const beta = grupo({ id: 'g2', nome: 'Beta', competicaoId: COMPETICAO.id })
      return HttpResponse.json({
        bimestreId: 'b2',
        grupos: [{ ...beta, membrosGrupos: [membro('g2', ALUNOS[0]!, 'b2')] }],
      })
    }

    const alpha = grupo({ id: 'g1', nome: 'Alpha', competicaoId: COMPETICAO.id })
    return HttpResponse.json({
      bimestreId: bimestreId ?? 'b1',
      grupos: [{ ...alpha, membrosGrupos: [] }],
    })
  })
}

function cenario() {
  return [
    http.get(`${API}/competicoes/:id`, () =>
      HttpResponse.json({ ...COMPETICAO, bimestres: BIMESTRES }),
    ),
    ...salasDoProfessor([SALA], { [SALA.id]: [LECIONAMENTO] }),
    http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(ALUNOS)),
    grupos(),
  ]
}

function renderizarDetalhe() {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_COMPETICAO_DETALHE} element={<CompeticaoDetailPage />} />
    </Routes>,
    rotaDaCompeticao(COMPETICAO.id),
  )
}

describe('CompeticaoDetailPage', () => {
  it('abre no bimestre aberto e mostra os grupos dele', async () => {
    server.use(...cenario())
    abrirSessao()

    renderizarDetalhe()

    expect(await screen.findByRole('heading', { name: 'Copa do Conhecimento' })).toBeInTheDocument()

    // O b1 é o único aberto: a página abre nele, e não no primeiro por acaso.
    expect(screen.getByLabelText('Bimestre')).toHaveValue('b1')
    expect(screen.getByText('Integrantes no 1º Bimestre')).toBeInTheDocument()
    expect(screen.queryAllByText('Beta')).toHaveLength(0)
    expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0)
  })

  it('mostra a situação de cada bimestre em etiqueta', async () => {
    server.use(...cenario())
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')
    expect(screen.getByText('Aberto')).toBeInTheDocument()
    expect(screen.getAllByText('Encerrado')).toHaveLength(3)
  })

  it('troca a lista de grupos ao trocar o bimestre e trava o encerrado', async () => {
    const pessoa = userEvent.setup()
    server.use(...cenario())
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')

    await pessoa.selectOptions(screen.getByLabelText('Bimestre'), 'b2')

    expect((await screen.findAllByText('Beta')).length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Alpha')).toHaveLength(0)

    // O b2 está encerrado: a composição fica só de leitura.
    expect(screen.getByLabelText('Grupo de Ana')).toBeDisabled()
    expect(
      screen.getByText(/Este bimestre está encerrado\. A composição dos grupos fica só de/),
    ).toBeInTheDocument()
  })

  it('avisa quando a competição não existe e oferece a volta', async () => {
    server.use(
      http.get(`${API}/competicoes/:id`, () =>
        HttpResponse.json({ statusCode: 404, message: 'Competição não encontrada.' }, { status: 404 }),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    expect(await screen.findByText('Competição não encontrada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voltar para as salas/i })).toBeInTheDocument()
  })

  it('navega entre as abas e mantém a de grupos como ponto de partida', async () => {
    const pessoa = userEvent.setup()
    server.use(...cenario(), ...componentesDoBimestre())
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')

    // A tela abre nos grupos, que é de onde a Etapa 04 parou.
    expect(screen.getByRole('tab', { name: 'Grupos' })).toHaveAttribute('aria-selected', 'true')

    await pessoa.click(screen.getByRole('tab', { name: 'Componentes' }))

    expect(screen.getByRole('tab', { name: 'Componentes' })).toHaveAttribute('aria-selected', 'true')
    // A aba de grupos sai da tela junto: nada de manter os componentes atrás de
    // um painel que não está mais visível.
    expect(screen.queryByText('Novo grupo')).not.toBeInTheDocument()
    expect(await screen.findByText('Prova bimestral')).toBeInTheDocument()

    await pessoa.click(screen.getByRole('tab', { name: 'Lançamentos' }))

    expect(screen.queryByText('Prova bimestral')).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Componente de pontuação')).toBeInTheDocument()
  })

  it('deixa a aba de rankings visível e desabilitada, sem virar um botão', async () => {
    server.use(...cenario())
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Alpha')

    const rankings = screen.getByTitle('Chega na Etapa 06')
    expect(rankings).toHaveTextContent('Rankings')
    expect(rankings).toHaveAttribute('aria-disabled', 'true')
    // Não é um `button`, então nem dá para focar por teclado e clicar por engano.
    expect(rankings.tagName).toBe('SPAN')
  })

  it('descarta o componente escolhido ao trocar de bimestre', async () => {
    const pessoa = userEvent.setup()
    server.use(...cenario(), ...componentesDoBimestre())
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Alpha')

    await pessoa.click(screen.getByRole('tab', { name: 'Lançamentos' }))
    await pessoa.selectOptions(await screen.findByLabelText('Componente de pontuação'), 'mat-1-cp1')

    // A escola do cenário não tem modelo exposto pela API, então a tela assume o
    // CPS ETEC e o campo de nota aparece como seletor de conceitos.
    expect((await screen.findAllByLabelText('Conceito de Ana')).length).toBeGreaterThan(0)

    // Leva para o b2, que está encerrado e não tem componente: a escolha do b1
    // não pode sobrar, senão a tela mostraria as notas de uma prova do outro bimestre.
    await pessoa.selectOptions(screen.getByLabelText('Bimestre'), 'b2')

    await waitFor(() => expect(screen.getByLabelText('Componente de pontuação')).toHaveValue(''))
    expect(screen.queryAllByLabelText('Conceito de Ana')).toHaveLength(0)
  })
})

/** Os dois endpoints de componentes que as abas novas consomem. */
function componentesDoBimestre() {
  return [
    http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
      HttpResponse.json(
        componentesDoBimestreResposta(String(params.id), [MATEMATICA_FECHADA]),
      ),
    ),
    http.post(`${API}/bimestres/:id/componentes-pontuacao/validar`, () =>
      HttpResponse.json(validacaoDePesos([MATEMATICA_FECHADA])),
    ),
    ...listagemDeLancamentos([]),
  ]
}
