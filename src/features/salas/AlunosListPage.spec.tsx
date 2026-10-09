import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { gravarSessao, TIPO_USUARIO } from '../../lib/sessao'
import { API, ESCOLA_A, PROFESSOR_DE_TESTE, TOKEN_DE_TESTE, aluno, sala } from '../../test/handlers'
import { AlunosListPage } from './AlunosListPage'

const SALA = sala({ id: 'sala-1', nome: '2º DS', anoLetivo: 2026, escola: ESCOLA_A })

const MARIA = aluno({ id: 'aluno-1', nome: 'Maria da Silva', codigoMatricula: '26001' })
const JOAO = aluno({ id: 'aluno-2', nome: 'João Pereira', codigoMatricula: '26002' })

function abrirSessao() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: {
      id: PROFESSOR_DE_TESTE,
      tipo: TIPO_USUARIO.PROFESSOR,
      codigoMatricula: '26000',
    },
  })
}

function renderizarAlunos() {
  return renderComSessao(
    <Routes>
      <Route path="/salas/:salaId/alunos" element={<AlunosListPage />} />
    </Routes>,
    `/salas/${SALA.id}/alunos`,
  )
}

/** Salas, lecionamentos (exigidos por `useSala`) e a lista de alunos. */
function paginaCom(alunos: ReturnType<typeof aluno>[]) {
  return [
    http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
    http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
    http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(alunos)),
  ]
}

describe('AlunosListPage', () => {
  it('lista os alunos com nome e código de matrícula, no contexto da sala', async () => {
    server.use(...paginaCom([MARIA, JOAO]))
    abrirSessao()

    renderizarAlunos()

    expect(await screen.findByRole('heading', { name: 'Alunos' })).toBeInTheDocument()
    expect(screen.getByText(`${SALA.nome} · ${ESCOLA_A.nome}`)).toBeInTheDocument()

    const tabela = screen.getByRole('table')
    expect(within(tabela).getByText('Maria da Silva')).toBeInTheDocument()
    expect(within(tabela).getByText('#26001')).toBeInTheDocument()
    expect(within(tabela).getByText('João Pereira')).toBeInTheDocument()
    expect(within(tabela).getByText('#26002')).toBeInTheDocument()

    // A tela não repete a senha em coluna; a regra vem uma vez, em nota.
    expect(within(tabela).queryByText(/senha/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/a senha inicial de cada aluno é o próprio código de matrícula/i),
    ).toBeInTheDocument()
  })

  it('mostra o estado vazio com o atalho para o primeiro cadastro', async () => {
    server.use(...paginaCom([]))
    abrirSessao()

    renderizarAlunos()

    expect(
      await screen.findByText(/nenhum aluno nesta sala ainda/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cadastrar o primeiro aluno/i })).toBeInTheDocument()
  })

  it('mostra o estado de carregamento e o estado vazio', async () => {
    let liberar: (() => void) | undefined
    const espera = new Promise<void>((resolve) => {
      liberar = resolve
    })

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
      http.get(`${API}/salas/:salaId/alunos`, async () => {
        await espera
        return HttpResponse.json([])
      }),
    )
    abrirSessao()

    renderizarAlunos()

    // Carregando: o cabeçalho da tabela já está na tela e as linhas são
    // esqueleto, para a página não pular de altura quando os dados chegarem.
    expect(await screen.findByText('Carregando…')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(4)
    expect(screen.queryByText(/nenhum aluno nesta sala ainda/i)).not.toBeInTheDocument()

    liberar?.()

    expect(await screen.findByText(/nenhum aluno nesta sala ainda/i)).toBeInTheDocument()
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument()
    // O esqueleto some com a carga: três linhas de pulso que sobrassem na
    // tela fariam a lista vazia parecer ter alunos.
    expect(screen.getAllByRole('row')).toHaveLength(1)
  })

  it('avisa a falha da sala sem esconder a lista de alunos', async () => {
    let tentativas = 0

    server.use(
      http.get(`${API}/salas`, () => {
        tentativas += 1
        return HttpResponse.json(
          { statusCode: 500, message: 'Erro interno do servidor.' },
          { status: 500 },
        )
      }),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
      http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json([MARIA])),
    )
    abrirSessao()

    renderizarAlunos()

    // A lista de alunos vem de outra chamada e continua utilizável; o que não
    // pode acontecer é a tela ficar presa em "Carregando a sala…" sem erro e
    // sem botão de nova tentativa.
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.')
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
    expect(screen.queryByText('Carregando a sala…')).not.toBeInTheDocument()
    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: /tentar de novo/i }))
    await waitFor(() => expect(tentativas).toBeGreaterThan(1))
  })

  it('avisa e permite tentar de novo quando a lista de alunos falha', async () => {
    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
      http.get(`${API}/salas/:salaId/alunos`, () =>
        HttpResponse.json(
          { statusCode: 500, message: 'Erro interno do servidor.' },
          { status: 500 },
        ),
      ),
    )
    abrirSessao()

    renderizarAlunos()

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.')
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })

  it('cadastra o aluno, mostra o código no modal e repõe a lista', async () => {
    const pessoa = userEvent.setup()
    let criados: unknown
    const lista = [MARIA]

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
      http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(lista)),
      http.post(`${API}/salas/:salaId/alunos`, async ({ request }) => {
        criados = await request.json()
        lista.push(JOAO)
        return HttpResponse.json(JOAO, { status: 201 })
      }),
    )
    abrirSessao()

    renderizarAlunos()
    await pessoa.click(await screen.findByRole('button', { name: /novo aluno/i }))

    await pessoa.type(screen.getByLabelText(/nome do aluno/i), 'João Pereira')
    await pessoa.click(screen.getByRole('button', { name: /cadastrar aluno/i }))

    // O modal é a única cópia do código que o professor vai ter: precisa abrir
    // sozinho, com o código em destaque e a regra da senha escrita.
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByRole('heading', { name: 'Aluno cadastrado' })).toBeInTheDocument()
    expect(within(dialogo).getByText('#26002')).toBeInTheDocument()
    expect(within(dialogo).getByText(/senha inicial é este mesmo código/i)).toBeInTheDocument()

    // E a lista por baixo já tem o aluno novo, sem recarregar a página.
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getByText('João Pereira')).toBeInTheDocument(),
    )
    expect(criados).toEqual({ nome: 'João Pereira' })
  })

  it('cadastra vários alunos em sequência sem recarregar a página', async () => {
    const pessoa = userEvent.setup()
    const lista: ReturnType<typeof aluno>[] = []
    let indice = 0

    server.use(
      http.get(`${API}/salas`, () => HttpResponse.json([SALA])),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
      http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(lista)),
      http.post(`${API}/salas/:salaId/alunos`, async ({ request }) => {
        const { nome } = (await request.json()) as { nome: string }
        indice += 1
        const novo = aluno({
          id: `aluno-${indice}`,
          nome,
          codigoMatricula: `2600${indice}`,
        })
        lista.push(novo)
        return HttpResponse.json(novo, { status: 201 })
      }),
    )
    abrirSessao()

    renderizarAlunos()
    await pessoa.click(await screen.findByRole('button', { name: /novo aluno/i }))

    // Primeiro aluno: o formulário continua aberto e limpo depois do cadastro,
    // que é o que torna cadastrar uma turma inteira suportável.
    await pessoa.type(screen.getByLabelText(/nome do aluno/i), 'Maria da Silva')
    await pessoa.click(screen.getByRole('button', { name: /cadastrar aluno/i }))

    let dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('#26001')).toBeInTheDocument()
    await pessoa.click(within(dialogo).getAllByRole('button', { name: 'Fechar' })[0] as HTMLElement)

    // Segundo aluno, na mesma tela, sem recarregar.
    expect(screen.getByLabelText(/nome do aluno/i)).toHaveValue('')
    await pessoa.type(screen.getByLabelText(/nome do aluno/i), 'João Pereira')
    await pessoa.click(screen.getByRole('button', { name: /cadastrar aluno/i }))

    dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('#26002')).toBeInTheDocument()
    await pessoa.click(within(dialogo).getAllByRole('button', { name: 'Fechar' })[0] as HTMLElement)

    const tabela = screen.getByRole('table')
    expect(within(tabela).getByText('Maria da Silva')).toBeInTheDocument()
    expect(within(tabela).getByText('João Pereira')).toBeInTheDocument()
  })

  it('exige o nome do aluno antes de chamar a API', async () => {
    const pessoa = userEvent.setup()
    let chamouOCadastro = false

    server.use(
      ...paginaCom([]),
      http.post(`${API}/salas/:salaId/alunos`, () => {
        chamouOCadastro = true
        return HttpResponse.json(JOAO, { status: 201 })
      }),
    )
    abrirSessao()

    renderizarAlunos()
    await pessoa.click(await screen.findByRole('button', { name: /cadastrar o primeiro aluno/i }))
    await pessoa.click(screen.getByRole('button', { name: /cadastrar aluno/i }))

    expect(await screen.findByText('Informe o nome do aluno.')).toBeInTheDocument()
    expect(chamouOCadastro).toBe(false)
  })

  it('edita o nome do aluno em um modal e reflete na listagem', async () => {
    const pessoa = userEvent.setup()
    const lista = [MARIA]

    server.use(
      ...paginaCom(lista),
      http.patch(`${API}/alunos/:id`, async ({ request }) => {
        const { nome } = (await request.json()) as { nome: string }
        lista[0] = { ...lista[0]!, nome }
        return HttpResponse.json(lista[0])
      }),
    )
    abrirSessao()

    renderizarAlunos()
    await pessoa.click(await screen.findByRole('button', { name: /editar maria da silva/i }))

    // O modal só permite o nome: o código aparece visível, mas travado.
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByLabelText(/nome do aluno/i)).toHaveValue('Maria da Silva')
    expect(within(dialogo).getByLabelText(/código de matrícula/i)).toHaveValue('#26001')

    await pessoa.clear(within(dialogo).getByLabelText(/nome do aluno/i))
    await pessoa.type(within(dialogo).getByLabelText(/nome do aluno/i), 'Maria Souza')
    await pessoa.click(within(dialogo).getByRole('button', { name: /salvar alterações/i }))

    const tabela = screen.getByRole('table')
    expect(await within(tabela).findByText('Maria Souza')).toBeInTheDocument()
    expect(within(tabela).queryByText('Maria da Silva')).not.toBeInTheDocument()
    // O código não muda junto com o nome.
    expect(within(tabela).getByText('#26001')).toBeInTheDocument()
  })

  it('exclui o aluno sem histórico e o tira da listagem', async () => {
    const pessoa = userEvent.setup()
    const lista = [MARIA, JOAO]

    server.use(
      ...paginaCom(lista),
      http.delete(`${API}/alunos/:id`, ({ params }) => {
        const indice = lista.findIndex((aluno) => aluno.id === params.id)
        if (indice >= 0) lista.splice(indice, 1)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    abrirSessao()

    renderizarAlunos()
    await pessoa.click(await screen.findByRole('button', { name: /excluir joão pereira/i }))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByRole('heading', { name: 'Excluir aluno' })).toBeInTheDocument()
    expect(within(dialogo).getByText(/deseja excluir joão pereira da sala/i)).toBeInTheDocument()

    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir aluno/i }))

    const tabela = screen.getByRole('table')
    expect(await within(tabela).findByText('Maria da Silva')).toBeInTheDocument()
    expect(within(tabela).queryByText('João Pereira')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('avisa, sem sair da tela, quando o aluno tem histórico e não pode ser excluído', async () => {
    const pessoa = userEvent.setup()
    const mensagem = 'Aluno já possui lançamentos registrados e não pode ser excluído.'

    server.use(
      ...paginaCom([MARIA]),
      http.delete(`${API}/alunos/:id`, () =>
        HttpResponse.json({ statusCode: 409, message: mensagem }, { status: 409 }),
      ),
    )
    abrirSessao()

    renderizarAlunos()
    await pessoa.click(await screen.findByRole('button', { name: /excluir maria da silva/i }))

    // A mensagem é a da API, mostrada dentro do próprio modal.
    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir aluno/i }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(mensagem)
    // O aluno continua listado: nada foi removido.
    expect(screen.getByText('Maria da Silva')).toBeInTheDocument()
    // Cancelar segue abrindo, porque o erro não trava o modal.
    await pessoa.click(within(dialogo).getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
