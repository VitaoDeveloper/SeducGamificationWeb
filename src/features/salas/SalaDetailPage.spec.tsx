import { screen, within } from '@testing-library/react'
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
  lecionamento,
  sala,
} from '../../test/handlers'
import { SalaDetailPage } from './SalaDetailPage'

const SALA = sala({ id: 'sala-1', nome: '2º DS', anoLetivo: 2026, escola: ESCOLA_A })

const MEU_LECIONAMENTO = lecionamento({
  id: 'lec-meu',
  salaId: SALA.id,
  componentesCurriculares: [
    { id: 'c-1', lecionamentoId: 'lec-meu', nome: 'Programação Web' },
    { id: 'c-2', lecionamentoId: 'lec-meu', nome: 'Banco de Dados' },
  ],
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

function renderizarDetalhe() {
  return renderComSessao(
    <Routes>
      <Route path="/salas/:salaId" element={<SalaDetailPage />} />
    </Routes>,
    `/salas/${SALA.id}`,
  )
}

/** Lista de salas mais os lecionamentos de uma sala só, com o id já amarrado. */
function detalheCom(lecionamentos: ReturnType<typeof lecionamento>[]) {
  return [
    http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
    http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json(lecionamentos)),
  ]
}

describe('SalaDetailPage', () => {
  it('mostra a sala, a escola e o ano letivo no cabeçalho', async () => {
    server.use(...detalheCom([]))
    abrirSessao()

    renderizarDetalhe()

    expect(await screen.findByRole('heading', { name: '2º DS' })).toBeInTheDocument()
    expect(screen.getByText(`${ESCOLA_A.nome} · ano letivo 2026`)).toBeInTheDocument()
  })

  it('avisa quando a sala não existe e oferece o caminho de volta', async () => {
    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
    )
    abrirSessao()

    renderizarDetalhe()

    expect(await screen.findByText('Sala não encontrada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voltar para as salas/i })).toBeInTheDocument()
  })

  it('oferece a inscrição quando o professor ainda não leciona na sala', async () => {
    server.use(...detalheCom([]))
    abrirSessao()

    renderizarDetalhe()

    expect(await screen.findByText('Ainda não leciona nesta sala')).toBeInTheDocument()
    expect(screen.getByLabelText(/componentes curriculares/i)).toBeInTheDocument()
    expect(screen.queryByText('Você leciona aqui')).not.toBeInTheDocument()
  })

  it('exige ao menos um componente antes de chamar a API', async () => {
    const pessoa = userEvent.setup()
    let chamouAInscricao = false

    server.use(
      ...detalheCom([]),
      http.post(`${API}/salas/:salaId/inscricao`, () => {
        chamouAInscricao = true
        return HttpResponse.json(MEU_LECIONAMENTO, { status: 201 })
      }),
    )
    abrirSessao()

    renderizarDetalhe()
    await pessoa.click(await screen.findByRole('button', { name: /inscrever-se na sala/i }))

    expect(await screen.findByText('Informe ao menos um componente curricular.')).toBeInTheDocument()
    expect(chamouAInscricao).toBe(false)
  })

  it('inscreve, avisa e passa a mostrar que o professor leciona ali', async () => {
    const pessoa = userEvent.setup()
    let corpoEnviado: unknown
    // O estado muda com a inscrição: a resposta que a tela relê já traz o
    // lecionamento novo, como aconteceria de verdade depois do POST.
    let lecionamentos: ReturnType<typeof lecionamento>[] = []

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json(lecionamentos)),
      http.post(`${API}/salas/:salaId/inscricao`, async ({ request }) => {
        corpoEnviado = await request.json()
        lecionamentos = [MEU_LECIONAMENTO]
        return HttpResponse.json(MEU_LECIONAMENTO, { status: 201 })
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    const campo = await screen.findByLabelText(/componentes curriculares/i)
    await pessoa.type(campo, 'Programação Web{Enter}')
    await pessoa.click(screen.getByRole('button', { name: /inscrever-se na sala/i }))

    // A tela troca de caso: some o formulário e aparece o que o professor
    // passou a lecionar, sem recarregar a página.
    expect(await screen.findByText('Você leciona aqui')).toBeInTheDocument()
    expect(screen.queryByText('Ainda não leciona nesta sala')).not.toBeInTheDocument()
    expect(screen.getByText('Programação Web')).toBeInTheDocument()
    expect(corpoEnviado).toEqual({ componentes: ['Programação Web'] })
  })

  it('mostra o que o professor leciona quando já está inscrito', async () => {
    server.use(...detalheCom([MEU_LECIONAMENTO]))
    abrirSessao()

    renderizarDetalhe()

    expect(await screen.findByText('Você leciona aqui')).toBeInTheDocument()
    expect(screen.getByText('Programação Web, Banco de Dados')).toBeInTheDocument()
    expect(screen.getByText('2 componentes')).toBeInTheDocument()
    expect(screen.queryByLabelText(/componentes curriculares/i)).not.toBeInTheDocument()
  })

  it('lista os demais professores da sala, com os componentes de cada um', async () => {
    const deOutro = lecionamento({
      id: 'lec-outro',
      salaId: SALA.id,
      professorId: 'prof-outro',
      professor: { id: 'prof-outro', nome: 'Outra Professora', codigoMatricula: '26002' },
      componentesCurriculares: [
        { id: 'c-outro', lecionamentoId: 'lec-outro', nome: 'História' },
      ],
    })

    server.use(...detalheCom([deOutro]))
    abrirSessao()

    renderizarDetalhe()

    const tabela = await screen.findByRole('table')
    expect(within(tabela).getByText('Outra Professora')).toBeInTheDocument()
    expect(within(tabela).getByText('26002')).toBeInTheDocument()
    expect(within(tabela).getByText('História')).toBeInTheDocument()

    // A sala é compartilhada: ver o outro professor não é estar inscrito nela.
    expect(screen.getByText('Ainda não leciona nesta sala')).toBeInTheDocument()
  })

  it('mantém a sala na tela quando os lecionamentos não podem ser lidos', async () => {
    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () =>
        HttpResponse.json(
          { statusCode: 500, message: 'Erro interno do servidor.' },
          { status: 500 },
        ),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    // A mesma chamada responde duas perguntas na tela — a lista de professores e
    // a marca de inscrição. Perder as duas não pode custar a sala inteira, que é
    // o que a pessoa veio buscar: ela aparece, sem a marca, e o erro fica
    // visível na seção que dependia dele.
    expect(await screen.findByRole('heading', { name: '2º DS' })).toBeInTheDocument()
    expect(screen.getByText(`${ESCOLA_A.nome} · ano letivo 2026`)).toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar a sala.')).not.toBeInTheDocument()

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.')
    expect(screen.getByText('Ainda não leciona nesta sala')).toBeInTheDocument()
  })
})
