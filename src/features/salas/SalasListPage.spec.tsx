import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { gravarSessao, TIPO_USUARIO } from '../../lib/sessao'
import { SalasListPage } from './SalasListPage'
import {
  API,
  ESCOLA_A,
  ESCOLA_B,
  PROFESSOR_DE_TESTE,
  TOKEN_DE_TESTE,
  lecionamento,
  sala,
  salasDoProfessor,
} from '../../test/handlers'

/*
 * A listagem é a tela que responde "onde eu leciona?", e a resposta vem de duas
 * chamadas: a lista de salas e, para cada uma, os lecionamentos. Estes testes
 * montam as duas — o msw está com `onUnhandledRequest: 'error'`, então uma
 * requisição sem handler reprova a tela em vez de passar em silêncio.
 */

const SALA_DA_ESCOLA_A = sala({ id: 'sala-1', nome: '2º DS', anoLetivo: 2026, escola: ESCOLA_A })
const SALA_DE_OUTRA_ESCOLA = sala({
  id: 'sala-2',
  nome: '1º Técnico',
  anoLetivo: 2026,
  escola: ESCOLA_B,
  escolaId: ESCOLA_B.id,
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

function renderizarLista() {
  return renderComSessao(<SalasListPage />, '/salas')
}

async function abrirFormularioDeNovaSala(pessoa: UserEvent) {
  await pessoa.click(await screen.findByRole('button', { name: /nova sala/i }))
}

describe('SalasListPage', () => {
  it('agrupa as salas por escola, cada uma com o seu nome como título', async () => {
    server.use(...salasDoProfessor([SALA_DA_ESCOLA_A, SALA_DE_OUTRA_ESCOLA]))
    abrirSessao()

    renderizarLista()

    // O nome da escola aparece duas vezes: como título do grupo e dentro da
    // própria sala. O que separa um do outro é o papel de heading.
    const cabecalhos = await screen.findAllByRole('heading', { name: ESCOLA_A.nome })
    expect(cabecalhos).toHaveLength(1)
    expect(cabecalhos[0]).toHaveClass('uppercase')

    expect(await screen.findByRole('heading', { name: ESCOLA_B.nome })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2º DS' })).toHaveAttribute('href', '/salas/sala-1')
    expect(screen.getByRole('link', { name: '1º Técnico' })).toHaveAttribute('href', '/salas/sala-2')
  })

  it('marca a sala em que o professor leciona e a que está disponível para inscrição', async () => {
    const inscrita = lecionamento({ id: 'lec-1', salaId: 'sala-1' })
    server.use(
      ...salasDoProfessor([SALA_DA_ESCOLA_A, SALA_DE_OUTRA_ESCOLA], {
        'sala-1': [inscrita],
        'sala-2': [],
      }),
    )
    abrirSessao()

    renderizarLista()

    // Uma linha de "Você leciona aqui" e uma de "Disponível para inscrição":
    // as duas marcas precisam coexistir, senão a tela não distingue o professor
    // que já entrou das turmas que ainda estão abertas para ele.
    expect(await screen.findByText('Você leciona aqui')).toBeInTheDocument()
    expect(screen.getByText('Disponível para inscrição')).toBeInTheDocument()
    expect(screen.getAllByText('Você leciona aqui')).toHaveLength(1)
  })

  it('não marca como "leciona aqui" quando outro professor, e não ele, está inscrito', async () => {
    server.use(
      ...salasDoProfessor([SALA_DA_ESCOLA_A], {
        'sala-1': [
          lecionamento({
            id: 'lec-outro',
            salaId: 'sala-1',
            professorId: 'prof-outro',
            professor: { id: 'prof-outro', nome: 'Outra Professora', codigoMatricula: '26002' },
          }),
        ],
      }),
    )
    abrirSessao()

    renderizarLista()

    // Sala compartilhada: estar inscrito não é a mesma coisa que o professor da
    // sessão estar inscrito. Confundir as duas faria a tela oferecer inscrição
    // para quem já está dentro, e o resultado seria um 409 sem explicação.
    expect(await screen.findByText('Disponível para inscrição')).toBeInTheDocument()
    expect(screen.queryByText('Você leciona aqui')).not.toBeInTheDocument()
  })

  it('mostra o estado de carregamento e o estado vazio', async () => {
    let liberar: (() => void) | undefined
    const espera = new Promise<void>((resolve) => {
      liberar = resolve
    })

    server.use(
      // Sem `...semSalas()`: o msw resolve pela primeira rota que casa, e o
      // handler de `[]` do atalho venceria o que segura a resposta.
      http.get(`${API}/salas`, async () => {
        await espera
        return HttpResponse.json([])
      }),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
    )
    abrirSessao()

    renderizarLista()

    expect(await screen.findByText('Carregando salas…')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma sala por aqui')).not.toBeInTheDocument()

    liberar?.()

    expect(await screen.findByText('Nenhuma sala por aqui')).toBeInTheDocument()
    expect(screen.queryByText('Carregando salas…')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /criar a primeira sala/i })).toBeEnabled())
  })

  it('mantém a sala na tela quando os lecionamentos dela não podem ser lidos', async () => {
    server.use(
      ...salasDoProfessor([SALA_DA_ESCOLA_A]),
      http.get(`${API}/salas/:salaId/lecionamentos`, () =>
        HttpResponse.json({ statusCode: 403, message: 'Sem permissão.' }, { status: 403 }),
      ),
    )
    abrirSessao()

    renderizarLista()

    // A turma continua aparecendo, sem a marca de inscrição. Esconder a sala
    // por causa de uma chamada secundária tiraria da tela o que a pessoa veio
    // buscar.
    expect(await screen.findByRole('link', { name: '2º DS' })).toBeInTheDocument()
    expect(screen.getByText('Disponível para inscrição')).toBeInTheDocument()
  })

  it('avisa e oferece nova tentativa quando a lista de salas falha', async () => {
    server.use(
      http.get(`${API}/salas`, () =>
        HttpResponse.json(
          { statusCode: 500, message: 'Erro interno do servidor.' },
          { status: 500 },
        ),
      ),
    )
    abrirSessao()

    renderizarLista()

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.')
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })

  it('cria a sala, some com o formulário e repõe a sala nova na lista', async () => {
    const pessoa = userEvent.setup()
    let criadas: unknown
    const lista = [SALA_DA_ESCOLA_A]

    server.use(
      // O estado da lista vive aqui para a segunda leitura de `GET /salas` — a
      // que o `recarregar()` dispara — trazer a sala recém-criada. Um handler
      // que sempre devolvesse a mesma lista não provaria a recarga.
      http.get(`${API}/salas`, () => HttpResponse.json(lista)),
      http.get(`${API}/salas/:salaId/lecionamentos`, () => HttpResponse.json([])),
      http.post(`${API}/salas`, async ({ request }) => {
        criadas = await request.json()
        const nova = sala({
          id: 'sala-nova',
          nome: '3º DS',
          anoLetivo: 2026,
          escola: ESCOLA_A,
          escolaId: ESCOLA_A.id,
        })
        lista.push(nova)
        return HttpResponse.json(nova, { status: 201 })
      }),
    )
    abrirSessao()

    renderizarLista()
    await abrirFormularioDeNovaSala(pessoa)

    await pessoa.type(screen.getByLabelText(/nome da sala/i), '3º DS')
    await pessoa.click(screen.getByRole('button', { name: /criar sala/i }))

    // A sala nova entra na lista sem recarregar a página, e o formulário fecha
    // para a tela não ficar com dois blocos de criação abertos.
    expect(await screen.findByRole('link', { name: '3º DS' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/nome da sala/i)).not.toBeInTheDocument()
    expect(criadas).toMatchObject({ nome: '3º DS', anoLetivo: new Date().getFullYear() })
  })
})
