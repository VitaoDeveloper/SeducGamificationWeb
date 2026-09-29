import { screen } from '@testing-library/react'
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
  grupo,
  lecionamento,
  membro,
  sala,
  salasDoProfessor,
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
})
