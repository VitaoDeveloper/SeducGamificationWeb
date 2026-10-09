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
  escolasVinculadas,
  lecionamento,
  sala,
} from '../../test/handlers'
import { SalaDetailPage } from './SalaDetailPage'
import { SalasListPage } from './SalasListPage'

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

/**
 * Cópia do lecionamento do professor com componentes próprios.
 *
 * Os testes que mutam a lista (renomear, excluir) mexem nessa cópia e não no
 * `MEU_LECIONAMENTO` do módulo, que outros testes continuam esperando intacto
 * com "Programação Web".
 */
function lecionamentoNovo() {
  return {
    ...MEU_LECIONAMENTO,
    componentesCurriculares: MEU_LECIONAMENTO.componentesCurriculares.map((componente) => ({
      ...componente,
    })),
  }
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

  it('edita a sala em um formulário pré-preenchido e reflete o novo nome', async () => {
    const pessoa = userEvent.setup()
    let corpoEnviado: unknown
    const lista = [SALA]

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json(lista)),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
      http.patch(`${API}/salas/:salaId`, async ({ request }) => {
        corpoEnviado = await request.json()
        const atualizada = sala({ ...SALA, nome: '3º DS' })
        lista[0] = atualizada
        return HttpResponse.json(atualizada)
      }),
    )
    abrirSessao()

    renderizarDetalhe()
    await pessoa.click(await screen.findByRole('button', { name: /^editar$/i }))

    // O formulário abre com o que a sala já tem, e sem a escolha de escola.
    expect(screen.getByRole('heading', { name: 'Editar sala' })).toBeInTheDocument()
    expect(screen.getByLabelText(/nome da sala/i)).toHaveValue('2º DS')
    expect(screen.getByLabelText(/ano letivo/i)).toHaveValue(2026)
    expect(screen.getByLabelText(/^escola/i)).toBeDisabled()

    await pessoa.clear(screen.getByLabelText(/nome da sala/i))
    await pessoa.type(screen.getByLabelText(/nome da sala/i), '3º DS')
    await pessoa.click(screen.getByRole('button', { name: /salvar alterações/i }))

    // O cabeçalho passa a mostrar o nome novo, e o formulário some.
    expect(await screen.findByRole('heading', { name: '3º DS' })).toBeInTheDocument()
    expect(corpoEnviado).toEqual({ nome: '3º DS', anoLetivo: 2026 })
    expect(screen.queryByLabelText(/nome da sala/i)).not.toBeInTheDocument()
  })

  it('exclui a sala vazia depois da confirmação e volta para a listagem', async () => {
    const pessoa = userEvent.setup()
    const lista = [SALA]

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json(lista)),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
      http.delete(`${API}/salas/:salaId`, () => {
        lista.length = 0
        return new HttpResponse(null, { status: 204 })
      }),
      escolasVinculadas(),
    )
    abrirSessao()

    renderComSessao(
      <Routes>
        <Route path="/salas/:salaId" element={<SalaDetailPage />} />
        <Route path="/salas" element={<SalasListPage />} />
      </Routes>,
      `/salas/${SALA.id}`,
    )

    await pessoa.click(await screen.findByRole('button', { name: /excluir sala/i }))
    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir sala/i }))

    // A navegação remonta a listagem, que relê `GET /salas` já sem a sala.
    expect(await screen.findByText('Nenhuma sala por aqui')).toBeInTheDocument()
  })

  it('mostra a mensagem exata da API quando a sala tem dependentes, sem quebrar', async () => {
    const pessoa = userEvent.setup()
    const mensagem =
      'Não é possível excluir a sala: há alunos matriculados ou professores inscritos.'

    server.use(
      ...detalheCom([]),
      http.delete(`${API}/salas/:salaId`, () =>
        HttpResponse.json(
          { statusCode: 409, message: mensagem, error: 'Conflict' },
          { status: 409 },
        ),
      ),
    )
    abrirSessao()

    renderizarDetalhe()
    await pessoa.click(await screen.findByRole('button', { name: /excluir sala/i }))
    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir sala/i }))

    // A mensagem vem do servidor, que é quem sabe qual bloqueio se aplica.
    expect(await within(dialogo).findByText(mensagem)).toBeInTheDocument()
    // E a tela continua de pé, com a sala no lugar.
    expect(screen.getByRole('heading', { name: '2º DS' })).toBeInTheDocument()
  })

  it('adiciona uma matéria a um lecionamento sem recarregar a página', async () => {
    const pessoa = userEvent.setup()
    // A mutação acontece no handler, como na API: o POST acrescenta o componente
    // e o GET seguinte já devolve a lista com ele.
    let componenteAdicionado: { id: string; lecionamentoId: string; nome: string } | null = null

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () =>
        HttpResponse.json([
          {
            ...MEU_LECIONAMENTO,
            componentesCurriculares: componenteAdicionado
              ? [...MEU_LECIONAMENTO.componentesCurriculares, componenteAdicionado]
              : MEU_LECIONAMENTO.componentesCurriculares,
          },
        ]),
      ),
      http.post(`${API}/lecionamentos/:id/componentes-curriculares`, async ({ params, request }) => {
        const { nome } = (await request.json()) as { nome: string }
        componenteAdicionado = { id: 'c-novo', lecionamentoId: String(params.id), nome }
        return HttpResponse.json(componenteAdicionado, { status: 201 })
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    const botaoAdicionar = await screen.findByRole('button', { name: /adicionar matéria/i })
    await pessoa.click(botaoAdicionar)
    await pessoa.type(screen.getByLabelText(/nome da nova matéria/i), 'Matemática')
    await pessoa.click(screen.getByRole('button', { name: /^adicionar$/i }))

    // O formulário some e a matéria aparece na lista sem F5.
    expect(await screen.findByText('Matemática')).toBeInTheDocument()
    expect(screen.queryByLabelText(/nome da nova matéria/i)).not.toBeInTheDocument()
  })

  it('mostra a mensagem da API ao adicionar uma matéria duplicada, sem fechar o formulário', async () => {
    const pessoa = userEvent.setup()
    const mensagem =
      'Já existe um componente curricular com esse nome neste lecionamento.'

    server.use(
      ...detalheCom([MEU_LECIONAMENTO]),
      http.post(`${API}/lecionamentos/:id/componentes-curriculares`, () =>
        HttpResponse.json(
          { statusCode: 409, message: mensagem, error: 'Conflict' },
          { status: 409 },
        ),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    await pessoa.click(await screen.findByRole('button', { name: /adicionar matéria/i }))
    await pessoa.type(screen.getByLabelText(/nome da nova matéria/i), 'Programação Web')
    await pessoa.click(screen.getByRole('button', { name: /^adicionar$/i }))

    // A mensagem é a da API, e o formulário continua aberto para corrigir.
    expect(await screen.findByText(mensagem)).toBeInTheDocument()
    expect(screen.getByLabelText(/nome da nova matéria/i)).toBeInTheDocument()
  })

  it('renomeia uma matéria e reflete o novo nome na tela', async () => {
    const pessoa = userEvent.setup()
    const lecionamentos = [lecionamentoNovo()]

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json(lecionamentos)),
      http.patch(`${API}/componentes-curriculares/:id`, async ({ params, request }) => {
        const { nome } = (await request.json()) as { nome: string }
        const alvo = lecionamentos[0]?.componentesCurriculares.find(
          (componente) => componente.id === String(params.id),
        )
        if (alvo) alvo.nome = nome
        return HttpResponse.json(alvo)
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    await pessoa.click(await screen.findByRole('button', { name: /editar programação web/i }))
    await pessoa.clear(screen.getByLabelText(/nome da matéria/i))
    await pessoa.type(screen.getByLabelText(/nome da matéria/i), 'Programação Web II')
    await pessoa.click(screen.getByRole('button', { name: /^salvar$/i }))

    // O badge troca de nome, sem recarregar a página.
    expect(await screen.findByText('Programação Web II')).toBeInTheDocument()
    expect(screen.queryByText('Programação Web')).not.toBeInTheDocument()
  })

  it('exclui uma matéria sem pontuação depois da confirmação', async () => {
    const pessoa = userEvent.setup()
    const lecionamentos = [lecionamentoNovo()]

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json(lecionamentos)),
      http.delete(`${API}/componentes-curriculares/:id`, ({ params }) => {
        const alvo = lecionamentos[0]
        if (alvo) {
          alvo.componentesCurriculares = alvo.componentesCurriculares.filter(
            (componente) => componente.id !== String(params.id),
          )
        }
        return new HttpResponse(null, { status: 204 })
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    await pessoa.click(await screen.findByRole('button', { name: /excluir programação web/i }))
    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir matéria/i }))

    const tabela = await screen.findByRole('table')
    expect(await within(tabela).findByText('Banco de Dados')).toBeInTheDocument()
    expect(within(tabela).queryByText('Programação Web')).not.toBeInTheDocument()
  })

  it('mostra a mensagem da API ao excluir matéria com pontuação, sem removê-la', async () => {
    const pessoa = userEvent.setup()
    const mensagem =
      'Componente curricular já possui pontuação lançada e não pode ser excluído.'

    server.use(
      ...detalheCom([MEU_LECIONAMENTO]),
      http.delete(`${API}/componentes-curriculares/:id`, () =>
        HttpResponse.json(
          { statusCode: 409, message: mensagem, error: 'Conflict' },
          { status: 409 },
        ),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    await pessoa.click(await screen.findByRole('button', { name: /excluir programação web/i }))
    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir matéria/i }))

    // A mensagem vem da API e a matéria continua na lista.
    expect(await within(dialogo).findByText(mensagem)).toBeInTheDocument()
    expect(
      within(screen.getByRole('table')).getByText('Programação Web'),
    ).toBeInTheDocument()
  })

  it('desinscreve-se de uma sala sem competições e o lecionamento some da lista', async () => {
    const pessoa = userEvent.setup()
    const lista = [MEU_LECIONAMENTO]

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json(lista)),
      http.delete(`${API}/lecionamentos/:id`, () => {
        lista.length = 0
        return new HttpResponse(null, { status: 204 })
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    await pessoa.click(await screen.findByRole('button', { name: /sair desta sala/i }))
    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /sair desta sala/i }))

    // Sem lecionamento, a tela volta ao caso "ainda não leciona".
    expect(await screen.findByText('Ainda não leciona nesta sala')).toBeInTheDocument()
    expect(screen.getByText('Nenhum professor inscrito nesta sala ainda.')).toBeInTheDocument()
  })

  it('mostra a mensagem da API ao tentar sair da sala com competições', async () => {
    const pessoa = userEvent.setup()
    const mensagem = 'Lecionamento possui competições vinculadas e não pode ser desinscrito.'

    server.use(
      ...detalheCom([MEU_LECIONAMENTO]),
      http.delete(`${API}/lecionamentos/:id`, () =>
        HttpResponse.json(
          { statusCode: 409, message: mensagem, error: 'Conflict' },
          { status: 409 },
        ),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    await pessoa.click(await screen.findByRole('button', { name: /sair desta sala/i }))
    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /sair desta sala/i }))

    // A mensagem vem da API e o professor continua inscrito.
    expect(await within(dialogo).findByText(mensagem)).toBeInTheDocument()
    expect(screen.getByText('Você leciona aqui')).toBeInTheDocument()
  })
})
